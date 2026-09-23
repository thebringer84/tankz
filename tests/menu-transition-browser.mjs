import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TANKZ_URL||'http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running);await page.waitForTimeout(800);
 const before=await page.evaluate(()=>({id:tankz.game.showroom.uuid,time:tankz.game.time}));
 await page.locator('[data-action="garage"]').click();await page.waitForTimeout(250);
 const mid=await page.evaluate(()=>({view:tankz.game.showroomView,inert:document.querySelector('#ui').inert}));assert.ok(mid.view>0&&mid.view<1);assert.equal(mid.inert,true);
 await page.waitForFunction(()=>!tankz.ui.transitioning&&!tankz.game.showroomTransition);
 assert.equal(await page.evaluate(()=>tankz.ui.screen),'garage');assert.equal(await page.evaluate(()=>tankz.game.showroom.uuid),before.id);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'menu');
 await page.screenshot({path:'test-artifacts/garage-transition-complete.png'});
 await page.locator('[data-action="menu"]').click();await page.waitForFunction(()=>!tankz.ui.transitioning&&!tankz.game.showroomTransition);
 assert.equal(await page.evaluate(()=>tankz.game.showroomView),0);assert.equal(await page.evaluate(()=>tankz.game.showroom.uuid),before.id);
 assert.ok(await page.evaluate(t=>tankz.game.time>t,before.time));
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="garage"]').click();
 assert.deepEqual(await page.evaluate(()=>({screen:tankz.ui.screen,view:tankz.game.showroomView,inert:document.querySelector('#ui').inert})),{screen:'garage',view:1,inert:false});
 assert.equal(await page.locator('[data-action="deploy"]').count(),0);
 await page.locator('[data-action="menu"]').click();
 assert.equal(await page.evaluate(()=>tankz.ui.screen),'menu');
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();await page.waitForFunction(()=>tankz.game.mode==='playing');assert.deepEqual(errors,[]);
 console.log('Camera interpolation, UI fades, preserved scene, reverse navigation, reduced motion and deployment passed.');
}finally{await browser.close();}
