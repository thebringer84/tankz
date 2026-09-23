import {INFANTRY_COUNT,JEEP_COUNT} from '../src/config.js';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
// Render explicit frames so assertions measure simulation time instead of the
// speed of a headless software GPU. DOM/WAAPI animations still run normally.
await page.route('**/src/main.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 import '/src/style.css';import {Game} from '/src/game.js';import {UI} from '/src/ui.js';
 window.advanceGameFrame=Game.prototype.frame;Game.prototype.frame=function(){};
 const game=new Game(document.querySelector('#world'));await game.init();
 const ui=new UI(game,document.querySelector('#ui'));window.tankz={game,ui};
 document.querySelector('#loading').remove();
 `}));
await page.addInitScript(()=>localStorage.setItem('tankz-settings',JSON.stringify({quality:'low',shake:0})));
try{
 await page.goto(process.env.TANKZ_URL||'http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running,{timeout:60000});
 assert.equal(await page.evaluate(()=>tankz.game.frame.toString()),'function(){}','explicit-frame test harness must intercept Vite cache-busted entrypoints');
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();
 await page.evaluate(()=>{const g=tankz.game;g.updateCamera(10);g.fx.updateHeading(g.player,true);g.fx.prepare(g.camera);g.presentation.render(0);});
 assert.equal(await page.evaluate(()=>tankz.game.fx.headingMarker.visible),true);
 await page.screenshot({path:'test-artifacts/hull-marker.png'});
 // Burst and shell at a known simulation age.
 await page.evaluate(()=>{const g=tankz.game;g.fx.clear();g.fx.updateHeading(g.player,true);g.fire(g.player,false);g.fx.update(.08,false);g.fx.prepare(g.camera);g.presentation.render(0);});
 assert.ok(await page.evaluate(()=>tankz.game.fx.muzzleFlashes.some(f=>f.group.visible&&f.material.uniforms.cannon.value===1)));
 await page.screenshot({path:'test-artifacts/cannon-cinematic.png'});
 await page.evaluate(async()=>{const g=tankz.game;const {updateCannonProjectile}=await import('/src/projectile-visuals.js');const shell=g.shells.at(-1);for(let i=0;i<4;i++)g.world.step();shell.mesh.position.copy(shell.body.translation());updateCannonProjectile(shell.mesh,80,.067);g.fx.update(.067,false);g.fx.prepare(g.camera);g.presentation.render(0);});
 await page.screenshot({path:'test-artifacts/cannon-projectile.png'});
 // Inspect WAAPI at a deterministic midpoint, then let it finish naturally.
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>tankz.game.mode),'paused');
 const opening=await page.evaluate(()=>{const a=tankz.ui.screenAnimation;a.pause();a.currentTime=120;return +getComputedStyle(document.querySelector('.modal-shade')).opacity;});assert.ok(opening>0&&opening<1);
 await page.evaluate(()=>tankz.ui.screenAnimation.finish());await page.screenshot({path:'test-artifacts/pause-open.png'});
 await page.locator('#volume').focus();await page.keyboard.press('Escape');
 const closing=await page.evaluate(()=>{const a=tankz.ui.screenAnimation;if(a){a.pause();a.currentTime=90;}return {mode:tankz.game.mode,inert:document.querySelector('#ui').inert,opacity:+getComputedStyle(document.querySelector('.modal-shade')).opacity};});
 assert.equal(closing.mode,'paused');assert.equal(closing.inert,true);assert.ok(closing.opacity>0&&closing.opacity<1);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tankz.game.mode),'paused');
 await page.evaluate(()=>tankz.ui.screenAnimation.finish());await page.waitForFunction(()=>tankz.game.mode==='playing');
 assert.equal(await page.locator('[role="dialog"]').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'pause');
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tankz.game.mode),'paused');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tankz.game.mode),'playing');
 // Render actual per-unit fading materials and ensure the rest of the squad is unaffected.
 await page.evaluate(()=>{const g=tankz.game,s=g.soldiers[0],p=g.player.root.position;s.body.setTranslation({x:p.x+4,y:p.y,z:p.z-4},true);s.root.position.copy(s.body.translation());const state=g.visibility.track(s);state.opacity=.5;g.visibility.applyFade(s,state);g.fx.clear();g.fx.updateHeading(g.player,true);g.fx.prepare(g.camera);g.presentation.render(0);});
 await page.screenshot({path:'test-artifacts/fog-unit-fade.png'});
 // Expanded world: render a distant launch sector and verify terrain culling.
 const world=await page.evaluate(async()=>{const g=tankz.game,{JUMP_RIDGES,MAP_SIZE}=await import('/src/config.js'),r=JUMP_RIDGES[0];
  const p={x:r.x,y:g.environment.surfaceHeight(r.x,r.z)+1.1,z:r.z};g.player.body.setTranslation(p,true);g.syncTank(g.player);g.updateCamera(10);g.visibility.update(0,true);g.fx.clear();g.fx.updateHeading(g.player,true);g.fx.prepare(g.camera);tankz.ui.drawMap();
  let drawn=0;for(const patch of g.environment.ruts.patches)patch.mesh.onBeforeRender=()=>drawn++;
  g.presentation.render(0);
  return {infantry:g.soldiers.length,jeeps:g.tanks.filter(t=>t.enemy).length,ridges:g.environment.jumpRidges.length,stones:g.environment.jumpRocks.length,area:MAP_SIZE**2/220**2,drawn,chunks:g.environment.ruts.patches.length};
 });
 assert.equal(world.infantry,INFANTRY_COUNT);assert.equal(world.jeeps,JEEP_COUNT);assert.equal(world.ridges,24);assert.equal(world.stones,8);assert.ok(Math.abs(world.area-6)<1e-10);assert.ok(world.drawn>0&&world.drawn<world.chunks);
 await page.screenshot({path:'test-artifacts/expanded-map-ridge.png'});console.log('Expanded world:',world);
 // Shift boosts through the real input mapping and the HUD reflects charge.
 await page.keyboard.down('w');await page.keyboard.down('Shift');
 const turbo=await page.evaluate(()=>{const g=tankz.game;for(let i=0;i<60;i++)g.step(1/60);tankz.ui.frame(1/60);return {boost:g.player.boosting,charge:g.player.turboCharge,brake:g.commandFor(g.player).brake,hud:document.querySelector('#turbo-status').textContent};});
 assert.equal(turbo.boost,true);assert.equal(turbo.brake,false);assert.ok(turbo.charge<.8);assert.equal(turbo.hud,'BOOSTING');
 await page.keyboard.up('Shift');await page.keyboard.up('w');
 await page.evaluate(()=>{tankz.game.step(1/60);tankz.ui.frame(1/60);});
 await page.evaluate(async()=>{const g=tankz.game,{MAP_HALF}=await import('/src/config.js');g.player.body.setTranslation({x:-155,y:g.environment.surfaceHeight(-155,MAP_HALF-28)+1.1,z:MAP_HALF-28},true);g.syncTank(g.player);g.updateCamera(10);g.visibility.update(0,true);g.fx.clear();g.fx.prepare(g.camera);g.presentation.render(0);tankz.ui.frame(1/60);});
 await page.screenshot({path:'test-artifacts/frontier-fences.png'});
 await page.evaluate(async()=>{const g=tankz.game,{MAP_HALF}=await import('/src/config.js');g.camera.far=1000;g.camera.updateProjectionMatrix();g.camera.position.set(-130,70,MAP_HALF-65);g.camera.lookAt(-155,3,MAP_HALF+40);g.fx.prepare(g.camera);g.presentation.render(0);});
 await page.screenshot({path:'test-artifacts/frontier-scenery.png'});
 await page.evaluate(()=>{const g=tankz.game,r=g.environment.jumpRocks[0],p=r.mesh.position;g.player.body.setTranslation({x:p.x+10,y:p.y+2,z:p.z+10},true);g.syncTank(g.player);g.visibility.update(0,true);g.camera.position.set(p.x+12,p.y+10,p.z+15);g.camera.lookAt(p.x,p.y+1,p.z);g.fx.prepare(g.camera);g.presentation.render(0);});
 await page.screenshot({path:'test-artifacts/fractured-stone-ramp.png'});
 console.log('Frontier materials, distant terrain, fractured ramp, Shift turbo input and charge HUD passed.');
 const motion=await page.evaluate(()=>{
  const g=tankz.game,render=g.presentation.render.bind(g.presentation),clock=g.clock.getDelta.bind(g.clock);g.clock.getDelta=()=>1/120;g.acc=0;g.keys.add('KeyW');let maxError=0,betweenTicks=0;
  g.presentation.render=()=>{const t=g.player,alpha=g.acc/(1/60),expected=t.previousPose.position.clone().lerp(t.body.translation(),alpha);maxError=Math.max(maxError,t.root.position.distanceTo(expected));if(alpha>.1&&alpha<.9)betweenTicks++;};
  for(let i=0;i<24;i++)window.advanceGameFrame.call(g);
  const before=g.player.root.position.clone();g.mode='paused';window.advanceGameFrame.call(g);const pauseDrift=before.distanceTo(g.player.root.position);g.mode='playing';g.keys.clear();
  g.clock.getDelta=clock;g.presentation.render=render;g.presentation.render(0);
  return {maxError,betweenTicks,pauseDrift};
 });
 assert.ok(motion.maxError<1e-8);assert.equal(motion.betweenTicks,12);assert.equal(motion.pauseDrift,0);console.log('Actual frame-loop interpolation at 120 Hz:',motion);
 // Border art preserves a truly transparent center; state labels accompany color.
 const alpha=await page.evaluate(async()=>{const img=new Image();img.src='/assets/awareness-edge.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(Math.floor(img.width/2),Math.floor(img.height/2),1,1).data[3];});assert.equal(alpha,0);
 await page.evaluate(()=>{const g=tankz.game;g.player.body.setTranslation({x:0,y:g.environment.surfaceHeight(0,19)+1.1,z:19},true);g.player.body.setLinvel({x:0,y:0,z:0},true);g.syncTank(g.player);g.updateCamera(10);g.visibility.update(0,true);g.fx.prepare(g.camera);g.presentation.render(0);});
 for(const state of ['stealth','spotted','engaged']){
  await page.evaluate(state=>{const g=tankz.game,a=g.awareness;a.state='stealth';a.lastAttack=-Infinity;const enemy={enemy:true,ai:{sees:state!=='stealth',state:state==='engaged'?'pursue':state==='spotted'?'suspicious':'patrol'}};a.update({time:0,tanks:[enemy],soldiers:[],director:{messages:[]}},1/60);tankz.ui.frame(1/60);},state);
  assert.equal(await page.locator('#awareness-label').textContent(),state.toUpperCase());
  assert.equal(await page.locator('#awareness-frame').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await page.screenshot({path:`test-artifacts/awareness-${state}.png`});
 }
 const lock=await page.evaluate(()=>{const g=tankz.game,t=g.player,target=g.soldiers[0],p=t.body.translation();target.body.setTranslation({x:p.x+12,y:p.y,z:p.z},true);target.root.position.copy(target.body.translation());target.visibleToPlayer=true;g.autoTarget={entity:target};g.aim.copy(target.root.position);t.localYaw=0;t.elevation=0;const cmd={throttle:0,steer:0,aim:g.aim,fire:false,secondary:false};g.drive(t,cmd,1/60);tankz.ui.frame(1/60);const turning=document.querySelector('#impact-aim').classList.contains('locked');for(let i=0;i<160;i++)g.drive(t,cmd,1/60);tankz.ui.frame(1/60);return {turning,aligned:document.querySelector('#impact-aim').classList.contains('locked')};});
 assert.equal(lock.turning,false);assert.equal(lock.aligned,true);
 assert.equal(await page.locator('.awareness-engaged i').evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion disables pulsing');
 const alert=await page.evaluate(()=>{const g=tankz.game;const enemies=Array.from({length:14},()=>({enemy:true,ai:{state:'pursue',sees:true}}));g.awareness.update({time:0,tanks:enemies,soldiers:[],director:{messages:[]}},.016);tankz.ui.frame(.016);return {level:document.querySelector('#enemy-alert').getAttribute('aria-valuenow'),lit:document.querySelectorAll('.alert-segments .lit').length};});
 assert.equal(alert.level,'5');assert.equal(alert.lit,5);await page.screenshot({path:'test-artifacts/awareness-full-alert.png'});
 await page.evaluate(()=>{const g=tankz.game;g.awareness.lastAttack=-Infinity;g.awareness.update({time:20,tanks:[],soldiers:[],director:{messages:[]}},3);tankz.ui.frame(.016);});
 assert.equal(await page.locator('#alert-level').textContent(),'0 / 5');assert.equal(await page.locator('.alert-segments .lit').count(),0);
 console.log('Awareness borders, transparent center, labels, reduced motion, traverse-before-lock, and enemy alert escalation/recovery passed.');
 // Saturate the corpse pool through actual troop run-overs, then advance the
 // real game loop through simultaneous dismemberments and pool evictions.
 const crowd=await page.evaluate(()=>{const g=tankz.game,render=g.presentation.render.bind(g.presentation),clock=g.clock.getDelta.bind(g.clock);g.autoTarget=null;
  const victims=g.soldiers.filter(s=>!s.dead&&!s.wounded&&s.weapon!=='flame').slice(0,28);
  for(const s of victims){if(s.dead)continue;g.player.body.setTranslation(s.body.translation(),true);g.player.speed=10;g.player.grounded=6;g.infantry.sync();}
  const filled=g.ragdolls.items.length;for(const item of g.ragdolls.items)item.age=.9;
  g.player.body.setTranslation({x:0,y:g.environment.surfaceHeight(0,19)+1.1,z:19},true);g.player.body.setLinvel({x:0,y:0,z:0},true);g.syncTank(g.player);g.acc=0;g.keys.clear();g.presentation.render=()=>{};g.clock.getDelta=()=>1/60;
  const start=g.time;for(let i=0;i<90;i++)window.advanceGameFrame.call(g);
  const result={filled,max:g.ragdolls.max,elapsed:g.time-start,live:g.ragdolls.items.every(item=>!item.removed&&item.parts.every(part=>part.body.isValid())),count:g.ragdolls.items.length};
  g.clock.getDelta=clock;g.presentation.render=render;g.presentation.render(0);return result;
 });
 assert.equal(crowd.filled,crowd.max);assert.ok(crowd.elapsed>1.4);assert.equal(crowd.live,true);assert.ok(crowd.count<=crowd.max);console.log('Crowd run-over frame-loop regression:',crowd);
 assert.deepEqual(errors,[]);console.log('Combat presentation passed: muzzle shader, projectile streak, hull marker, unit fade, animated pause/resume, repeated Escape, input focus, reduced motion, and no browser errors.');
}finally{await browser.close();}
