import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:900,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Exercise the actual loading DOM/CSS without compiling the entire 3D garage.
 await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:''}));
 await page.goto('http://localhost:5173');await page.addStyleTag({url:'http://localhost:5173/src/style.css'});
 await page.evaluate(async()=>{
  const {LoadingScreen}=await import('/src/loading.js');window.revealScreen=new LoadingScreen();
  window.revealGame={keys:new Set(['Space']),clock:{getDelta(){}},acc:1,loading:true,firing:true,altFire:true};
  document.querySelector('#world').style.background='#365d45';
 });
 for(const reducedMotion of ['no-preference','reduce']){
  await page.emulateMedia({reducedMotion});
  await page.evaluate(()=>{revealScreen.show('PREPARING THE BATTLEFIELD');window.revealDone=false;revealScreen.revealDeployment(revealGame).then(()=>{window.revealDone=true;});});
  const start=await page.evaluate(()=>({intro:revealGame.deploymentIntro,loading:revealGame.loading,inert:document.querySelector('#ui').inert,color:getComputedStyle(document.querySelector('#loading')).backgroundColor,content:getComputedStyle(document.querySelector('.loading-content')).visibility}));
  assert.deepEqual(start,{intro:true,loading:false,inert:true,color:'rgb(0, 0, 0)',content:'hidden'});
  if(reducedMotion==='no-preference'){
   await page.waitForFunction(()=>document.querySelector('#loading').getAnimations().some(a=>a.playState==='running'));
   assert.equal(await page.evaluate(()=>revealGame.deploymentIntro),true);
   await page.screenshot({path:'/tmp/tankz-deployment-reveal.png'});
  }
  await page.waitForFunction(()=>window.revealDone);
  const end=await page.evaluate(()=>({intro:revealGame.deploymentIntro,inert:document.querySelector('#ui').inert,hidden:document.querySelector('#loading').hidden,keys:revealGame.keys.size,firing:revealGame.firing,animations:document.querySelector('#loading').getAnimations().length}));
  assert.deepEqual(end,{intro:false,inert:false,hidden:true,keys:0,firing:false,animations:0});
 }
 assert.deepEqual(errors,[]);console.log('Black hold, animated reveal, reduced motion and input cleanup passed.');
}finally{await browser.close();}
