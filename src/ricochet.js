import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export function deflectSmallArmsRound(game,shell,target,point,hitNormal){
 if(!shell.secondary||!target?.cfg||target.jeep||target.infantry||target.dead||(shell.bounces||0)>=2)return false;
 const incoming=new THREE.Vector3().copy(shell.incomingVelocity||shell.body.linvel()),speed=incoming.length();if(speed<25)return false;
 const direction=incoming.clone().normalize();let normal=hitNormal&&new THREE.Vector3().copy(hitNormal);
 if(!normal){const origin=shell.previous.clone().addScaledVector(direction,-.2),hit=target.collider.castRayAndGetNormal(new RAPIER.Ray(origin,direction),origin.distanceTo(point)+2,true);if(hit)normal=new THREE.Vector3().copy(hit.normal);}
 if(!normal||normal.lengthSq()<.5)return false;normal.normalize();if(direction.dot(normal)>0)normal.negate();
 // Small-arms rounds glance off oblique armor, losing energy on each bounce.
 if(-direction.dot(normal)>.72)return false;
 const reflected=incoming.reflect(normal).multiplyScalar(.58),position=point.clone().addScaledVector(normal,.15);
 shell.body.setTranslation(position,true);shell.body.setLinvel(reflected,true);shell.previous.copy(position);shell.incomingVelocity=reflected.clone();shell.mesh.position.copy(position);shell.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),reflected.clone().normalize());shell.bounces=(shell.bounces||0)+1;shell.ignoreCollider=target.collider.handle;shell.ignoreUntil=shell.life+.06;shell.damage*=.4;
 game.hurt(target,shell.damage*.15,shell.owner);if(game.fx.ricochet)game.fx.ricochet(point,normal,reflected);else game.fx.muzzle(point,normal);return true;
}
