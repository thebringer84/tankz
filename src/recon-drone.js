import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const DRONE={life:8,climb:1.6,height:20,range:32,cooldown:22};

export function createDrone(texture){
 const root=new THREE.Group();root.name='Recon quadcopter';
 const armor=new THREE.MeshStandardMaterial({map:texture||null,color:0xb7b9a6,roughness:.76,metalness:.3}),metal=new THREE.MeshStandardMaterial({color:0x323b3c,roughness:.4,metalness:.7}),rubber=new THREE.MeshStandardMaterial({color:0x111718,roughness:.8}),lens=new THREE.MeshStandardMaterial({color:0x294b50,metalness:.65,roughness:.1,emissive:0x173b44,emissiveIntensity:.6});
 const mesh=(geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 mesh(new RoundedBoxGeometry(.72,.28,1.02,2,.09),armor,0,0,0);
 mesh(new RoundedBoxGeometry(.46,.13,.67,2,.045),rubber,0,.19,-.05);
 for(let i=0;i<6;i++)mesh(new THREE.BoxGeometry(.28,.025,.026),metal,0,.269,-.25+i*.08);
 const gimbal=mesh(new THREE.SphereGeometry(.19,12,8),metal,0,-.28,.3);gimbal.scale.set(1,.9,1);
 const camera=mesh(new THREE.CylinderGeometry(.105,.12,.13,16),lens,0,-.30,.47);camera.rotation.x=Math.PI/2;
 const rotors=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=sx*.83,z=sz*.83,arm=mesh(new RoundedBoxGeometry(1.05,.11,.16,1,.035),armor,x*.52,.04,z*.52);arm.rotation.y=-Math.atan2(z,x);
  mesh(new THREE.CylinderGeometry(.14,.12,.22,12),metal,x,.14,z);
  const rotor=new THREE.Group();rotor.position.set(x,.29,z);root.add(rotor);rotors.push(rotor);
  for(const angle of [0,Math.PI/2]){const blade=new THREE.Mesh(new RoundedBoxGeometry(.99,.018,.085,1,.015),rubber);blade.rotation.y=angle;rotor.add(blade);}
  const blur=mesh(new THREE.CircleGeometry(.51,24),new THREE.MeshBasicMaterial({color:0x98a6a1,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}),x,.30,z);blur.rotation.x=-Math.PI/2;
  mesh(new THREE.CylinderGeometry(.045,.045,.14,8),metal,x,.31,z);
  const light=new THREE.MeshBasicMaterial({color:sz>0?0xff6549:0x76d7ba,toneMapped:false});mesh(new THREE.SphereGeometry(.05,8,6),light,x,.08,z+sz*.14);
 }
 for(const sx of [-1,1]){
  for(const z of [-.35,.35]){const leg=mesh(new THREE.CylinderGeometry(.024,.024,.36,6),metal,sx*.38,-.27,z);leg.rotation.z=sx*.2;}
  const skid=mesh(new THREE.CylinderGeometry(.034,.034,.96,8),rubber,sx*.42,-.44,0);skid.rotation.x=Math.PI/2;
 }
 mesh(new THREE.CylinderGeometry(.012,.02,.35,6),metal,.2,.38,-.35);
 return {root,rotors};
}

export class ReconDrone {
 constructor(game){this.game=game;this.active=null;this.cooldown=0;this.expirations=0;this.model=createDrone(game.textures.droneComposite);this.model.root.visible=false;game.root.add(this.model.root);}
 launch(){
  const g=this.game;if(g.mode!=='playing'||g.player.dead||this.active||this.cooldown>0)return false;
  const position=new THREE.Vector3().copy(g.player.body.translation());position.y+=2;
  const model=this.model,body=g.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x,position.y,position.z));
  model.root.visible=true;model.root.position.copy(position);model.root.rotation.set(0,0,0);for(const rotor of model.rotors)rotor.rotation.y=0;
  this.active={...model,body,origin:position.clone(),previous:position.clone(),age:0,range:DRONE.range,ready:false};this.cooldown=DRONE.cooldown;
  g.onEvent('toast','Recon drone launched');return true;
 }
 update(dt){
  this.cooldown=Math.max(0,this.cooldown-dt);const d=this.active;if(!d)return;
  d.previous.copy(d.body.translation());d.age+=dt;
  if(d.age>=DRONE.life){this.explode();return;}
  const f=Math.min(1,d.age/DRONE.climb),ease=f*f*(3-2*f),p=d.origin.clone();p.y+=DRONE.height*ease;
  p.x+=Math.sin(d.age*1.3)*.16*ease;p.z+=Math.sin(d.age*.9)*.13*ease;d.body.setTranslation(p,true);d.root.position.copy(p);d.ready=d.age>.2;
 }
 present(alpha,dt){const d=this.active;if(!d)return;d.root.position.lerpVectors(d.previous,d.body.translation(),alpha);d.root.rotation.z=Math.sin(d.age*2)*.025;for(let i=0;i<d.rotors.length;i++)d.rotors[i].rotation.y+=dt*70*(i%2?1:-1);}
 explode(){
  const d=this.active;if(!d)return;const g=this.game,p=new THREE.Vector3().copy(d.body.translation());
  for(let i=0;i<24;i++){const v=new THREE.Vector3((g.rand()-.5)*7,(g.rand()-.3)*5,(g.rand()-.5)*7);g.fx.emit(p,v,i<8?0xffb557:0x51483b,i<8?.09:.45,i<8?.7:1.7,i<8?'ember':'smoke');}
  g.fx.emit(p,new THREE.Vector3(),0xffcf8a,2.4,.13,'fire');g.fx.flash(p,150,.12,8);g.audio.boom(.22);this.expirations++;this.remove();
 }
 remove(){const d=this.active;if(!d)return;this.game.world.removeRigidBody(d.body);d.root.visible=false;this.active=null;for(const t of [...this.game.tanks,...this.game.soldiers])t.visibleToDrone=false;}
 dispose(){this.remove();this.model.root.removeFromParent();const geometries=new Set(),materials=new Set();this.model.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
}
