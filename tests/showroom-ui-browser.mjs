import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],fontResponses=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('response',response=>{if(response.url().includes('tankz-sans.ttf')||response.url().includes('tankz-mono.ttf'))fontResponses.push(response.status());});
try{
 await page.goto(process.env.TANKZ_URL||'http://localhost:5174');
 await page.waitForFunction(()=>window.tankz?.game?.running,{timeout:120000});
 await page.evaluate(async()=>{await document.fonts.ready;});
 const menu=await page.evaluate(()=>{
  const g=tankz.game,caption=document.querySelector('.vehicle-caption').getBoundingClientRect();
  return {text:document.querySelector('#ui').textContent,captionRight:innerWidth-caption.right,captionBottom:innerHeight-caption.bottom,fonts:[...document.fonts].filter(face=>face.family==='Tankz Sans'||face.family==='Tankz Mono').map(face=>[face.family,face.status]),turntable:!!g.showroom.getObjectByName('vehicle-turntable')};
 });
 assert.match(menu.text,/ARMORED OPERATIONS/);assert.match(menu.text,/ARMORED COMBAT/);
 assert.doesNotMatch(menu.text,/HEAVY METAL|LOOSE SAND|LOCAL SKIRMISH|FIELD TEST|OPERATION: DUSTLINE|DESERT COMBAT/i);
 assert.equal(await page.locator('#loading .loading-kicker').count(),0);
 assert.ok(menu.captionRight<=50&&menu.captionBottom<=50);assert.ok(menu.turntable);
 assert.ok(menu.fonts.some(([family,status])=>family==='Tankz Sans'&&status==='loaded'));
 assert.ok(fontResponses.includes(200));
 await page.screenshot({path:'test-artifacts/showroom-menu.png'});
 const first=await page.evaluate(()=>({deck:tankz.game.showroom.userData.turntable.rotation.y,tank:tankz.game.player.root.rotation.y}));
 await page.waitForTimeout(800);
 const second=await page.evaluate(()=>({deck:tankz.game.showroom.userData.turntable.rotation.y,tank:tankz.game.player.root.rotation.y}));
 assert.ok(second.deck>first.deck);assert.ok(Math.abs((second.tank-first.tank)-(second.deck-first.deck))<1e-6);
 await page.locator('[data-action="garage"]').click();await page.waitForFunction(()=>!tankz.ui.transitioning&&!tankz.game.showroomTransition);
 assert.equal(await page.locator('.garage-footer').count(),0);assert.equal(await page.locator('[data-action="deploy"]').count(),0);
 await page.locator('[data-action="tank"][data-value="heavy"]').click();
 assert.equal(await page.evaluate(()=>tankz.game.player.type),'heavy');
 assert.ok(await page.evaluate(()=>Math.abs(tankz.game.player.root.rotation.y-Math.PI-tankz.game.showroom.userData.turntable.rotation.y)<1e-6));
 await page.screenshot({path:'test-artifacts/showroom-garage.png'});
 await page.locator('[data-action="menu"]').click();await page.waitForFunction(()=>!tankz.ui.transitioning&&!tankz.game.showroomTransition);
 await page.locator('[data-action="settings"]').click();
 assert.equal(await page.getByRole('tab').count(),3);
 assert.equal(await page.getByRole('tab',{name:'GRAPHICS'}).getAttribute('aria-selected'),'true');
 assert.equal(await page.getByLabel('Render quality').count(),1);
 assert.equal(await page.getByRole('checkbox',{name:'Show FPS counter'}).isVisible(),true);
 await page.getByRole('tab',{name:'SOUND'}).click();
 assert.equal(await page.getByRole('slider',{name:'Music volume'}).isVisible(),true);
 assert.equal(await page.getByRole('checkbox',{name:'Show FPS counter'}).isVisible(),false);
 await page.getByRole('tab',{name:'CONTROLS'}).click();
 assert.equal(await page.locator('.controls-grid').isVisible(),true);
 assert.equal(await page.locator('.aim-help').count(),0);
 await page.screenshot({path:'test-artifacts/showroom-settings.png'});
 assert.deepEqual(errors,[]);
 console.log('Menu, garage, synchronized turntable, settings tabs, and bundled fonts passed.',{fonts:menu.fonts,fontResponses});
}finally{await browser.close();}
