import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game?.running);await page.waitForTimeout(300);
 const result=await page.evaluate(()=>{const g=tankz.game,p=g.presentation;g.running=false;const gl=g.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const capture=enabled=>{p.ao.enabled=enabled;p.render(0);const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};const off=capture(false),on=capture(true);let darkened=0,delta=0;for(let i=0;i<on.length;i+=4){const difference=off[i]+off[i+1]+off[i+2]-on[i]-on[i+1]-on[i+2];if(difference>3)darkened++;delta+=difference;}p.resize('low');p.render(0);const low={samples:p.ao.gtaoMaterial.defines.SAMPLES,width:p.ao.width};p.resize('high');p.render(0);return {darkened,delta,low,high:{samples:p.ao.gtaoMaterial.defines.SAMPLES,width:p.ao.width}};});
 assert.ok(result.darkened>500,JSON.stringify(result));assert.ok(result.delta>0);assert.equal(result.low.samples,8);assert.equal(result.high.samples,16);assert.ok(result.low.width<result.high.width);
 await page.screenshot({path:'test-artifacts/ambient-occlusion.png'});assert.deepEqual(errors,[]);console.log('AO browser passed: contact darkening, denoised rendering and both quality settings.',result);
}finally{await browser.close();}
