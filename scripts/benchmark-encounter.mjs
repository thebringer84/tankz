// CPU-only first-contact comparison with one ten-person squad in the real world.
// Diagnostic variants intentionally disable individual systems; they are not game settings.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from '../src/config.js';
import {worldFixture,freeWorld} from '../tests/world-fixture.js';
await RAPIER.init();
for(const variant of ['passive','combat','noCover','noFire']){
 const g=await worldFixture();
 try{
  const squad=new Set(g.infantry.squads[0].members),leader=[...squad][0].body.translation();
  g.player.body.setTranslation({x:leader.x,y:terrainHeight(leader.x,leader.z+20)+1.2,z:leader.z+20},true);g.player.hp=1e9;g.syncTank(g.player);g.updateCamera(10);g.world.step();
  const sight=g.visibility.canSee.bind(g.visibility);g.visibility.canSee=(observer,target,...rest)=>target===g.player?variant!=='passive'&&squad.has(observer):sight(observer,target,...rest);
  if(variant==='noCover')g.infantry.coverSearch=function*(){return null;};
  if(variant==='noFire'){const fire=g.fire.bind(g);g.fire=(t,secondary)=>{if(squad.has(t)){t.secondary=t.weapon==='rpg'?4.8:.11;return;}return fire(t,secondary);};}
  const totals={},counts={},peak={},frames=[];
  for(const [object,key,label]of [[g.infantry,'update','infantry'],[g.infantry,'plan','planning'],[g.infantry.navigation,'route','pathSearch'],[g.infantry.controller,'computeColliderMovement','movement'],[g,'fire','fire'],[g.world,'step','physics'],[g.visibility,'update','visibility'],[g.infantry.movement,'prepare','hazards']]){
   const original=object[key];object[key]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{const elapsed=performance.now()-start;totals[label]=(totals[label]||0)+elapsed;counts[label]=(counts[label]||0)+1;peak[label]=Math.max(peak[label]||0,elapsed);}};
  }
  let maxShells=0;
  for(let i=0;i<360;i++){const start=performance.now();g.infantry.beginFrame();g.step(1/60);g.infantry.endFrame();g.fx.update(1/60,false);frames.push(performance.now()-start);maxShells=Math.max(maxShells,g.shells.length);}
  frames.sort((a,b)=>a-b);
  console.log(JSON.stringify({variant,squad:squad.size,maxShells,medianMs:frames[180],p95Ms:frames[342],stages:Object.fromEntries(Object.entries(totals).map(([name,ms])=>[name,{meanMsPerTick:ms/360,callsPerTick:counts[name]/360,maxCallMs:peak[name]}]))}));
 }finally{freeWorld(g);}
}
