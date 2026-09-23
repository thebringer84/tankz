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
 const result=await page.evaluate(async()=>{
  const g=tankz.game;g.running=false;g.mode='paused';g.fx.clear();
  const troops=g.soldiers.filter(s=>s.weapon==='mg').slice(0,3),base=g.player.root.position.clone();base.x+=7;base.z-=6;
  for(const [i,s] of troops.entries()){
   g.visibility.release(s);s.visibleToPlayer=true;s.visibilityOpacity=1;s.root.visible=true;
   const x=base.x+i*2,z=base.z;s.body.setTranslation({x,y:g.environment.surfaceHeight(x,z)+.8,z},true);s.root.position.copy(s.body.translation());
   g.infantry.ignite(s);s.burning.variant=i;
  }
  for(let i=0;i<30;i++){g.infantry.update(1/60);g.world.step();g.infantry.sync();g.fx.update(1/60);}
  const p=troops[1].root.position;g.camera.position.set(p.x+5,p.y+4,p.z+6);g.camera.lookAt(p.x,p.y+.3,p.z);g.camera.updateMatrixWorld();g.fx.prepare(g.camera);g.presentation.render(0);
  window.burningTroops=troops;
  return {burning:troops.every(s=>s.burning&&!s.dead),hiddenGuns:troops.every(s=>!s.gun.visible),voices:g.audio.screamVoices,particles:g.fx.particles.length};
 });
 assert.ok(result.burning&&result.hiddenGuns&&result.particles>0);assert.ok(result.voices<=4);
 await page.screenshot({path:'test-artifacts/burning-infantry.png'});
 const finished=await page.evaluate(()=>{const g=tankz.game;for(const s of burningTroops)s.burning.age=s.burning.duration-.5;g.infantry.update(1/60);g.world.step();g.infantry.sync();g.fx.prepare(g.camera);g.presentation.render(0);return burningTroops.map(s=>s.crew.root.rotation.x);});
 assert.equal(new Set(finished).size,3);await page.screenshot({path:'test-artifacts/burning-finishes.png'});
 await page.evaluate(()=>{const g=tankz.game;for(let i=0;i<40;i++){g.infantry.update(1/60);g.world.step();}if(!burningTroops.every(s=>s.dead))throw Error('Burning troops did not expire');});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result,finished,errors}));
}finally{await browser.close();}
