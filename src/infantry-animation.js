import {animateWeapon} from './infantry-weapons.js';
import * as THREE from 'three';
const axis=new THREE.Vector3(1,0,0);
export function animateInfantry(s,dt,pose=true){
 s.poseDirty=!pose;const part=s.crew.byName??=new Map(s.crew.parts.map(p=>[p.name,p.mesh]));
 if(s.wounded){s.crawlPhase=(s.crawlPhase||0)+dt*(s.crawlRate??4.5);s.locomotion='crawl';s.crew.root.position.y=-.08;s.crew.root.rotation.set(Math.PI/2,0,Math.sin(s.crawlPhase)*.035);for(const side of [-1,1]){const suffix=side<0?'L':'R',phase=s.crawlPhase+(side<0?0:Math.PI),upper=part.get('upperArm'+suffix),fore=part.get('forearm'+suffix);if(upper){upper.rotation.set(Math.sin(phase)*.4,0,side*.25);upper.position.set(side*.28,.82,0);}if(fore){fore.rotation.set(Math.sin(phase)*.5-.7,0,side*.15);fore.position.set(side*.30,.91+Math.sin(phase)*.13,-.13);}const leg=part.get('thigh'+suffix);if(leg)leg.rotation.set(Math.sin(phase)*.14,0,0);}return;}

 const rig=s.gait??={phase:0,weight:0,run:0,bind:new Map(s.crew.parts.map(p=>[p.name,p.mesh.position.clone()])),rootY:s.crew.root.position.y};
 const speed=Math.abs(s.speed||0),blend=1-Math.exp(-12*dt);rig.weight+=(Math.min(1,speed/.8)-rig.weight)*blend;rig.run+=(THREE.MathUtils.smoothstep(speed,2.4,3.6)-rig.run)*blend;rig.phase+=Math.min(14,speed*4.6)*dt;
 const scratch=rig.scratch??={hip:new THREE.Vector3(),knee:new THREE.Vector3(),qHip:new THREE.Quaternion(),qKnee:new THREE.Quaternion(),kneeWorld:new THREE.Vector3()};
 const stride=(.48+rig.run*.3)*rig.weight;s.locomotion=rig.weight<.05?'idle':rig.run>.5?'run':'walk';
 if(!pose){animateWeapon(s,dt,false);return;}
 s.crew.root.position.y=rig.rootY+Math.abs(Math.sin(rig.phase))*rig.weight*(.025+rig.run*.035);s.crew.root.rotation.set(rig.run*rig.weight*.09,0,0);
 for(const side of [-1,1]){const suffix=side<0?'L':'R',phase=rig.phase+(side<0?0:Math.PI),hip=scratch.hip.set(side*.11,.36,.015),knee=scratch.knee.set(side*.11,.03,0),swing=Math.sin(phase)*stride,bend=Math.max(0,-Math.cos(phase))*(.5+rig.run*.65)*rig.weight;
  const qHip=scratch.qHip.setFromAxisAngle(axis,swing),qKnee=scratch.qKnee.setFromAxisAngle(axis,-bend),thigh=part.get('thigh'+suffix),shin=part.get('shin'+suffix);
  thigh.position.copy(rig.bind.get('thigh'+suffix)).sub(hip).applyQuaternion(qHip).add(hip);thigh.quaternion.copy(qHip);
  shin.position.copy(rig.bind.get('shin'+suffix)).sub(knee).applyQuaternion(qKnee).add(knee).sub(hip).applyQuaternion(qHip).add(hip);shin.quaternion.copy(qHip).multiply(qKnee);
  const kneeWorld=scratch.kneeWorld.copy(knee).sub(hip).applyQuaternion(qHip).add(hip),link=s.crew.links.find(l=>l[0]==='thigh'+suffix);kneeWorld.toArray(link[2]);
 }
 s.gun.position.y=.72+Math.sin(rig.phase*2)*rig.weight*.012;s.gun.rotation.z=Math.sin(rig.phase)*rig.weight*.035;animateWeapon(s,dt);
}
