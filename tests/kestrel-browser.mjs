import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const still=async(path,[x,y,z,ly])=>{await page.evaluate(([x,y,z,ly])=>{const g=tankz.game;g.running=false;const p=g.player.root.position;g.camera.position.set(p.x+x,p.y+y,p.z+z);g.camera.lookAt(p.x,p.y+ly,p.z);document.querySelector('#ui').style.display='none';g.presentation.render(0);},[x,y,z,ly]);await page.screenshot({path});await page.evaluate(()=>{document.querySelector('#ui').style.display='';tankz.game.running=true;tankz.game.frame();});};
try{await page.goto(process.env.TANKZ_URL||'http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game?.running);await page.evaluate(()=>tankz.game.selectTank('scout'));await page.waitForTimeout(900);
 const high=await page.evaluate(()=>({...tankz.game.player.root.userData,name:tankz.game.player.root.name}));assert.equal(high.name,'Kestrel');assert.equal(high.detail,'high');
 // Every generated Kestrel map reaches the showroom material.
 assert.deepEqual(await page.evaluate(()=>{const a=tankz.game.player.armor;return [a.map,a.normalMap,a.roughnessMap,a.specularColorMap].map(t=>!!t?.image?.width);}),[true,true,true,true]);
 await still('test-artifacts/kestrel-front.png',[-4.5,3.2,-6,.35]);await still('test-artifacts/kestrel-side.png',[7.5,1.6,0,.2]);await still('test-artifacts/kestrel-rear.png',[5.2,2.6,6.5,.3]);
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();const low=await page.evaluate(()=>({...tankz.game.player.root.userData}));assert.equal(low.detail,'low');assert.ok(low.triangles<high.triangles*.3);
 assert.equal(await page.evaluate(()=>!!tankz.game.player.armor.bumpMap?.image),true);
 await page.waitForTimeout(400);await page.keyboard.press('Space');await page.waitForTimeout(200);await page.screenshot({path:'test-artifacts/kestrel-gameplay.png'});await still('test-artifacts/kestrel-gameplay-close.png',[4.5,3,5,.3]);
 assert.deepEqual(errors,[]);console.log('Kestrel detail selection, generated maps, rendering and deployment passed.',{high,low});}finally{await browser.close();}
