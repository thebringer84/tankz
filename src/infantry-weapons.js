import * as THREE from 'three';
import {box,cylinder} from './models.js';
import {FRAG_GRENADE,clamp} from './config.js';
export function equipSpecialist(crew,gun,muzzle,materials,weapon){
 for(const child of [...gun.children])if(child!==muzzle)gun.remove(child);
 const torso=crew.parts.find(p=>p.name==='torso').mesh,gear=new THREE.Group();crew.root.add(gear);
 if(weapon==='grenadier'){
  gun.name='Throwing hand';const grenade=new THREE.Mesh(new THREE.SphereGeometry(.105,8,6),materials.helmet);gun.add(grenade);gun.userData.grenade=grenade;
  box(grenade,materials.steel,0,.105,0,.07,.065,.07);muzzle.position.set(0,0,.16);
  for(let i=0;i<4;i++){const x=(i-1.5)*.10;box(gear,materials.canvas,x,.85-Math.abs(x)*.7,.17,.09,.14,.09);cylinder(gear,materials.helmet,x,.89-Math.abs(x)*.7,.19,.033,.11);}
  box(gear,materials.rust,0,.57,.16,.32,.09,.08);
 }else if(weapon==='rpg'){
  gun.name='RPG launcher';const tube=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,1.48,12,1,true).rotateX(Math.PI/2),materials.armor);tube.position.z=-.1;gun.add(tube);
  for(const z of [-.84,.64]){const rim=new THREE.Mesh(new THREE.TorusGeometry(.105,.022,6,12),materials.steel);rim.position.z=z;gun.add(rim);cylinder(gun,materials.dark,0,0,z*.96,.079,.025,'z');}
  for(const z of [-.5,-.12])cylinder(gun,materials.canvas,0,0,z,.12,.22,'z');
  box(gun,materials.dark,0,-.15,.13,.09,.24,.12);box(gun,materials.steel,-.10,.15,.20,.055,.18,.1);box(gun,materials.dark,-.12,.23,.2,.08,.045,.19);
  const round=new THREE.Group();round.name='loaded rocket';cylinder(round,materials.helmet,0,0,.78,.16,.25,'z');const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.35,10).rotateX(Math.PI/2),materials.armor);tip.position.z=1.08;round.add(tip);gun.add(round);gun.userData.round=round;muzzle.position.z=1.28;
  cylinder(gear,materials.canvas,-.11,.75,-.28,.09,.74);cylinder(gear,materials.helmet,.11,.75,-.28,.11,.74);
 }else{
  gun.name='Flamethrower';cylinder(gun,materials.dark,0,0,.24,.055,.83,'z');cylinder(gun,materials.steel,0,0,.68,.095,.20,'z');box(gun,materials.armor,0,0,.02,.18,.2,.31);box(gun,materials.dark,0,-.16,.08,.08,.23,.1);box(gun,materials.dark,0,-.10,.38,.1,.12,.14);muzzle.position.z=.83;
  for(const x of [-.15,.15]){cylinder(gear,materials.armor,x,.73,-.28,.14,.62);cylinder(gear,materials.rust,x,1.07,-.28,.06,.08);for(const y of [.51,.90])cylinder(gear,materials.dark,x,y,-.28,.151,.045);}
  box(gear,materials.dark,0,.71,-.15,.42,.48,.10);
  const hose=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.2,.56,-.28),new THREE.Vector3(.42,.30,-.12),new THREE.Vector3(.45,.42,.26),new THREE.Vector3(.24,.65,.32)]),12,.025,5,false),materials.dark);gear.add(hose);
  const head=crew.parts.find(p=>p.name==='head').mesh;const mask=box(crew.root,materials.dark,0,1.11,.16,.23,.15,.10);head.attach(mask);
 }
 for(const x of [-.12,.12])box(gear,materials.canvas,x,.77,.14,.055,.43,.045);
 crew.root.updateMatrixWorld(true);torso.attach(gear);return gear;
}
export function animateWeapon(s,dt,pose=true){
 if(s.weapon==='grenadier'){
  const ready=s.ai?.sees&&!s.takingCover&&s.secondary===0,phase=clamp(s.aimTime/FRAG_GRENADE.windup,0,1);
  s.weaponPose=ready?'windup':s.secondary>FRAG_GRENADE.reload-.25?'follow-through':s.secondary>.3?'reload':'carry';
  if(!pose)return;
  const hand=new THREE.Vector3(.3,.65,.18);
  if(ready){if(phase<.5)hand.lerp(new THREE.Vector3(.32,1.3,-.14),phase*2);else hand.set(.32,1.3,-.14).lerp(new THREE.Vector3(.3,1.05,.55),(phase-.5)*2);}
  else if(s.weaponPose==='follow-through')hand.set(.3,.96,.55);
  s.gun.position.copy(hand);s.gun.rotation.set(0,0,0);s.gun.userData.grenade.visible=s.secondary<.3;
  for(const side of [-1,1]){
   const name=side<0?'L':'R',shoulder=new THREE.Vector3(side*.23,.87,0),elbow=new THREE.Vector3(side*.34,side>0?hand.y-.15:.65,.12),end=side>0?hand:new THREE.Vector3(-.08,.75,.25);
   const upper=s.crew.parts.find(p=>p.name==='upperArm'+name).mesh,fore=s.crew.parts.find(p=>p.name==='forearm'+name).mesh;
   upper.position.copy(shoulder).lerp(elbow,.5);upper.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),shoulder.clone().sub(elbow).normalize());upper.scale.y=shoulder.distanceTo(elbow);
   fore.position.copy(elbow).lerp(end,.5);fore.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),end.clone().sub(elbow).normalize());fore.scale.z=elbow.distanceTo(end);
   s.crew.links.find(l=>l[0]==='upperArm'+name)[2]=elbow.toArray();
  }
  return;
 }
 if(s.weapon!=='rpg'&&s.weapon!=='flame')return;
 const rpg=s.weapon==='rpg',ready=s.ai?.sees&&!s.takingCover&&(rpg?s.secondary===0:!!s.flameFiring||s.secondary===0);
 s.weaponRaise=(s.weaponRaise||0)+((ready?1:0)-(s.weaponRaise||0))*(1-Math.exp(-dt*7));const b=s.weaponRaise;
 s.weaponPose=ready?(b>.92?(rpg?'aim':'fire-ready'):'shoulder'):(s.secondary>0?'reload':'carry');
 if(!pose)return;
 const carry=new THREE.Vector3(.31,rpg?.56:.62,-.02),aim=new THREE.Vector3(rpg?.27:.18,rpg?1.0:.75,.10);
 s.gun.position.copy(carry.lerp(aim,b));s.gun.rotation.set(THREE.MathUtils.lerp(rpg?-1.15:.35,s.aimElevation||0,b),0,THREE.MathUtils.lerp(-.18,0,b));
 if(rpg){s.gun.userData.round.visible=s.secondary<1.4;s.gun.position.y-=Math.sin(Math.max(0,s.secondary-1.4)/3.4*Math.PI)*.06;}
 s.gun.updateMatrix();
 for(const side of [-1,1]){const name=side<0?'L':'R',shoulder=new THREE.Vector3(side*.23,.87,0),elbow=new THREE.Vector3(side*.34,.61+b*(rpg?.16:.03),.06+b*.1),hand=new THREE.Vector3(side<0?0:0,-.14,side<0?.43:.13).applyMatrix4(s.gun.matrix);
  if(rpg&&side<0&&s.secondary>1.4){const reloadReach=Math.sin(THREE.MathUtils.clamp((4.8-s.secondary)/3.4,0,1)*Math.PI);hand.lerp(new THREE.Vector3(-.16,.77,-.30),reloadReach);}
  const upper=s.crew.parts.find(p=>p.name==='upperArm'+name).mesh,fore=s.crew.parts.find(p=>p.name==='forearm'+name).mesh;
  upper.position.copy(shoulder).lerp(elbow,.5);upper.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),shoulder.clone().sub(elbow).normalize());upper.scale.y=shoulder.distanceTo(elbow);
  fore.position.copy(elbow).lerp(hand,.5);fore.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),hand.clone().sub(elbow).normalize());fore.scale.z=elbow.distanceTo(hand);
  s.crew.links.find(l=>l[0]==='upperArm'+name)[2]=elbow.toArray();
 }
}
