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
 for(const [roll,variant] of [[.3,'skyward'],[.9,'crawl']]){
 const result=await page.evaluate(({roll,variant})=>{
  const g=tankz.game;g.running=false;g.mode='paused';g.fx.clear();for(const r of [...g.ragdolls.items])g.ragdolls.remove(r);
  const p=g.player.root.position,jeep=g.spawnTank('jeep',p.x+9,p.z-8,true);jeep.root.position.copy(jeep.body.translation());
  const rand=g.rand;let calls=0;g.rand=()=>calls++===0?roll:.5;g.hurt(jeep,999,g.player);g.rand=rand;
  window.deathJeep=jeep;window.deathCrew=[...g.ragdolls.items];
  for(let i=0;i<(variant==='crawl'?180:35);i++){g.world.step();g.ragdolls.update(1/60,null);g.fx.update(1/60);}
  const center=deathCrew[0].parts[0].body.translation();g.camera.position.set(center.x+8,center.y+7,center.z+10);g.camera.lookAt(center.x,center.y,center.z);g.camera.updateMatrixWorld();g.fx.prepare(g.camera);g.presentation.render(0);
  return {variant:jeep.deathVariant,crew:deathCrew.length,crawling:deathCrew.some(r=>r.crawl?.started)};
 },{roll,variant});
 assert.equal(result.variant,variant);assert.equal(result.crew,2);if(variant==='crawl')assert.ok(result.crawling);
 await page.screenshot({path:'test-artifacts/jeep-death-'+variant+'.png'});
 if(variant==='crawl')await page.evaluate(()=>{const g=tankz.game;for(let i=0;i<600;i++){g.world.step();g.ragdolls.update(1/60,null);}if(!deathCrew.some(r=>r.crawlExpired))throw Error('Crawler did not expire');});
 console.log(JSON.stringify(result));
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
