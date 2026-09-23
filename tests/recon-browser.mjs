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
 await page.goto(process.env.TANKZ_URL||'http://localhost:5174');await page.waitForFunction(()=>window.tankz?.game.running,{timeout:60000});await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();
 await page.evaluate(()=>{const g=tankz.game;g.updateCamera(10);g.visibility.update(0,true);});
 await page.keyboard.press('e');
 assert.equal(await page.evaluate(()=>!!tankz.game.drone.active),true);
 const result=await page.evaluate(()=>{const g=tankz.game,d=g.drone.active;g.drone.update(2);g.world.step();g.drone.present(1,1/60);g.visibility.update(0,true);g.fx.prepare(g.camera);g.presentation.render(0);tankz.ui.frame(1/60);return {height:d.body.translation().y-d.origin.y,markers:document.querySelectorAll('.drone-target').length};});
 assert.ok(result.height>19.9);console.log('Recon:',result);
 // Put one contact in a known open sightline to check the tracking overlay.
 await page.evaluate(()=>{const g=tankz.game,s=g.soldiers[0],p=g.player.body.translation();s.body.setTranslation({x:p.x+7,y:p.y,z:p.z-6},true);g.world.step();g.infantry.sync();g.visibility.update(0,true);g.fx.prepare(g.camera);g.presentation.render(0);tankz.ui.frame(1/60);});
 assert.ok(await page.locator('.drone-target').count());
 await page.screenshot({path:'test-artifacts/recon-drone-markers.png'});
 const style=await page.locator('.drone-target-frame').first().evaluate(el=>({border:getComputedStyle(el).borderTopWidth,animation:getComputedStyle(el,'::after').animationName,shadow:getComputedStyle(el).boxShadow}));assert.equal(style.border,'2px');assert.equal(style.animation,'recon-pulse');assert.notEqual(style.shadow,'none');
 const alignment=await page.evaluate(()=>{const ui=tankz.ui,[t,el]=ui.droneMarkers.entries().next().value,p=t.root.position.clone();p.y+=t.infantry?.65:.4;const expected=tankz.game.project(p),rect=el.getBoundingClientRect();return Math.hypot(rect.x+rect.width/2-expected.x,rect.y+rect.height/2-expected.y);});assert.ok(alignment<1,'acquisition animation must stay centered on its target');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.drone-target-frame').first().evaluate(el=>getComputedStyle(el,'::after').animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{const g=tankz.game,d=g.drone.active,p=d.root.position;g.camera.position.copy(p).add({x:3,y:2,z:3});g.camera.lookAt(p);g.presentation.fog.uniforms.fogEnabled.value=0;g.fx.prepare(g.camera);g.renderer.render(g.scene,g.camera);});
 await page.screenshot({path:'test-artifacts/recon-drone-detail.png'});
 await page.evaluate(()=>{const g=tankz.game;g.drone.update(6.1);g.updateCamera(10);g.visibility.update(0,true);g.fx.update(.04,false);g.fx.prepare(g.camera);g.presentation.render(0);tankz.ui.frame(1/60);});
 assert.equal(await page.evaluate(()=>tankz.game.drone.active),null);assert.equal(await page.locator('.drone-target').count(),0);
 await page.screenshot({path:'test-artifacts/recon-drone-expired.png'});
 // Player impacts remain visible in fog, while hostile impacts leave no visual effects.
 const impacts=await page.evaluate(()=>{const g=tankz.game,p=g.player.root.position.clone().add({x:130,y:0,z:0});p.y=0;g.fx.clear();const shell=owner=>({owner,body:{translation:()=>p},ammo:{radius:0},damage:0,secondary:false});g.impact(shell(g.player),null,p);const player=g.fx.scorches.count;g.fx.clear();g.impact(shell({enemy:true}),null,p);return {player,enemy:g.fx.scorches.count};});
 assert.ok(impacts.player>0);assert.equal(impacts.enemy,0);
 assert.deepEqual(errors,[]);console.log('Drone geometry, E launch, animated contacts, expiry and fog impacts pass.');
}finally{await browser.close();}
