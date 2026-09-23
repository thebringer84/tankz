import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:5173');
 await page.waitForFunction(()=>window.tankz?.game.running,null,{timeout:120000});
 await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();
 await page.waitForFunction(()=>!tankz.game.loading&&!tankz.game.deploymentIntro&&tankz.game.mode==='playing',null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=tankz.game,{SPLAT_TYPES}=await import('/src/splat-atlas.js');
  g.running=false;g.mode='paused';g.fx.clear();
  const x=-95,z=20;
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const p=g.player.root.position.clone().set(x+col*4,0,z+row*4);
   if(row===3)g.fx.scorch(p,4);
   else g.fx.smear(p,0,row===1?1.5:2.6,SPLAT_TYPES[row]);
  }
  g.camera.position.set(x+6,28,z+6.01);g.camera.lookAt(x+6,0,z+6);g.camera.updateMatrixWorld();
  g.fx.prepare(g.camera);g.presentation.render(0);
  return {blood:Array.from(g.fx.smears.geometry.getAttribute('aSplat').array.slice(0,12)),scorch:Array.from(g.fx.scorches.geometry.getAttribute('aSplat').array.slice(0,4)),atlas:g.textures.splats.image.width};
 });
 assert.equal(result.atlas,2048);assert.equal(new Set([...result.blood,...result.scorch]).size,16);
 await page.screenshot({path:'test-artifacts/splat-variations.png'});
 const caps=await page.evaluate(()=>{
  const fx=tankz.game.fx,p=tankz.game.player.root.position;
  for(let i=0;i<220;i++){fx.smear(p,0);fx.scorch(p,1);}
  const counts=[fx.smears.count,fx.scorches.count];fx.clear();return {counts,cleared:fx.smears.count+fx.scorches.count};
 });
 assert.deepEqual(caps,{counts:[192,100],cleared:0});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result,caps,errors}));
}finally{await browser.close();}
