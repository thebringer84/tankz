import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

// Deploys the Dev Map, photographs the ten-building district, then drives the real
// cannon at buildings and records breaches, falling chunks, dust and rubble.
const url=process.env.TANKZ_URL||'http://localhost:5173';mkdirSync('test-artifacts/buildings',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const shot=name=>page.screenshot({path:`test-artifacts/buildings/${name}.png`});
// Freezes the follow camera so a view can be framed by hand.
const view=(pos,look)=>page.evaluate(([pos,look])=>{const g=tankz.game;g.updateCamera=()=>{};g.camera.position.set(...pos);g.camera.lookAt(...look);g.camera.updateMatrixWorld();},[pos,look]);
const release=()=>page.evaluate(()=>{delete tankz.game.updateCamera;});
const wait=ms=>page.waitForTimeout(ms);
try{
 await page.goto(url);await page.waitForFunction(()=>window.tankz?.game.running,null,{timeout:120000});
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();
 await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});await wait(500);
 const info=await page.evaluate(()=>{const g=tankz.game;return {buildings:g.buildings.items.map(b=>b.type).filter(t=>t!=='street'),modules:g.buildings.standingModules};});
 assert.equal(info.buildings.length,10);console.log('Deployed',info.buildings.join(', '),'with',info.modules,'modules');
 // Keep enemies out of the way so the test is about buildings.
 await page.evaluate(()=>{const g=tankz.game;for(const t of g.tanks)if(t.enemy){t.dead=true;t.root.visible=false;}for(const s of g.soldiers)s.dead=true;g.hurt=((hurt)=>function(target,...a){if(target===g.player)return;return hurt.call(this,target,...a);})(g.hurt);g.buildings.occlusion=false;});
 // Frame pacing sampler (requestAnimationFrame deltas while something happens).
 const sampleFrames=ms=>page.evaluate(ms=>new Promise(done=>{const d=[];let last=performance.now();const end=last+ms;const tick=now=>{d.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else{d.sort((a,b)=>a-b);done({avg:+(d.reduce((a,b)=>a+b,0)/d.length).toFixed(1),p95:+d[Math.floor(d.length*.95)].toFixed(1),max:+d.at(-1).toFixed(1)});}};requestAnimationFrame(tick);}),ms);
 await view([30,60,40],[16,0,-40]);await wait(600);await shot('district-overview');
 await view([-6,16,-4],[12,6,-40]);await wait(400);await shot('street-view');
 await view([-40,14,20],[-10,4,-50]);await wait(400);await shot('district-west');
 await view([30,26,-10],[8,6,-67]);await wait(400);await shot('mosque');
 await view([60,18,-20],[45,4,-40]);await wait(400);await shot('warehouse-apartment');
 await view([-45,12,15],[-30,2,-2]);await wait(400);await shot('petrol');
 await view([55,12,15],[40,3,0]);await wait(400);await shot('courtyard');
 await view([28,6,4],[38,3,-1]);await wait(400);await shot('courtyard-palm');
 await view([-16,7,-28],[-8,4,-38]);await wait(400);await shot('shanasheel');
 // Put the tank in the street facing the hotel and fire HE at its ground floor.
 const fire=async(target,ammo,seconds)=>{await page.evaluate(([target,ammo])=>{const g=tankz.game;g.setAmmo(ammo);const aim=new g.aim.constructor(...target);g.updateAim=()=>{g.aim.copy(aim);g.autoTarget=null;};g.firing=true;},[target,ammo]);await wait(seconds*1000);await page.evaluate(()=>{tankz.game.firing=false;});};
 await page.evaluate(()=>{const g=tankz.game,b=g.player.body;b.setTranslation({x:6,y:3,z:-22},true);b.setRotation({x:0,y:1,z:0,w:0},true);b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);});
 await wait(800);await view([22,12,-20],[6,5,-40]);
 const before=await page.evaluate(()=>tankz.game.buildings.items.find(b=>b.type==='hotel').modules.filter(m=>m.state==='standing').length);
 await fire([4,2.6,-36],'he',1.2);await wait(300);await shot('hotel-first-hits');
 await fire([8,2.4,-36],'he',6);await wait(500);await shot('hotel-breached');
 await fire([6,5,-36],'ap',5);await fire([2,1.5,-36],'he',1);const collapseFrames=await sampleFrames(4000);await wait(200);await shot('hotel-collapse');console.log('Frame ms during collapse',collapseFrames);
 await wait(3000);await shot('hotel-dust');
 const after=await page.evaluate(()=>{const g=tankz.game,h=g.buildings.items.find(b=>b.type==='hotel');return {standing:h.modules.filter(m=>m.state==='standing').length,stats:g.buildings.stats,rubble:g.buildings.rubble.vertexCount,debris:g.buildings.debris.length,falling:g.buildings.falling.length};});
 console.log('Hotel modules standing',before,'->',after.standing,after);
 assert.ok(after.stats.detached>20,'cells were knocked out');assert.ok(after.stats.collapsed>3,'modules collapsed');assert.ok(before-after.standing>3);
 // Minaret: topple it with shots into its base.
 await page.evaluate(()=>{const g=tankz.game,b=g.player.body;b.setTranslation({x:25,y:3,z:-60},true);b.setRotation({x:0,y:-.7071,z:0,w:.7071},true);b.setLinvel({x:0,y:0,z:0},true);});
 await wait(600);await view([32,9,-84],[16,8,-61]);await fire([17.2,2.2,-61.3],'he',9);await wait(1400);await shot('minaret-topple');await wait(2500);await shot('minaret-down');
 const mosque=await page.evaluate(()=>{const g=tankz.game,m=g.buildings.items.find(b=>b.type==='mosque');return m.modules.filter(x=>x.rigid==='minaret').map(x=>x.state);});
 console.log('Minaret modules',mosque.join(','));assert.ok(mosque.every(x=>x==='gone'),'minaret toppled');
 await wait(1000);await view([25,40,-5],[10,0,-45]);await shot('aftermath-overview');
 // Ram the apartment block's ground floor at speed with turbo.
 await release();await page.evaluate(()=>{const g=tankz.game,b=g.player.body;delete g.updateAim;g.firing=false;b.setTranslation({x:34,y:3,z:-38},true);b.setRotation({x:0,y:0,z:0,w:1},true);b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);window.ramStart=g.buildings.stats.detached;g.buildings.occlusion=true;});
 await wait(700);await page.evaluate(()=>{tankz.game.keys.add('KeyW');tankz.game.keys.add('ShiftLeft');});await wait(2600);await shot('ram-impact');await wait(900);
 const ram=await page.evaluate(()=>{const g=tankz.game;g.keys.clear();return {detached:g.buildings.stats.detached-window.ramStart,z:+g.player.body.translation().z.toFixed(1)};});console.log('Ramming',ram);await shot('ram-through');
 assert.ok(ram.detached>0,'ramming breaks wall cells');
 // Behind the hotel the follow camera would be blocked, so the hotel fades.
 await page.evaluate(()=>{const g=tankz.game,b=g.player.body;g.keys.clear();b.setTranslation({x:9,y:3,z:-53},true);b.setLinvel({x:0,y:0,z:0},true);});await wait(1500);
 const cut=await page.evaluate(()=>tankz.game.buildings.cutOpen);await shot('occlusion-cutaway');console.log('Cutaway open with tank behind the hotel',cut.toFixed(2));assert.ok(cut>.9);
 const idle=await sampleFrames(2000);console.log('Frame ms idle in district',idle);
 assert.deepEqual(errors,[]);console.log('Building district rendered, breached and collapsed without errors.');
}finally{await browser.close();}
