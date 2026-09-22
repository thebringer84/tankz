import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight,seededRandom} from './config.js';

export class Ragdolls {
 constructor(world,scene,fx){this.world=world;this.scene=scene;this.fx=fx;this.items=[];this.max=24;this.rand=seededRandom(7291);this.lastPattern=-1;}
 eject(crew,velocity,runOver=null){
  if(this.items.length>=this.max)this.remove(this.items[0]);
  crew.root.updateWorldMatrix(true,true);
  const anchors=crew.links.map(([a,b,position])=>({a,b,world:crew.root.localToWorld(new THREE.Vector3(...position))}));
  const item={parts:[],joints:[],links:[],age:0,crushed:false,runOver};const byName=new Map();
  for(const source of crew.parts){
   const mesh=source.mesh,position=mesh.getWorldPosition(new THREE.Vector3()),rotation=mesh.getWorldQuaternion(new THREE.Quaternion()),scale=mesh.getWorldScale(new THREE.Vector3());
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x,position.y,position.z).setRotation(rotation).setLinvel(velocity.x,velocity.y,velocity.z).setAngvel({x:velocity.z*.4,y:2,z:-velocity.x*.35}).setLinearDamping(.22).setAngularDamping(.8).setCcdEnabled(true));
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(scale.x*.5,scale.y*.5,scale.z*.5).setMass(source.mass).setFriction(.85).setRestitution(.05).setCollisionGroups(runOver?0x0004fff9:0x0004fffb),body);
   this.scene.attach(mesh);const part={name:source.name,mesh,body};item.parts.push(part);byName.set(source.name,part);
  }
  for(const link of anchors){const a=byName.get(link.a),b=byName.get(link.b);const local=(part)=>link.world.clone().sub(part.body.translation()).applyQuaternion(new THREE.Quaternion().copy(part.body.rotation()).invert());const joint=this.world.createImpulseJoint(RAPIER.JointData.spherical(local(a),local(b)),a.body,b.body,true);joint.setContactsEnabled(false);item.joints.push(joint);item.links.push({joint,a:link.a,b:link.b});}
  crew.root.visible=false;this.items.push(item);return item;
 }
 remove(item){for(const part of item.parts){this.world.removeRigidBody(part.body);part.mesh.removeFromParent();}const index=this.items.indexOf(item);if(index>=0)this.items.splice(index,1);}
 dismember(item,yaw,scale,launch=new THREE.Vector3()){
  const torso=item.parts[0].body.translation();this.fx.smear(new THREE.Vector3(torso.x,terrainHeight(torso.x,torso.z),torso.z),yaw,scale);
  const patterns=[
   [['torso','pelvis'],['head'],['upperArmL','forearmL'],['upperArmR','forearmR'],['thighL','shinL'],['thighR','shinR']],
   [['torso','head'],['pelvis','thighL','shinL'],['upperArmL'],['forearmL'],['upperArmR','forearmR'],['thighR'],['shinR']],
   [['torso','upperArmR'],['pelvis'],['head'],['upperArmL','forearmL'],['forearmR'],['thighL'],['shinL'],['thighR','shinR']],
   [['torso','pelvis','thighR'],['head'],['upperArmL'],['forearmL'],['upperArmR'],['forearmR'],['thighL','shinL'],['shinR']]
  ];
  const pattern=(this.lastPattern+1+Math.floor(this.rand()*(patterns.length-1)))%patterns.length;this.lastPattern=pattern;const groups=patterns[pattern].map(names=>names.filter(name=>item.parts.some(p=>p.name===name))).filter(names=>names.length);
  this.fx.bloodBurst?.(new THREE.Vector3().copy(torso),launch,scale);
  for(const link of item.links||[])if(!groups.some(names=>names.includes(link.a)&&names.includes(link.b)))this.world.removeImpulseJoint(link.joint,true);
  this.items.splice(this.items.indexOf(item),1);item.crushed=true;
  groups.forEach((names,index)=>{const parts=item.parts.filter(p=>names.includes(p.name)),links=item.links.filter(l=>names.includes(l.a)&&names.includes(l.b));const a=yaw+index*Math.PI*2/groups.length+(this.rand()-.5)*1.2,speed=2.5+this.rand()*3.5,lift=2.2+this.rand()*3.3,spin=new THREE.Vector3((this.rand()-.5)*15,(this.rand()-.5)*15,(this.rand()-.5)*15);
   for(const part of parts){part.body.resetForces(true);part.body.setLinvel({x:launch.x+Math.sin(a)*speed,y:launch.y+lift,z:launch.z+Math.cos(a)*speed},true);part.body.setAngvel(spin,true);}
   while(this.items.length>=this.max)this.remove(this.items[0]);this.items.push({parts,joints:links.map(l=>l.joint),links,age:0,limb:true,pattern,bleedTimer:this.rand()*.12,bleedDuration:.7+this.rand()*.8,landed:false,crushed:false,runOver:null});
  });
 }
 update(dt,tank){
  for(const item of [...this.items]){item.age+=dt;for(const part of item.parts){part.mesh.position.copy(part.body.translation());part.mesh.quaternion.copy(part.body.rotation());}
   const torso=item.parts[0].body.translation();
   if(item.limb){
    if(item.age<item.bleedDuration){item.bleedTimer-=dt;if(item.bleedTimer<=0){item.bleedTimer=.10+this.rand()*.09;this.fx.bloodTrail?.(new THREE.Vector3().copy(torso),new THREE.Vector3().copy(item.parts[0].body.linvel()));}}
    if(!item.landed&&item.age>.25){const origin={x:torso.x,y:torso.y+.12,z:torso.z},hit=this.world.castRay(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),.45,true,undefined,undefined,undefined,item.parts[0].body,c=>!c.parent()||c.parent().isFixed());if(hit){item.landed=true;this.fx.bloodLanding?.(new THREE.Vector3(torso.x,origin.y-hit.timeOfImpact,torso.z),.3+this.rand()*.35);}}
   }
   if(item.runOver){
    // A caught body folds beneath the hull without the overlapping chassis launching it.
    // Ground and scenery still collide; downward pressure lasts through the initial tumble.
    for(const part of item.parts){part.body.resetForces(true);if(item.age<.4)part.body.addForce({x:0,y:-part.body.mass()*35,z:0},true);}
    const ground=terrainHeight(torso.x,torso.z);
    if(item.age>=.55&&(torso.y<ground+.8||item.age>=.9)){this.dismember(item,item.runOver.yaw,item.runOver.scale);continue;}
   }

   if(tank&&!tank.dead&&tank.grounded>0&&Math.abs(tank.speed)>.65&&!item.runOver&&item.age>.45){
    const ground=terrainHeight(torso.x,torso.z),local=new THREE.Vector3().copy(torso).sub(tank.body.translation()).applyQuaternion(new THREE.Quaternion().copy(tank.body.rotation()).invert());
    if(torso.y<ground+.65&&Math.abs(local.x)<1.6*tank.cfg.scale&&Math.abs(local.z)<2*tank.cfg.scale&&local.y<.1&&local.y>-1.65*tank.cfg.scale){if(item.limb){this.fx.smear(new THREE.Vector3(torso.x,ground,torso.z),tank.yaw,.35);item.crushed=true;this.remove(item);}else this.dismember(item,tank.yaw,tank.cfg.scale);continue;}
   }
   if(item.age>45)this.remove(item);
  }
 }
}
