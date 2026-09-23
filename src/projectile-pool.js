import * as THREE from 'three';
import {createCannonProjectile} from './projectile-visuals.js';
export class ProjectilePool {
 constructor(root){this.root=root;this.types=new Map();this.limit=48;}
 acquire(ammo,key,rocket,automatic){
  const id=rocket?'rocket':automatic?'bullet-'+ammo.color:key;let type=this.types.get(id);
  if(!type){let template;
   if(!rocket&&!automatic)template=createCannonProjectile(ammo,key);
   else{template=new THREE.Mesh(rocket?new THREE.CylinderGeometry(.07,.11,.8,8).rotateX(Math.PI/2):new THREE.BoxGeometry(.05,.05,.75),new THREE.MeshBasicMaterial({color:rocket?0x566044:ammo.color}));
    if(rocket){const engine=new THREE.Mesh(new THREE.ConeGeometry(.12,.7,8).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffb34b,toneMapped:false}));engine.material.color.multiplyScalar(3);engine.position.z=-.65;template.add(engine);}
   }
   // Template owns shared GPU resources and is included in world teardown.
   template.visible=false;this.root.add(template);type={template,free:[]};this.types.set(id,type);
  }
  let mesh=type.free.pop();if(!mesh){const streak=type.template.userData.streak;delete type.template.userData.streak;try{mesh=type.template.clone(true);}finally{type.template.userData.streak=streak;}}mesh.userData.poolType=id;mesh.userData.presentationGeneration=(mesh.userData.presentationGeneration||0)+1;mesh.userData.streak=mesh.getObjectByName('Exposure streak');mesh.visible=true;mesh.scale.setScalar(1);if(mesh.children[0])mesh.children[0].scale.setScalar(1);this.root.add(mesh);return mesh;
 }
 release(mesh){mesh.removeFromParent();mesh.visible=false;const type=this.types.get(mesh.userData.poolType);if(type&&type.free.length<this.limit)type.free.push(mesh);}
}
