import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/assets/'))requests.push(r.url());});
// Keep the real bootstrap, loader and event handlers; render deterministic frames
// so a software GPU doesn't dominate model-switch measurements.
await page.route('**/src/main.js*',async route=>{const response=await route.fetch(),main=await response.text();await route.fulfill({response,body:main.replace(/const loading\s*=\s*new LoadingScreen\(\);/,"Game.prototype.frame=function(){};const loading=new LoadingScreen();")});});
let release;const gate=new Promise(resolve=>release=resolve);
await page.route('**/assets/armor-albedo.png',async route=>{await gate;await route.continue();});
await page.addInitScript(()=>localStorage.setItem('tankz-settings',JSON.stringify({quality:'low',shake:0})));
try{
 await page.goto(process.env.TANKZ_URL||'http://localhost:5174',{waitUntil:'commit'});
 await page.waitForFunction(()=>document.querySelector('#loading-status')?.textContent.includes('materials'),{timeout:60000});
 assert.equal(await page.locator('#loading').isVisible(),true);
 await page.screenshot({path:'test-artifacts/loading-startup.png'});release();
 await page.waitForFunction(()=>window.tankz?.game.running,{timeout:120000});await page.waitForFunction(()=>document.querySelector('#loading').hidden);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="garage"]').click();
 const requestCount=requests.length;const music=await page.evaluate(()=>{const a=tankz.game.audio;window.menuMusicSource=a.musicSource;return {duration:a.musicBuffer.duration,loop:a.musicSource.loop,wanted:a.musicWanted};});assert.ok(music.duration>10);assert.ok(music.loop&&music.wanted);
 const timings=await page.evaluate(()=>{
  const {game:g,ui}=tankz,world=g.world,showroom=g.showroom,fx=g.fx,pools=g.fx.lights.map(s=>s.light),roots=new Map([...g.garageTanks].map(([type,t])=>[type,t.root])),times=[];
  for(let i=0;i<30;i++){const start=performance.now();ui.action('tank',['scout','heavy','medium'][i%3]);times.push(performance.now()-start);}
  return {max:Math.max(...times),average:times.reduce((a,b)=>a+b)/times.length,sameWorld:world===g.world,sameShowroom:showroom===g.showroom,sameEffects:fx===g.fx,samePools:pools.every((p,i)=>p===g.fx.lights[i].light),sameModels:[...g.garageTanks].every(([type,t])=>roots.get(type)===t.root),bodies:g.world.bodies.len(),visible:[...g.garageTanks.values()].filter(t=>t.root.visible).length};
 });
 assert.ok(timings.sameWorld&&timings.sameShowroom&&timings.sameEffects&&timings.samePools&&timings.sameModels);assert.equal(timings.visible,1);assert.ok(timings.max<100);assert.equal(requests.length,requestCount,'switches must not fetch assets');console.log('Garage swaps:',timings);
 await page.evaluate(()=>{const g=tankz.game;g.updateCamera(0);g.fx.prepare(g.camera);g.presentation.render(0);});await page.screenshot({path:'test-artifacts/loading-garage-ready.png'});
 // Observe the overlay before terrain construction starts and block duplicate input.
 await page.locator('[data-action="menu"]').click();
 await page.evaluate(()=>tankz.ui.action('deploy'));
 await page.waitForFunction(()=>tankz.game.loading);
 assert.equal(await page.locator('#loading').isVisible(),true);
 await page.waitForFunction(()=>!tankz.game.loading&&tankz.game.mode==='playing',{timeout:120000});
 assert.deepEqual(requests.slice(requestCount),[],'deploy must not fetch assets');
 const ready=await page.evaluate(()=>({infantry:tankz.game.soldiers.length,jeeps:tankz.game.tanks.filter(t=>t.enemy).length,lights:tankz.game.fx.lights.length,rocketLights:tankz.game.fx.rocketLights.length,drone:!!tankz.game.drone.model,timer:tankz.game.timer}));assert.equal(ready.infantry,250);assert.equal(ready.jeeps,25);assert.equal(ready.lights,6);assert.equal(ready.rocketLights,2);assert.ok(ready.drone);assert.equal(ready.timer,900);assert.equal(await page.evaluate(()=>tankz.game.audio.musicWanted),false);console.log('Prepared gameplay:',ready);
 await page.screenshot({path:'test-artifacts/loading-gameplay-ready.png'});
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tankz.game.mode),'paused');
 await page.locator('[data-action="leave"]').click();await page.waitForFunction(()=>!tankz.game.loading&&tankz.game.mode==='menu',{timeout:120000});
 await page.locator('[data-action="garage"]').click();await page.locator('[data-action="tank"][data-value="heavy"]').click();assert.equal(await page.evaluate(()=>tankz.game.player.type),'heavy');
 assert.ok(await page.evaluate(()=>tankz.game.audio.musicWanted&&tankz.game.audio.musicSource===window.menuMusicSource));assert.deepEqual(errors,[]);console.log('Startup progress, cache reuse, deploy warm-up, no deferred requests, and return to garage passed.');
}finally{release();await browser.close();}
