import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {AMMO} from '../src/config.js';
import {canisterDirections,fireCanister} from '../src/canister.js';
await RAPIER.init();
test('canister directions fill a bounded cone around any muzzle orientation',()=>{
 const forward=new THREE.Vector3(1,.2,.4).normalize(),directions=canisterDirections(forward,.7);
 assert.equal(directions.length,48);assert.ok(directions[0].distanceTo(forward)<1e-8);
 for(const d of directions){assert.ok(Math.abs(d.length()-1)<1e-8);assert.ok(d.angleTo(forward)<=AMMO.canister.spread+1e-8);}
});
function volley(distance,armor=false,cover=false){
 const world=new RAPIER.World({x:0,y:0,z:0}),body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
 const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(10,10,.1).setTranslation(0,0,distance));
 if(cover)world.createCollider(RAPIER.ColliderDesc.cuboid(10,10,.1).setTranslation(0,0,distance/2));
 world.step();const target={infantry:!armor,cfg:armor?{}:null},damage=[];
 const game={world,entities:new Map([[collider.handle,target]]),rand:()=>.5,fx:{cannon(){},blood(){}},hurt:(t,n)=>damage.push(n),audio:{boom(){}},shake:0};
 const tank={body,cfg:{reload:2,mass:100,scale:1},root:{position:new THREE.Vector3()}};
 try{fireCanister(game,tank,new THREE.Vector3(),new THREE.Vector3(0,0,1));assert.equal(tank.reload,2);assert.equal(tank.shots,1);return damage.reduce((a,b)=>a+b,0);}finally{world.free();}
}
test('pellet damage falls with distance, stops at 38 m, and is blocked by cover',()=>{
 assert.ok(volley(8)>volley(25));assert.equal(volley(40),0);assert.equal(volley(12,false,true),0);
 assert.ok(Math.abs(volley(12,true)/volley(12)-.06)<1e-6);
});
