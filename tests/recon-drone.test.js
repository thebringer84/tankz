import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {ReconDrone,DRONE} from '../src/recon-drone.js';
import {Visibility,sightRange,sightHeight} from '../src/visibility.js';
import {TANKS} from '../src/config.js';
await RAPIER.init();
function setup(){
 const g={world:new RAPIER.World({x:0,y:0,z:0}),root:new THREE.Group(),textures:{},mode:'playing',tanks:[],soldiers:[],entities:new Map(),smokeClouds:[],rand:()=>.5,onEvent(){},audio:{boom(){}},fx:{emit(){},flash(){}}};
 function unit(z,enemy){const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,1,z)),collider=g.world.createCollider(RAPIER.ColliderDesc.cuboid(.8,.8,.8),body);const t={body,collider,root:new THREE.Group(),cfg:TANKS.medium,enemy};t.root.position.copy(body.translation());g.entities.set(collider.handle,t);g.tanks.push(t);return t;}
 g.player=unit(0,false);g.enemy=unit(25,true);g.drone=new ReconDrone(g);g.visibility=new Visibility(g);g.world.step();g.close=()=>{g.drone.dispose();g.visibility.dispose();g.world.free();};return g;
}
test('height orders infantry, low vehicles, light, medium and heavy tank sight',()=>{
 const units=[{infantry:true},{jeep:true},...['scout','medium','heavy'].map(type=>({cfg:TANKS[type]}))];
 for(let i=1;i<units.length;i++){assert.ok(sightRange(units[i])>sightRange(units[i-1]));assert.ok(sightHeight(units[i])>sightHeight(units[i-1]));}
});
test('drone clears cover, expires once, restores fog and respects cooldown',()=>{
 const g=setup();g.world.createCollider(RAPIER.ColliderDesc.cuboid(10,4,1).setTranslation(0,2,12));g.world.step();
 g.visibility.update(0,true);assert.equal(g.enemy.visibleToPlayer,false);
 const bodies=g.world.bodies.len();assert.equal(g.drone.launch(),true);assert.equal(g.drone.launch(),false);assert.equal(g.world.bodies.len(),bodies+1);
 g.drone.update(DRONE.climb);g.world.step();assert.ok(g.drone.active.body.translation().y>20);assert.equal(g.drone.active.rotors.length,4);
 g.visibility.update(0,true);assert.equal(g.enemy.visibleToPlayer,true);assert.equal(g.enemy.visibleToDrone,true);
 g.drone.update(DRONE.life);g.visibility.update(0,true);assert.equal(g.enemy.visibleToPlayer,false);assert.equal(g.enemy.visibleToDrone,false);assert.equal(g.drone.expirations,1);assert.equal(g.world.bodies.len(),bodies);
 assert.equal(g.drone.launch(),false);g.drone.update(DRONE.cooldown);assert.equal(g.drone.expirations,1);assert.equal(g.drone.launch(),true);g.close();
});
test('viewport bounds cap fog reveal and contacts without altering AI sight',()=>{
 const g=setup();g.camera=new THREE.PerspectiveCamera(43,1,.1,200);g.camera.position.set(0,30,35);g.camera.lookAt(0,0,0);g.camera.updateMatrixWorld();
 g.visibility.update(0,true);assert.ok(g.visibility.screenWeight({x:0,y:0,z:0})>0);
 g.enemy.body.setTranslation({x:35,y:1,z:0},true);g.world.step();assert.ok(g.visibility.canSee(g.player,g.enemy));
 g.visibility.update(0,true);assert.equal(g.enemy.visibleToPlayer,false);assert.equal(g.visibility.screenWeight(g.enemy.body.translation()),0);
 for(let z=0;z<g.visibility.size;z++)for(let x=0;x<g.visibility.size;x++)if(g.visibility.target[z*g.visibility.size+x]){const wx=(x+.5)/g.visibility.size*g.visibility.extent-g.visibility.extent/2,wz=(z+.5)/g.visibility.size*g.visibility.extent-g.visibility.extent/2;assert.ok(Math.hypot(wx,wz)<sightRange(g.player));}
 g.close();
});
test('paused or destroyed tank cannot launch',()=>{const g=setup();g.mode='paused';assert.equal(g.drone.launch(),false);g.mode='playing';g.player.dead=true;assert.equal(g.drone.launch(),false);g.close();});

test('drone reveals and tags only its local 32 metre ground radius',()=>{
 const g=setup();g.drone.launch();g.drone.update(2);g.world.step();
 for(const [distance,expected] of [[31,true],[33,false],[80,false]]){
  g.enemy.body.setTranslation({x:0,y:1,z:distance},true);g.world.step();g.visibility.update(0,true);
  assert.equal(g.enemy.visibleToDrone,expected,'contact at '+distance+' m');
  assert.equal(g.visibility.canSee(g.drone.active,g.enemy),expected);
 }
 assert.equal(DRONE.range,32);g.close();
});
