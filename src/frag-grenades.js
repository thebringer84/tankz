import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {FRAG_GRENADE,GRAVITY,FIXED_DT,clamp} from './config.js';
import {ProjectilePool} from './projectile-pool.js';

export function throwGrenade(g,s){
 if(g.deploymentIntro||s.dead||s.wounded||s.burning||s.secondary>0||!s.ai.sees)return false;
 const target=s.ai.lastKnown,position=s.body.translation(),range=Math.hypot(target.x-position.x,target.z-position.z);
 if(range<FRAG_GRENADE.minRange||range>FRAG_GRENADE.range)return false;
 s.aimTime=FRAG_GRENADE.windup;g.infantry.pose(s);
 const {p}=g.muzzle(s),flight=clamp(range/18,.55,1.3);
 // Ballistic lob to the last visible target position, with the same discrete
 // gravity correction used by the cannon. The remaining fuse permits bouncing.
 const velocity=new THREE.Vector3().copy(target).sub(p).divideScalar(flight);
 velocity.y-=GRAVITY*(flight+FIXED_DT)/2;
 const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setLinvel(velocity.x,velocity.y,velocity.z).setAngvel({x:5,y:2,z:3}).setCcdEnabled(true));
 const collider=g.world.createCollider(RAPIER.ColliderDesc.ball(.12).setMass(.4).setRestitution(.35).setFriction(.7).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
 const mesh=(g.projectilePool??=new ProjectilePool(g.root)).acquire(FRAG_GRENADE,'frag-grenade',false,false);mesh.position.copy(p);mesh.visible=s.visibleToPlayer!==false;
 const shell={id:`projectile-${g.nextId++}`,projectile:true,grenade:true,body,collider,mesh,owner:s,ammo:FRAG_GRENADE,damage:FRAG_GRENADE.damage,life:0,secondary:false,dead:false,previous:p.clone(),incomingVelocity:velocity.clone(),bounces:0};
 g.shells.push(shell);g.entities.set(collider.handle,shell);s.secondary=FRAG_GRENADE.reload;s.aimTime=0;s.shots=(s.shots||0)+1;g.awareness?.attack(g.time);g.audio.grenadePin?.(p.distanceTo(g.player.root.position));
 return true;
}
