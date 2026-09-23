import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.addInitScript(()=>localStorage.setItem('tankz-profile',JSON.stringify({credits:900,he:0,sabot:6})));
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running);
 await page.locator('[data-action="deploy"]').click();await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});
 assert.equal(await page.locator('#ammo-canister').count(),1);assert.equal(await page.locator('#ammo-sabot').count(),0);
 await page.keyboard.press('Digit3');
 const result=await page.evaluate(()=>{
  const g=tankz.game;g.running=false;const before=g.inventory.canister;if(g.ammo!=='canister')throw Error('Hotkey failed');
  g.fire(g.player,false);g.predict();g.fx.prepare(g.camera);g.presentation.render(0);
  return {before,after:g.inventory.canister,reload:g.player.reload,shells:g.shells.filter(s=>s.owner===g.player).length,range:g.prediction.distanceTo(g.muzzle(g.player).p)};
 });
 assert.equal(result.before,6);assert.equal(result.after,5);assert.ok(result.reload>0);assert.equal(result.shells,0);assert.ok(result.range<=38.21);
 await page.screenshot({path:'test-artifacts/canister-shot.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
