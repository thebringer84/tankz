// CPU encounter benchmark; excludes rendering and asset creation.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Infantry} from '../src/infantry.js';
import {makeMaterials} from '../src/models.js';
await RAPIER.init();
for(const count of [20,100,200]){
 const g={time:0,world:new RAPIER.World({x:0,y:-18,z:0}),root:new THREE.Group(),materials:makeMaterials({sand:null,normal:null,height:null,armor:null,concrete:null,rock:null}),soldiers:[],props:[],entities:new Map(),nextId:1,rand:()=>.5};
 g.world.createCollider(RAPIER.ColliderDesc.cuboid(150,.2,150).setTranslation(0,-.2,0));
 for(let i=0;i<14;i++){
  const x=(i%7)*9-27,z=Math.floor(i/7)*16+8,mesh=new THREE.Mesh(new THREE.BoxGeometry(5,4,2));
  const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,2,z));
  const collider=g.world.createCollider(RAPIER.ColliderDesc.cuboid(2.5,2,1),body),prop={mesh,body,collider};g.props.push(prop);g.entities.set(collider.handle,prop);
 }
 const infantry=new Infantry(g);
 for(let i=0;i<count;i++){const s=infantry.spawn((i%20)*2-20,32+Math.floor(i/20)*2);s.ai.engaged=true;s.ai.state='investigate';s.ai.lastKnown.set(0,1,0);}
 g.world.step();const samples=[];
 for(let tick=0;tick<240;tick++){
  g.time+=1/60;const start=performance.now();infantry.update(1/60);samples.push(performance.now()-start);g.world.step();
 }
 const first=samples[0];samples.sort((a,b)=>a-b);
 console.log(JSON.stringify({soldiers:count,firstMs:+first.toFixed(2),medianMs:+samples[120].toFixed(2),p95Ms:+samples[228].toFixed(2),maxMs:+samples[239].toFixed(2)}));g.world.free();
}
