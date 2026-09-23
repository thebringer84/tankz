import * as THREE from 'three';
import {animateInfantry} from './infantry-animation.js';
import {approachAngle} from './config.js';
export const BLAST_IGNITION_CHANCE=.08;
export function igniteInfantry(infantry,s){
 if(!s?.infantry||s.dead||s.burning)return false;
 const g=infantry.game;
 infantry.crowd.restore(s);
 s.burning={age:0,duration:3.5+g.rand()*2,variant:Math.floor(g.rand()*3),heading:g.rand()*Math.PI*2,turn:0,emit:0,scream:0};
 s.flameFiring=false;s.aimTime=0;s.cover=null;s.takingCover=false;s.path=[];s.gun.visible=false;
 infantry.routeJobs.delete(s);infantry.coverJobs.delete(s);infantry.decisions.pending.delete(s);
 return true;
}
export function poseBurning(s){
 const b=s.burning;if(!b)return;
 const fall=THREE.MathUtils.smoothstep(b.age,b.duration-.85,b.duration),parts=s.crew.byName;
 s.locomotion='burning';s.gun.visible=false;
 if(!s.wounded){
  s.crew.root.position.y-=fall*(b.variant===0?.55:.25);
  s.crew.root.rotation.x+=(b.variant===1?1.35:b.variant===2?-1.1:.45)*fall;
  for(const side of [-1,1]){
   const suffix=side<0?'L':'R',arm=parts.get('upperArm'+suffix),fore=parts.get('forearm'+suffix);
   arm.rotation.set(-1.5+Math.sin(b.age*13+side)*.5,0,side*(.55+fall*.3));
   fore.rotation.set(-.9+Math.sin(b.age*17+side)*.6,0,side*.2);
  }
 }
}
export function updateBurning(infantry,s,dt){
 const g=infantry.game,b=s.burning,p=new THREE.Vector3().copy(s.body.translation());b.age+=dt;
 if(b.age>=b.duration){
  const forward=new THREE.Vector3(Math.sin(s.yaw),0,Math.cos(s.yaw));
  const impulse=b.variant===0?new THREE.Vector3(0,-1,0):forward.multiplyScalar(b.variant===1?2.5:-2).setY(.3);
  s.hp=0;infantry.kill(s,impulse);return;
 }
 b.turn-=dt;if(b.turn<=0){b.heading+=(g.rand()-.5)*3.8;b.turn=.25+g.rand()*.55;}
 s.yaw=approachAngle(s.yaw,b.heading,dt*7);s.root.rotation.set(0,s.yaw,0);
 const speed=s.wounded?.35:b.age>b.duration-.85?.4:4.6;
 const motion=new THREE.Vector3(Math.sin(s.yaw)*speed,0,Math.cos(s.yaw)*speed);
 infantry.movement.tier(s,p,dt);infantry.movement.move(s,p,motion,dt,infantry.controller,infantry.navigation);
 animateInfantry(s,dt);poseBurning(s);
 b.emit-=dt;if(b.emit<=0){b.emit=.075;if(s.visibleToPlayer!==false)g.fx.burningInfantry?.(p,s.wounded);}
 b.scream-=dt;if(b.scream<=0){b.scream=1+g.rand()*.6;g.audio.scream?.(p.distanceTo(g.player.root.position),b.variant);}
}
