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
  const g=tankz.game;g.running=false;const a=g.audio;
  const decoded=['bodyImpact','bodyCrush'].map(name=>{const b=a.infantryBuffers[name],data=b.getChannelData(0);return {name,duration:b.duration,peak:data.reduce((max,v)=>Math.max(max,Math.abs(v)),0)};});
  g.ragdolls.onBodyImpact(g.player.root.position,true);await new Promise(r=>setTimeout(r,350));g.ragdolls.onBodyImpact(g.player.root.position,false);
  return {decoded,voices:a.bodyVoices};
 });
 assert.ok(result.decoded.every(b=>b.duration>0&&b.peak>0));assert.equal(result.voices,2);
 await page.waitForTimeout(1600);assert.equal(await page.evaluate(()=>tankz.game.audio.bodyVoices),0);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
