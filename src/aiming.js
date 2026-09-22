import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {AMMO,angleDelta,terrainHeight} from './config.js';

// Cursor distance never sets elevation/range. It supplies only an azimuth.
export function resolveDirectionalAim(game,cursor){
 const player=game.player,origin=new THREE.Vector3().copy(player.body.translation());
 const dx=cursor.x-origin.x,dz=cursor.z-origin.z;
 const bearing=Math.hypot(dx,dz)>.8?Math.atan2(dx,dz):(game.aimBearing??player.yaw);
 game.aimBearing=bearing;let chosen=null,best=Infinity;
 const muzzle=game.muzzle(player).p;
 for(const enemy of [...game.tanks,...(game.soldiers||[])]){
  if(!enemy.enemy||enemy.dead||(game.visibility&&!game.visibility.canSee(player,enemy)))continue;
  const position=new THREE.Vector3().copy(enemy.body.translation()),delta=position.clone().sub(origin),range=Math.hypot(delta.x,delta.z);
  if(range<3||range>100)continue;
  const error=Math.abs(angleDelta(bearing,Math.atan2(delta.x,delta.z)));
  if(error>(enemy===game.autoTarget?.entity? .14:.105))continue;
  const line=position.clone().sub(muzzle),length=line.length();
  const hit=game.world.castRay(new RAPIER.Ray(muzzle,line.normalize()),length,true,undefined,undefined,undefined,player.body,c=>!game.entities.get(c.handle)?.projectile);
  if(hit&&hit.collider.handle!==enemy.collider.handle)continue;
  const score=error*70+range*.014-(enemy === game.autoTarget?.entity ? .5 : 0);
  if(score<best){best=score;chosen={entity:enemy,position,range};}
 }
 if(chosen){
  // Automatic range includes modest target lead; acquisition still follows mouse bearing.
  const speed=AMMO[game.ammo||'ap'].speed,flight=chosen.range/speed;
  const point=chosen.position.clone().addScaledVector(new THREE.Vector3().copy(chosen.entity.body.linvel()),Math.min(flight,1.6));
  point.y=Math.max(point.y,terrainHeight(point.x,point.z)+.35);
  return {bearing,target:chosen,point};
 }
 const point=origin.clone().add(new THREE.Vector3(Math.sin(bearing)*55,0,Math.cos(bearing)*55));point.y=terrainHeight(point.x,point.z)+.12;
 return {bearing,target:null,point};
}
