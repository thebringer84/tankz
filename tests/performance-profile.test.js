import test from 'node:test';
import assert from 'node:assert/strict';
import {profileGame} from '../src/performance-profile.js';

function fixture(gpu = false) {
 let query = null, deleted = 0;
 const gl = {
  RENDERER: 1, CURRENT_QUERY: 2, QUERY_RESULT_AVAILABLE: 3, QUERY_RESULT: 4,
  getExtension: name => gpu && name === 'EXT_disjoint_timer_query_webgl2' ? {TIME_ELAPSED_EXT: 5, GPU_DISJOINT_EXT: 6} : null,
  getParameter: name => name === 6 ? false : 'test renderer',
  getQuery: () => query, createQuery: () => ({}), beginQuery: (target, value) => {query = value;}, endQuery: () => {query = null;},
  getQueryParameter: (q, name) => name === 3 ? true : 2000000,
  deleteQuery: () => {deleted++;}
 };
 const renderer = {domElement: {width: 5120, height: 1440}, getContext: () => gl, getPixelRatio: () => 1,
  info: {autoReset: true, render: {calls: 0, triangles: 0}, reset() {this.render.calls = 0; this.render.triangles = 0;}}
 };
 const pass = {render() {renderer.info.render.calls += 7; renderer.info.render.triangles += 100;}};
 const game = {
  running: true, mode: 'playing', renderer,
  step() {}, onFrame() {}, visibility: {animate() {}},
  presentation: {quality: 'high', composer: {passes: [pass], render() {pass.render();}}, render() {game.visibility.animate();this.composer.render();}}
 };
 const prototype = {frame() {if(this.mode === 'playing') {this.step();this.step();}this.presentation.render();this.onFrame();}};
 Object.setPrototypeOf(game, prototype);
 return {game, deleted: () => deleted};
}

test('encounter capture separates alert states and retains delayed GPU attribution',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {game}=fixture(true);game.awareness={state:'stealth'};game.shells=[];
 const capture=profileGame(game,100);game.frame();
 game.awareness.state='engaged';game.shells=[{},{}];game.frame();
 t.mock.timers.tick(100);const report=await capture;
 assert.equal(report.modes['playing.stealth'].frames,1);
 assert.equal(report.modes['playing.stealth'].projectiles.mean,0);
 assert.equal(report.modes['playing.engaged'].projectiles.mean,2);
 assert.equal(report.modes['playing.engaged'].fps,null);
 assert.equal(report.modes['playing.stealth'].gpuSamples,1);
 assert.equal(report.modes['playing.engaged'].gpuSamples,1);
});

for(const gpu of [false, true])test(`capture splits modes, counts complete frames and restores methods (GPU ${gpu})`, async t => {
 t.mock.timers.enable({apis: ['setTimeout']});
 const {game, deleted} = fixture(gpu), frame = game.frame, step = game.step;
 const capture = profileGame(game, 100);
 await assert.rejects(profileGame(game, 100), /already running/);
 game.frame(); game.frame(); game.mode = 'paused'; game.frame();
 t.mock.timers.tick(100);
 const report = await capture;
 assert.equal(report.metadata.width, 5120);
 assert.equal(report.modes.playing.frames, 2);
 assert.equal(report.modes.playing.simulationTicksPerFrame, 2);
 assert.equal(report.modes.paused.simulationTicksPerFrame, 0);
 assert.equal(report.modes.paused.fps, null);
 assert.equal(report.modes.playing.drawCalls.mean, 7);
 assert.equal(report.modes.playing.stages['pass.0.Object'].drawCallsPerFrame, 7);
 assert.equal(report.modes.playing.gpuMs?.mean ?? null, gpu ? 2 : null);
 assert.equal(deleted(), gpu ? 3 : 0);
 assert.equal(game.frame, frame); assert.equal(Object.hasOwn(game, 'frame'), false);
 assert.equal(game.step, step); assert.equal(game.renderer.info.autoReset, true);
 const again = profileGame(game, 100);t.mock.timers.tick(100);await again;
});

test('rolling sessions are bounded, rebind rebuilt worlds and restore on disable',async()=>{
 const {startGameProfiler}=await import('../src/performance-profile.js');
 const {game}=fixture(true),original=game.frame;
 game.world={step(){}};const first=game.world,firstStep=first.step;
 const session=startGameProfiler(game,{maxFrames:2});
 game.frame();game.frame();
 game.world={step(){}};const second=game.world,secondStep=second.step;
 game.frame();assert.equal(first.step,firstStep);assert.notEqual(second.step,secondStep);
 const report=session.report(-Infinity,true);assert.equal(report.timeline.length,2);assert.equal(report.modes.playing.frames,2);
 assert.doesNotThrow(()=>JSON.stringify(report));
 session.stop();session.stop();assert.equal(game.frame,original);assert.equal(second.step,secondStep);assert.equal(game.renderer.info.autoReset,true);
});

test('timed captures share an enabled panel session without stopping it',async t=>{
 const {startGameProfiler}=await import('../src/performance-profile.js');
 t.mock.timers.enable({apis:['setTimeout']});
 const {game}=fixture(true),original=game.frame,session=startGameProfiler(game);
 const capture=profileGame(game,100);game.frame();t.mock.timers.tick(100);
 const report=await capture;assert.equal(report.modes.playing.frames,1);assert.notEqual(game.frame,original);
 game.frame();assert.equal(session.report().modes.playing.frames,2);session.stop();assert.equal(game.frame,original);
});
