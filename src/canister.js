import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {AMMO} from './config.js';
export function canisterDirections(forward,phase=0){
 const a=AMMO.canister,rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),forward);
 return Array.from({length:a.pellets},(_,i)=>{
  const radius=i===0?0:Math.sqrt(i/(a.pellets-1))*Math.tan(a.spread),angle=i*2.3999632297+phase;
  return new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,1).normalize().applyQuaternion(rotation);
 });
}
export function fireCanister(game,t,p,dir){
 const a=AMMO.canister,hits=new Map();
 for(const direction of canisterDirections(dir,game.rand()*Math.PI*2)){
  const hit=game.world.castRay(new RAPIER.Ray(p,direction),a.range,true,undefined,undefined,undefined,t.body,c=>!game.entities.get(c.handle)?.projectile);
  const distance=hit?.timeOfImpact??a.range,end=p.clone().addScaledVector(direction,distance);
  game.fx.canisterPellet?.(p,end);
  if(!hit)continue;
  const target=game.entities.get(hit.collider.handle);if(!target||target.dead||target===t)continue;
  const falloff=Math.max(0,1-distance/a.range),amount=a.damage*falloff*(target.infantry?1:target.cfg?.06:.2);
  const entry=hits.get(target)||{damage:0,point:end,direction};entry.damage+=amount;hits.set(target,entry);
 }
 // Resolve after tracing the volley: a lethal pellet must not remove cover for
 // later pellets from the same shot or turn one shot into repeated kill events.
 for(const [target,hit] of hits){
  if(target.infantry)game.fx.blood?.(hit.point,hit.direction,.6);
  game.hurt(target,hit.damage,t,{impulse:hit.direction.clone().multiplyScalar(3).setY(1),dismember:false});
 }
 t.shots=(t.shots||0)+1;t.reload=t.cfg.reload;
 game.fx.cannon(p,dir,t.root.position,t.cfg.scale,t.muzzlePoint);
 t.body.applyImpulse(dir.clone().multiplyScalar(-t.cfg.mass*.35),true);
 if(game.audio.cannon)game.audio.cannon(0,t.type);else game.audio.boom(.5);game.shake=Math.max(game.shake,.15);
 return hits;
}
