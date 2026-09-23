import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running);
 await page.locator('[data-action="deploy"]').click();await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});
 const result=await page.evaluate(()=>{
  const g=tankz.game;g.running=false;const a=g.audio;
  const decoded=Object.entries(a.infantryBuffers).map(([name,b])=>({name,duration:b.duration}));
  for(let i=0;i<7;i++)a.scream(10,i);for(let i=0;i<5;i++)a.grenadePin(10);
  a.explosion(.65,10,'grenade');a.explosion(.65,80,'grenade');
  return {decoded,cries:a.screamVoices,pins:a.pinVoices,explosions:[...a.explosionVoices].map(v=>v.key)};
 });
 assert.equal(result.decoded.length,9);assert.ok(result.decoded.every(b=>b.duration>0));assert.equal(result.cries,2);assert.equal(result.pins,3);assert.deepEqual(result.explosions,['explosionGrenade','explosionGrenadeDistant']);
 await page.waitForTimeout(6500);assert.deepEqual(await page.evaluate(()=>[tankz.game.audio.screamVoices,tankz.game.audio.pinVoices,tankz.game.audio.explosionVoices.size]),[0,0,0]);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
