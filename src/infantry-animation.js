import {animateWeapon} from './infantry-weapons.js';
import * as THREE from 'three';
const axis=new THREE.Vector3(1,0,0);
export function animateInfantry(s,dt){
 if(s.wounded){s.crawlPhase=(s.crawlPhase||0)+dt*4.5;s.locomotion='crawl';s.crew.root.position.y=-.08;s.crew.root.rotation.x=Math.PI/2;s.crew.root.rotation.z=Math.sin(s.crawlPhase)*.035;for(const side of [-1,1]){const suffix=side<0?'L':'R',phase=s.crawlPhase+(side<0?0:Math.PI),upper=s.crew.parts.find(p=>p.name==='upperArm'+suffix)?.mesh,fore=s.crew.parts.find(p=>p.name==='forearm'+suffix)?.mesh;if(upper){upper.rotation.set(Math.sin(phase)*.4,0,side*.25);upper.position.set(side*.28,.82,0);}if(fore){fore.rotation.set(Math.sin(phase)*.5-.7,0,side*.15);fore.position.set(side*.30,.91+Math.sin(phase)*.13,-.13);}const leg=s.crew.parts.find(p=>p.name==='thigh'+suffix)?.mesh;if(leg)leg.rotation.x=Math.sin(phase)*.14;}return;}

 const rig=s.gait??={phase:0,weight:0,run:0,bind:new Map(s.crew.parts.map(p=>[p.name,p.mesh.position.clone()])),rootY:s.crew.root.position.y};
 const speed=Math.abs(s.speed||0),blend=1-Math.exp(-12*dt);rig.weight+=(Math.min(1,speed/.8)-rig.weight)*blend;rig.run+=(THREE.MathUtils.smoothstep(speed,2.4,3.6)-rig.run)*blend;rig.phase+=Math.min(14,speed*4.6)*dt;
 const stride=(.48+rig.run*.3)*rig.weight;s.locomotion=rig.weight<.05?'idle':rig.run>.5?'run':'walk';
 s.crew.root.position.y=rig.rootY+Math.abs(Math.sin(rig.phase))*rig.weight*(.025+rig.run*.035);s.crew.root.rotation.x=rig.run*rig.weight*.09;
 for(const side of [-1,1]){const suffix=side<0?'L':'R',phase=rig.phase+(side<0?0:Math.PI),hip=new THREE.Vector3(side*.11,.36,.015),knee=new THREE.Vector3(side*.11,.03,0),swing=Math.sin(phase)*stride,bend=Math.max(0,-Math.cos(phase))*(.5+rig.run*.65)*rig.weight;
  const qHip=new THREE.Quaternion().setFromAxisAngle(axis,swing),qKnee=new THREE.Quaternion().setFromAxisAngle(axis,-bend),thigh=s.crew.parts.find(p=>p.name==='thigh'+suffix).mesh,shin=s.crew.parts.find(p=>p.name==='shin'+suffix).mesh;
  thigh.position.copy(rig.bind.get('thigh'+suffix)).sub(hip).applyQuaternion(qHip).add(hip);thigh.quaternion.copy(qHip);
  shin.position.copy(rig.bind.get('shin'+suffix)).sub(knee).applyQuaternion(qKnee).add(knee).sub(hip).applyQuaternion(qHip).add(hip);shin.quaternion.copy(qHip).multiply(qKnee);
  const kneeWorld=knee.clone().sub(hip).applyQuaternion(qHip).add(hip),link=s.crew.links.find(l=>l[0]==='thigh'+suffix);link[2]=kneeWorld.toArray();
 }
 s.gun.position.y=.72+Math.sin(rig.phase*2)*rig.weight*.012;s.gun.rotation.z=Math.sin(rig.phase)*rig.weight*.035;animateWeapon(s,dt);
}
