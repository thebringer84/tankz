import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Effects} from '../src/effects.js';
import {createCannonProjectile,updateCannonProjectile} from '../src/projectile-visuals.js';

test('machine guns retain visible flashes and smoke without activating scene lights',()=>{
 const fx=new Effects(new THREE.Group(),new THREE.Texture()),pos=new THREE.Vector3(0,2,0),dir=new THREE.Vector3(0,0,1);
 fx.machineGun(pos,dir);fx.prepare();
 assert.ok(fx.muzzleFlashes.some(f=>f.group.visible));assert.ok(fx.particles.some(p=>p.kind==='smoke'));
 assert.ok(fx.lights.every(s=>s.life===0&&s.light.intensity===0));
 fx.cannon(pos,dir,pos);fx.prepare();assert.ok(fx.lights.some(s=>s.light.intensity>0));
 fx.clear();fx.machineGunLightsEnabled=true;fx.machineGun(pos,dir);fx.prepare();
 assert.ok(fx.lights.some(s=>s.light.intensity>0));
});

test('flash lighting can be isolated without changing the pool or wreck lighting',()=>{
 const scene=new THREE.Group(),fx=new Effects(scene,new THREE.Texture()),lights=fx.lights.map(s=>s.light);
 const wreck=fx.lights.at(-1);wreck.reserved=true;wreck.light.intensity=123;
 for(let i=0;i<30;i++)fx.flash(new THREE.Vector3(i,2,0),38,.09,3.5);
 fx.flashLightsEnabled=false;fx.prepare();
 assert.ok(fx.lights.filter(s=>!s.reserved).every(s=>s.light.intensity===0));assert.equal(wreck.light.intensity,123);
 fx.flashLightsEnabled=true;fx.prepare();assert.ok(fx.lights[0].light.intensity>0);
 fx.visibility={sampledVisible:()=>false};fx.lights[0].enemyFire=true;fx.prepare();assert.equal(fx.lights[0].light.intensity,0);
 assert.deepEqual(fx.lights.map(s=>s.light),lights);assert.equal(scene.children.filter(o=>o.isPointLight).length,4);
});

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
