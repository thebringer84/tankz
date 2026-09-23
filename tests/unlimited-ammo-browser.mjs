import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('tankz-profile',JSON.stringify({credits:0,he:0,canister:50})));
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running);
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});
 assert.equal(await page.locator('#ammo-canister').count(),0);assert.equal(await page.locator('#rounds-ap').textContent(),'∞');assert.equal(await page.locator('#rounds-he').textContent(),'∞');
 await page.keyboard.press('Digit2');assert.equal(await page.evaluate(()=>tankz.game.ammo),'he');
 const result=await page.evaluate(()=>{const g=tankz.game;g.running=false;const credits=g.credits;for(let i=0;i<5;i++)g.fire(g.player,false);return {ammo:g.ammo,shots:g.shells.filter(s=>s.owner===g.player).length,creditsUnchanged:g.credits===credits};});
 assert.equal(result.ammo,'he');assert.ok(result.shots>=5);assert.ok(result.creditsUnchanged);
 await page.keyboard.press('Digit1');assert.equal(await page.evaluate(()=>tankz.game.ammo),'ap');await page.keyboard.press('Digit3');assert.equal(await page.evaluate(()=>tankz.game.ammo),'ap');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
