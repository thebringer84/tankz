import RAPIER from '@dimforge/rapier3d-compat';
import {worldFixture,freeWorld} from '../tests/world-fixture.js';
import {terrainHeight} from '../src/config.js';

// Isolate infantry thinking, movement, animation and physics under a mass alert.
// Rendering, perception updates and projectile creation are deliberately excluded.
// Population here is independent of the interactive game's deployment setting.
await RAPIER.init();
const g=await worldFixture(),count=1500;
try{
 for(let i=0;g.soldiers.length<count&&i<count*4;i++)g.infantry.spawn((i%50-25)*8,(Math.floor(i/50)%50-25)*8);
 if(g.soldiers.length!==count)throw Error(`Only spawned ${g.soldiers.length} soldiers`);
 const player=g.player.body.translation();
 for(const [i,s] of g.soldiers.entries()){
  const x=player.x+(i%50-25)*1.1,z=player.z-12-Math.floor(i/50)*1.1;
  s.body.setTranslation({x,y:terrainHeight(x,z)+.8,z},true);
  s.ai.engaged=true;s.ai.sees=true;s.ai.state='pursue';s.ai.lastKnown.copy(player);
  s.visibleToPlayer=true;s.weapon='mg';
 }
 g.world.step();g.fire=()=>{};
 let decisions=0,queries=0,moves=0;
 const wrap=(object,key,record)=>{const fn=object[key].bind(object);object[key]=(...args)=>{record();return fn(...args);};};
 wrap(g.infantry,'decide',()=>decisions++);
 wrap(g.infantry.movement,'move',()=>moves++);
 wrap(g.infantry.controller,'computeColliderMovement',()=>queries++);
 const frames=[];let maxDecisions=0,ticks=0;
 for(let frame=0;frame<120;frame++){
  const before=decisions,start=performance.now();g.infantry.beginFrame();
  // Include catch-up frames to exercise the shared render-frame budget.
  for(let i=0;i<(frame%5===0?2:1);i++){g.time+=1/60;g.infantry.update(1/60);g.world.step();ticks++;}
  g.infantry.endFrame();frames.push(performance.now()-start);maxDecisions=Math.max(maxDecisions,decisions-before);
 }
 frames.sort((a,b)=>a-b);
 console.log(JSON.stringify({infantry:g.soldiers.length,frames:frames.length,ticks,maxDecisionsPerFrame:maxDecisions,decisionsPerTick:decisions/ticks,controllerQueriesPerTick:queries/ticks,movesPerTick:moves/ticks,sharedRoutes:g.infantry.sharedRoutes?{hits:g.infantry.sharedRoutes.hits,searches:g.infantry.sharedRoutes.searches}:null,medianCpuMs:frames[60],p95CpuMs:frames[114]},null,2));
}finally{freeWorld(g);}
