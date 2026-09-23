import * as THREE from 'three';

export const JEEP_DEATH_VARIANTS=['tumble','skyward','scatter','crawl'];
export function ejectJeepCrew(game,jeep){
 const roll=game.rand();
 const variant=roll<.25?'tumble':roll<.45?'skyward':roll<.65?'scatter':'crawl';
 jeep.deathVariant=variant;jeep.root.updateWorldMatrix(true,true);
 const crawler=game.rand()<.5?0:1;
 jeep.crew.forEach((crew,i)=>{
  const side=i===0?-1:1,angle=jeep.yaw||0;
  let lateral=4+game.rand()*3,lift=6+game.rand()*3,forward=(game.rand()-.5)*6;
  if(variant==='skyward'){lateral=5+game.rand()*7;lift=22+game.rand()*9;forward=(game.rand()-.5)*14;}
  if(variant==='scatter'){lateral=14+game.rand()*8;lift=8+game.rand()*6;forward=(game.rand()-.5)*12;}
  const crawling=variant==='crawl'&&i===crawler;
  if(crawling){lateral=4;lift=3;forward=0;}
  // Keep launch height in world space even when the jeep is rolling over.
  const launch=new THREE.Vector3(side*lateral,0,forward).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
  launch.y=lift;launch.add(new THREE.Vector3().copy(jeep.body.linvel()).multiplyScalar(.35));
  if(i===crawler)game.audio?.scream?.(jeep.root.position.distanceTo(game.player?.root.position||jeep.root.position),i,'pain');const item=game.ragdolls.eject(crew,launch);item.jeepDeath=variant;
  if(crawling)item.crawl={heading:angle+side*Math.PI/2,phase:game.rand()*Math.PI*2,remaining:5+game.rand()*3,started:false,bleed:0};
 });
 return variant;
}
