import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Effects} from '../src/effects.js';
import {createCannonProjectile,updateCannonProjectile} from '../src/projectile-visuals.js';

test('a cannon blast survives its first long frame and then releases its fixed pool',()=>{
 const texture=new THREE.Texture(),fx=new Effects(new THREE.Group(),texture,{cannonMuzzle:texture});
 fx.cannon(new THREE.Vector3(0,2,0),new THREE.Vector3(0,0,1),new THREE.Vector3());
 const plume=fx.muzzleFlashes.find(f=>f.material.uniforms.cannon.value===1);
 fx.update(.2,false);assert.ok(plume.group.visible,'fresh flash must reach presentation before expiry');assert.equal(plume.material.uniforms.blastTex.value,texture);
 fx.prepare(new THREE.PerspectiveCamera());fx.update(.2,false);assert.equal(plume.group.visible,false);
 assert.equal(fx.muzzleFlashes.length,24);assert.equal(fx.lights.length,6);assert.equal(fx.shockwaves.length,8);
});

test('orientation chevron follows the chassis, scales with it, and hides outside combat',()=>{
 const fx=new Effects(new THREE.Group(),new THREE.Texture()),tank={root:{position:new THREE.Vector3(3,2,5)},yaw:Math.PI/2,turretYaw:0,cfg:{scale:1.2}};
 fx.updateHeading(tank,true);assert.ok(fx.headingMarker.visible);assert.ok(Math.abs(fx.headingMarker.position.x-8.16)<1e-6);assert.ok(Math.abs(fx.headingMarker.position.z-5)<1e-6);assert.equal(fx.headingMarker.rotation.y,Math.PI/2);
 fx.updateHeading(tank,false);assert.equal(fx.headingMarker.visible,false);tank.dead=true;fx.updateHeading(tank,true);assert.equal(fx.headingMarker.visible,false);
});

test('cannon projectile exposure length follows speed, stays bounded, and points aft',()=>{
 const mesh=createCannonProjectile({color:0xffda92});updateCannonProjectile(mesh,80,.1);assert.equal(mesh.userData.streak.scale.z,2);
 updateCannonProjectile(mesh,1000,.1);assert.equal(mesh.userData.streak.scale.z,3.2);
 const geometry=mesh.userData.streak.children[0].geometry;geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.z<=0);assert.equal(mesh.children.length,3);
});
