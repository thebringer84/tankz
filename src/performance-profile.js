// Opt-in instrumentation: no wrappers, queries, or sampling outside a capture.
const active = new WeakMap(), captures = new WeakSet();
const round = value => Math.round(value * 100) / 100;
const stats = values => {
 if (!values.length) return null;
 const sorted = [...values].sort((a, b) => a - b);
 return {mean: round(values.reduce((a, b) => a + b, 0) / values.length), p95: round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))])};
};

export function profileGame(game, durationMs = 10000) {
 if (captures.has(game)) return Promise.reject(new Error('A performance capture is already running.'));
 if (!Number.isFinite(durationMs) || durationMs < 100 || durationMs > 60000) return Promise.reject(new Error('Capture duration must be 100–60000 ms.'));
 const owned=!active.has(game), session=active.get(game)||startGameProfiler(game), since=performance.now();
 captures.add(game);
 return new Promise(resolve=>setTimeout(()=>{
  if(owned)session.stop();
  captures.delete(game);resolve(session.report(since));
 },durationMs));
}

// A bounded rolling session can also serve timed console captures without nesting queries.
export function startGameProfiler(game, {onFrame=()=>{}, maxFrames=12000}={}) {
 if(active.has(game))throw new Error('A profiler session is already running.');
 const renderer = game.renderer, gl = renderer.getContext();
 const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const debug = gl.getExtension('WEBGL_debug_renderer_info');
 const rendererName=gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
 const metadata = () => ({
  renderer: rendererName,
  width: renderer.domElement.width, height: renderer.domElement.height,
  pixelRatio: renderer.getPixelRatio(), quality: game.presentation.quality,
  gpuTimerSupported: !!timer, lightBudget:game.fx?.lightBudget??8,flashLightsEnabled: game.fx?.flashLightsEnabled ?? true,
  machineGunLightsEnabled: game.fx?.machineGunLightsEnabled ?? false
 });
 const restore = [], frameRestore = [], modes = new Map(), pending = [], history = [];
 let stopped=false, world=game.world;
 let current = null;
 const autoReset = renderer.info.autoReset;
 renderer.info.autoReset = false;
 function wrap(object, key, make, undoList=restore) {
  if (!object || typeof object[key] !== 'function') return;
  const own = Object.hasOwn(object, key), original = object[key], replacement = make(original);
  object[key] = replacement;
  undoList.push(() => {if (object[key] === replacement) {if (own) object[key] = original; else delete object[key];}});
 }
 function record(name, elapsed, calls = 0) {
  if (!current) return;
  const stage = current.stages[name] ??= {ms: 0, invocations: 0, drawCalls: 0};
  stage.ms += elapsed; stage.invocations++; stage.drawCalls += calls;
 }
 function measure(object, key, name, countDraws = false) {
  wrap(object, key, original => function(...args) {
   if (!current) return original.apply(this, args);
   const start = performance.now(), calls = renderer.info.render.calls;
   try {return original.apply(this, args);}
   finally {record(name, performance.now() - start, countDraws ? renderer.info.render.calls - calls : 0);}
  });
 }
 function pollGpu() {
  if (!timer) return;
  if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
   for (const {query} of pending) gl.deleteQuery(query);
   pending.length = 0;
   return;
  }
  while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
   const {query, sample} = pending.shift();
   sample.gpuMs=gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
   gl.deleteQuery(query);
  }
 }
 function installStages(){
 for (const [object, key, name] of [
  [game, 'step', 'simulation'], [game, 'updateAim', 'aim'], [game, 'predict', 'prediction'],
  [game, 'fire', 'combat.fire'], [game, 'impact', 'combat.impact'],
  [game, 'updateProjectiles', 'simulation.projectiles'], [game.audio, 'boom', 'combat.audio'],
  [game.infantry?.movement, 'prepare', 'simulation.infantry.hazards'],
  [game.infantry?.navigation, 'route', 'simulation.infantry.routes'],
  [game.infantry, 'update', 'simulation.infantry'],
  [game.infantry, 'decide', 'simulation.infantry.decisions'],
  [game.infantry?.controller, 'computeColliderMovement', 'simulation.infantry.movement'],
  [game.infantry, 'plan', 'simulation.infantry.planning'], [game.infantry, 'sync', 'simulation.infantrySync'],
  [game.ragdolls, 'update', 'simulation.ragdolls'], [game.scenery, 'update', 'simulation.scenery'],
  [game.awareness, 'update', 'simulation.awareness'], [game.events, 'drainCollisionEvents', 'simulation.collisions'], [game.world, 'step', 'simulation.physics'],
  [game.visibility, 'update', 'simulation.visibility'], [game.director, 'update', 'simulation.ai'],
  [game, 'drive', 'simulation.vehicles'], [game.environment?.ruts, 'update', 'simulation.terrain'],
  [game.fx, 'update', 'effects.update'], [game.fx, 'prepare', 'effects.prepare'],
  [game.wreckFires, 'update', 'effects.fires'], [game, 'updateCamera', 'camera'],
  [game.visibility, 'animate', 'render.fogAnimation'], [game.presentation, 'render', 'render'],
  [game, 'onFrame', 'hud']
 ]) measure(object, key, name);
 measure(game, 'commandFor', 'simulation.commands');
 measure(game.director?.navigation, 'steer', 'simulation.steering');
 game.presentation.composer.passes.forEach((pass, i) => measure(pass, 'render', `pass.${i}.${pass.constructor.name}`, true));
 wrap(game.presentation.composer, 'render', original => function(...args) {
  // Never block the GPU or nest a timer belonging to another profiler.
  const query = current && timer && pending.length < 8 && !gl.getQuery(timer.TIME_ELAPSED_EXT, gl.CURRENT_QUERY) ? gl.createQuery() : null;
  if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
  try {return original.apply(this, args);}
  finally {if (query) {gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push({query, sample: current});}}
 });
 }
 installStages();
 wrap(game, 'frame', original => function(...args) {
  if (!game.running || game.loading) return original.apply(this, args);
  if(world!==game.world){for(const undo of restore.splice(0).reverse())undo();world=game.world;installStages();}
  pollGpu();
  const name = game.deploymentIntro ? 'deployment' : game.mode === 'playing' && game.awareness?.state ? `playing.${game.awareness.state}` : game.mode;
  if (!modes.has(name)) modes.set(name, {previous: null});
  const mode = modes.get(name), start = performance.now();
  const sample = {mode: name, timestamp:start, settings:metadata(), stages: {}, interval: mode.previous === null ? null : start - mode.previous};
  // Do not count a pause/garage interval as a playing frame interval.
  for (const other of modes.values()) other.previous = null;
  mode.previous = start;
  current = sample; renderer.info.reset();
  try {return original.apply(this, args);}
  finally {
   sample.cpuMs = performance.now() - start;
   sample.drawCalls = renderer.info.render.calls; sample.triangles = renderer.info.render.triangles;
   sample.projectiles = game.shells?.length || 0; sample.particles = game.fx?.particles?.length || 0;
   history.push(sample);current = null;
   while(history.length>maxFrames||(history.length&&start-history[0].timestamp>60000))history.shift();
   onFrame(sample,history);

  }
 },frameRestore);
 const session={
 stop(){
  if(stopped)return;stopped=true;pollGpu();
  for(const {query} of pending.splice(0))gl.deleteQuery(query);
  for(const undo of [...restore,...frameRestore].reverse())undo();
  renderer.info.autoReset=autoReset;active.delete(game);
 },
 report(since=-Infinity, timeline=false){
  if(!stopped)pollGpu();
  const selected=history.filter(f=>f.timestamp>=since), grouped=new Map();
  for(const sample of selected){if(!grouped.has(sample.mode))grouped.set(sample.mode,[]);grouped.get(sample.mode).push(sample);}
  const report = {metadata: selected[0]?.settings||metadata(), note: 'Times are milliseconds. Stage times are inclusive; do not add parents and children. CPU render time is submission time, not GPU time. GPU samples may be unavailable or delayed.', modes: {}};
  for (const [name, frames] of grouped) {
   const intervals = frames.slice(1).map(f => f.interval).filter(v => v !== null), gpu=frames.map(f=>f.gpuMs).filter(v=>v!==undefined);
   const keys = new Set(frames.flatMap(f => Object.keys(f.stages)));
   report.modes[name] = {
    frames: frames.length, fps: intervals.length ? round(1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)) : null,
    frameCpuMs: stats(frames.map(f => f.cpuMs)), gpuMs: stats(gpu), gpuSamples: gpu.length,
    simulationTicksPerFrame: round(frames.reduce((sum, f) => sum + (f.stages.simulation?.invocations || 0), 0) / frames.length),
    drawCalls: stats(frames.map(f => f.drawCalls)), triangles: stats(frames.map(f => f.triangles)),
    projectiles: stats(frames.map(f => f.projectiles)), particles: stats(frames.map(f => f.particles)),
    stages: Object.fromEntries([...keys].map(key => [key, {
     msPerFrame: stats(frames.map(f => f.stages[key]?.ms || 0)),
     meanMsPerCall: round(frames.reduce((sum, f) => sum + (f.stages[key]?.ms || 0), 0) / frames.reduce((sum, f) => sum + (f.stages[key]?.invocations || 0), 0)),
     callsPerFrame: round(frames.reduce((sum,f)=>sum+(f.stages[key]?.invocations||0),0)/frames.length),
     drawCallsPerFrame: round(frames.reduce((sum, f) => sum + (f.stages[key]?.drawCalls || 0), 0) / frames.length)
    }]))
   };
  }
  if(timeline)report.timeline=selected.map(f=>({...f,timeMs:round(f.timestamp-(selected[0]?.timestamp||0))}));
  return report;
 }
 };
 active.set(game,session);return session;
}
