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
 const count=await page.evaluate(async()=>{
  const g=tankz.game,{terrainHeight}=await import('/src/config.js');g.running=false;g.mode='paused';g.fx.clear();
  window.grenadier=g.soldiers.find(s=>s.weapon==='grenadier');if(!grenadier)throw Error('No grenadiers deployed');
  for(const s of g.soldiers){g.visibility.release(s);s.root.visible=false;s.visibilityOpacity=0;}
  const p=g.player.body.translation(),s=grenadier,x=p.x+6,z=p.z-10;
  s.body.setTranslation({x,y:terrainHeight(x,z)+.8,z},true);s.root.position.copy(s.body.translation());s.root.visible=true;s.visibilityOpacity=1;s.visibleToPlayer=true;
  s.ai.sees=true;s.ai.state='pursue';s.ai.lastKnown.copy(p);s.yaw=Math.atan2(p.x-x,p.z-z);s.root.rotation.y=s.yaw;s.aimTime=.15;s.secondary=0;g.infantry.pose(s);
  g.camera.position.set(x+3,s.root.position.y+2.2,z+3);g.camera.lookAt(x,s.root.position.y+.4,z);g.camera.updateMatrixWorld();g.presentation.render(0);
  return g.soldiers.filter(s=>s.weapon==='grenadier').length;
 });
 assert.ok(count>0);await page.screenshot({path:'test-artifacts/grenadier-windup.png'});
 const flight=await page.evaluate(()=>{
  const g=tankz.game,s=grenadier;g.fire(s,false);const grenade=g.shells.find(p=>p.grenade),startY=grenade.body.translation().y;
  g.visibility.pointVisible=()=>true;
  for(let i=0;i<18;i++){g.world.step();g.updateProjectiles(1/60);}
  const p=s.body.translation();g.camera.position.set(p.x+6,p.y+6,p.z+8);g.camera.lookAt(grenade.mesh.position);g.camera.updateMatrixWorld();g.presentation.render(0);
  return {alive:!grenade.dead,rise:grenade.body.translation().y-startY,cooldown:s.secondary};
 });
 assert.ok(flight.alive&&flight.rise>0&&flight.cooldown<2);await page.screenshot({path:'test-artifacts/grenadier-flight.png'});
 const ended=await page.evaluate(()=>{const g=tankz.game;for(let i=0;i<90;i++){g.world.step();g.updateProjectiles(1/60);g.fx.update(1/60);}g.fx.prepare(g.camera);g.presentation.render(0);return !g.shells.some(p=>p.grenade);});
 assert.ok(ended);assert.deepEqual(errors,[]);console.log(JSON.stringify({grenadiers:count,flight,fuseCleanup:ended}));
}finally{await browser.close();}
