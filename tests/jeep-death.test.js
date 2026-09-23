import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {createJeep,makeMaterials} from '../src/models.js';
import {Ragdolls} from '../src/ragdolls.js';
import {ejectJeepCrew} from '../src/jeep-death.js';
await RAPIER.init();
function setup(roll){
 const world=new RAPIER.World({x:0,y:-18,z:0}),scene=new THREE.Group();world.createCollider(RAPIER.ColliderDesc.cuboid(100,.2,100).setTranslation(0,-.2,0));
 const model=createJeep(makeMaterials({}));scene.add(model.root);model.root.position.y=1.4;
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,1.4,0));
 let calls=0,stains=0;const game={rand:()=>calls++===0?roll:.5,ragdolls:new Ragdolls(world,scene,{smear(){stains++;},bloodLanding(){stains++;}})};
 return {world,game,jeep:{...model,body,yaw:0},stains:()=>stains};
}
for(const [roll,variant] of [[.1,'tumble'],[.3,'skyward'],[.5,'scatter'],[.9,'crawl']])test(`jeep death ${variant} ejects two bounded, jointed occupants`,()=>{
 const {world,game,jeep,stains}=setup(roll);
 try{
  assert.equal(ejectJeepCrew(game,jeep),variant);assert.equal(game.ragdolls.items.length,2);
  const [a,b]=game.ragdolls.items;assert.equal(a.joints.length,10);assert.equal(b.joints.length,10);
  if(variant==='skyward')assert.ok(a.parts[0].body.linvel().y>=22);
  if(variant==='scatter')assert.ok(Math.abs(a.parts[0].body.linvel().x)>=14);
  if(variant==='crawl'){
   const crawler=game.ragdolls.items.find(r=>r.crawl);assert.ok(crawler);let start=null,end=null;
   for(let i=0;i<720;i++){world.step();game.ragdolls.update(1/60,null);if(crawler.crawl?.started&&!start)start=new THREE.Vector3().copy(crawler.parts[0].body.translation());if(crawler.crawlExpired&&!end)end=new THREE.Vector3().copy(crawler.parts[0].body.translation());}
   assert.ok(start&&end,'crawler lands and expires');assert.ok(Math.hypot(end.x-start.x,end.z-start.z)>.5,'crawler moves away after landing');assert.ok(stains()>1);assert.ok(crawler.parts.every(p=>p.body.isValid()));
   game.ragdolls.remove(crawler);assert.ok(crawler.removed);
  }
 }finally{world.free();}
});
