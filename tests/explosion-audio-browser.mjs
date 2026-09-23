import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running);
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});
 const result=await page.evaluate(()=>{
  const g=tankz.game;g.running=false;const a=g.audio;
  const decoded=Object.entries(a.explosionBuffers).map(([name,b])=>{const d=b.getChannelData(0);let peak=0,first=-1;for(let i=0;i<d.length;i++){peak=Math.max(peak,Math.abs(d[i]));if(first<0&&Math.abs(d[i])>.01)first=i;}return {name,duration:b.duration,channels:b.numberOfChannels,peak,onset:first/b.sampleRate};});
  a.explosion(1,5);a.explosion(1.25,10,'jeep');a.explosion(1.45,10,'fuel');a.explosion(1,100);
  return {decoded,voices:[...a.explosionVoices].map(v=>v.key)};
 });
 assert.equal(result.decoded.length,6);assert.ok(result.decoded.every(b=>b.duration>0&&b.peak>0));
 assert.deepEqual(result.voices,['explosionLarge','fireball1','fireball2','explosionDistant']);
 await page.waitForTimeout(8500);
 assert.equal(await page.evaluate(()=>tankz.game.audio.explosionVoices.size),0);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
