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
 const result=await page.evaluate(async()=>{
  const g=tankz.game;g.running=false;const a=g.audio,decoded=Object.entries(a.vehicleBuffers).map(([name,b])=>({name,duration:b.duration}));
  const types=[];
  for(const type of ['light','medium','heavy']){
   a.drive(0,true,type,18);a.drive(12,true,type,18);types.push({type:a.driveType,loops:a.driveLoops.length});a.cannon(0,type);
  }
  for(let i=0;i<10;i++)a.cannon(10,'heavy');
  const capped=a.vehicleVoices.size;a.drive(0,false,'heavy');
  await new Promise(r=>setTimeout(r,900));
  return {decoded,types,capped,muted:a.driveLoops.every(l=>l.gain.gain.value<.001)};
 });
 assert.equal(result.decoded.length,16);assert.ok(result.decoded.every(b=>b.duration>0));assert.ok(result.types.every(t=>t.loops===5));assert.ok(result.capped<=6);assert.ok(result.muted);
 await page.waitForTimeout(6000);assert.equal(await page.evaluate(()=>tankz.game.audio.vehicleVoices.size),0);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
