import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from './config.js';
export class SmokeGrenades {
 constructor(game){this.game=game;this.items=[];}
 launch(tank){const g=this.game;tank.root.updateWorldMatrix(true,true);const rotation=tank.turret.getWorldQuaternion(new THREE.Quaternion());
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const p=tank.turret.localToWorld(new THREE.Vector3(side*1.03,.64,-.55+i*.18));
   const dir=new THREE.Vector3(side*(.85+i*.12),.85,.25+(i-1)*.35).normalize().applyQuaternion(rotation),vel=dir.clone().multiplyScalar(10+i*.7).add(new THREE.Vector3().copy(tank.body.linvel()).multiplyScalar(.35));
   const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setLinvel(vel.x,vel.y,vel.z).setAngvel({x:7,y:3,z:5}).setCcdEnabled(true));
   g.world.createCollider(RAPIER.ColliderDesc.ball(.09).setMass(.3).setRestitution(.25).setCollisionGroups(0x0008fff1),body);
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.24,8),new THREE.MeshStandardMaterial({color:0x5b6251,roughness:.8}));mesh.position.copy(p);mesh.name='smoke-grenade';g.root.add(mesh);
   this.items.push({body,mesh,age:0,fuse:.85+i*.08});g.fx.emit(p,dir.clone().multiplyScalar(2),0xc9c6b6,.55,.35,'smoke');
  }
 }
 update(dt){const g=this.game;for(const item of [...this.items]){item.age+=dt;const p=new THREE.Vector3().copy(item.body.translation());item.mesh.position.copy(p);item.mesh.quaternion.copy(item.body.rotation());
  if(item.age<item.fuse)continue;
  const center=new THREE.Vector3(p.x,terrainHeight(p.x,p.z)+.65,p.z);g.smokeClouds.push({p:center,time:8,radius:4.5});g.fx.screenSmoke(center,8,4.5);g.audio.boom(.07,p.distanceTo(g.player.root.position));
  g.world.removeRigidBody(item.body);item.mesh.removeFromParent();item.mesh.geometry.dispose();item.mesh.material.dispose();this.items.splice(this.items.indexOf(item),1);
 }}
}
