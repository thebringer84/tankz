import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running);
 await page.locator('[data-action="deploy"]').click();
 await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});
 const before=await page.evaluate(async()=>{
  const g=tankz.game,{terrainHeight}=await import('/src/config.js'),{animateInfantry}=await import('/src/infantry-animation.js');
  g.running=false;g.mode='paused';g.fx.clear();
  for(const s of g.soldiers){g.visibility.release(s);s.root.visible=false;s.visibilityOpacity=0;}
  window.crowdDemo=g.soldiers.filter(s=>s.weapon==='mg').slice(0,64);
  for(const [i,s] of crowdDemo.entries()){
   const x=45+(i%8)*1.2,z=-10+Math.floor(i/8)*1.2;
   s.body.setTranslation({x,y:terrainHeight(x,z)+.8,z},true);s.root.position.copy(s.body.translation());s.yaw=.4;s.root.rotation.y=.4;
   s.root.visible=true;s.visibilityOpacity=1;s.speed=3.2;s.ai.sees=false;s.secondary=0;s.aimElevation=0;
   animateInfantry(s,.2+i*.01);g.infantry.pose(s);
  }
  g.camera.position.set(59,16,15);g.camera.lookAt(49,terrainHeight(49,-5),-5);g.camera.updateMatrixWorld();
  g.infantry.crowd.enabled=false;g.renderer.info.autoReset=false;g.renderer.info.reset();g.presentation.render(0);
  return {draws:g.renderer.info.render.calls};
 });
 await page.screenshot({path:'test-artifacts/infantry-crowd-detailed.png'});
 const after=await page.evaluate(async()=>{
  const g=tankz.game;g.infantry.crowd.enabled=true;g.infantry.crowd.prepare();
  await g.renderer.compileAsync(g.scene,g.camera);g.renderer.info.reset();g.presentation.render(0);
  return {draws:g.renderer.info.render.calls,count:g.infantry.crowd.mesh.count};
 });
 await page.screenshot({path:'test-artifacts/infantry-crowd-instanced.png'});
 assert.equal(after.count,64);assert.ok(after.draws<before.draws-100,JSON.stringify({before,after}));
 const transitions=await page.evaluate(()=>{
  const g=tankz.game,s=crowdDemo[0];s.visibilityOpacity=0;g.presentation.render(0);const hidden=g.infantry.crowd.mesh.count;
  s.visibilityOpacity=1;g.autoTarget=s;g.presentation.render(0);const detailed=!s.crowdBatched&&s.gun.visible;
  g.autoTarget=null;g.infantry.wound(s,'leg');g.infantry.kill(crowdDemo[1]);g.presentation.render(0);
  return {hidden,detailed,wounded:s.wounded,remaining:g.infantry.crowd.mesh.count,ragdolls:g.ragdolls.items.length};
 });
 assert.equal(transitions.hidden,63);assert.ok(transitions.detailed&&transitions.wounded);assert.equal(transitions.remaining,62);assert.ok(transitions.ragdolls>0);
 const resized=await page.evaluate(()=>{
  const g=tankz.game,before=g.soldiers.length;
  for(let i=0;i<32;i++){
   const s=g.infantry.spawn(160+(i%8)*3,160+Math.floor(i/8)*3);if(!s)continue;
   s.visibilityOpacity=1;s.root.visible=true;
  }
  g.presentation.render(0);
  return {added:g.soldiers.length-before,capacity:g.infantry.crowd.capacity,count:g.infantry.crowd.mesh.count};
 });
 assert.ok(resized.added>12);assert.ok(resized.capacity>=1024);assert.equal(resized.count,62+resized.added);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({before,after,transitions}));
}finally{await browser.close();}
