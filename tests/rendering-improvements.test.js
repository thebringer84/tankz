import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {cacheBodyState} from '../src/body-state.js';
import {ParticlePool} from '../src/particle-pool.js';
import {SceneMotion} from '../src/motion-presentation.js';
import {ProjectilePool} from '../src/projectile-pool.js';
import {Visibility} from '../src/visibility.js';
import {skinCrew,restoreCrew} from '../src/infantry-skin.js';
import {createCrew,makeMaterials} from '../src/models.js';
await RAPIER.init();
test('body snapshots invalidate on steps, teleports, impulses and kinematic updates',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});cacheBodyState(world);const b=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());world.createCollider(RAPIER.ColliderDesc.ball(1),b);
 const first=b.translation();assert.equal(b.translation(),first);b.setTranslation({x:4,y:0,z:0},true);assert.equal(b.translation().x,4);assert.notEqual(b.translation(),first);
 b.setLinvel({x:2,y:0,z:0},true);world.step();assert.ok(b.translation().x>4);const v=b.linvel().x;b.applyImpulse({x:10,y:0,z:0},true);assert.ok(b.linvel().x>v);
 const k=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());k.translation();k.setNextKinematicTranslation({x:5,y:0,z:0});world.step();assert.equal(k.translation().x,5);world.free();
});
test('particle pool evicts oldest after swap removal and resets reused flags',()=>{
 const active=[],pool=new ParticlePool(active,3),a=pool.acquire(),b=pool.acquire(),c=pool.acquire();a.screen=true;a.density=.3;
 pool.remove(b.index);const d=pool.acquire();assert.equal(d,b);pool.acquire();assert.ok(active.includes(c)&&active.includes(a));assert.equal(pool.first,c);assert.equal(a.screen,false);assert.equal(a.density,undefined);assert.equal(active.length,3);pool.clear();assert.equal(active.length,0);
});
test('interpolation restores gameplay transforms and resets on reparenting',()=>{
 const mesh=new THREE.Object3D(),g={shells:[{mesh}]},motion=new SceneMotion();motion.after(g);motion.before(g);mesh.position.x=2;motion.after(g);motion.present(.5);assert.equal(mesh.position.x,1);motion.restore();assert.equal(mesh.position.x,2);
 motion.before(g);new THREE.Group().add(mesh);mesh.position.x=4;motion.after(g);motion.present(0);assert.equal(mesh.position.x,4);motion.before(g);mesh.userData.presentationGeneration=1;mesh.position.x=5;motion.after(g);motion.present(0);assert.equal(mesh.position.x,5);g.shells=[];motion.after(g);assert.equal(motion.poses.size,0);
});
test('projectile pooling preserves shared resources and independent streak transforms',()=>{
 const pool=new ProjectilePool(new THREE.Group()),ammo={color:0xffffff};const a=pool.acquire(ammo,'ap',false,false),b=pool.acquire(ammo,'ap',false,false);assert.equal(a.children[0].geometry,b.children[0].geometry);assert.notEqual(a.userData.streak,b.userData.streak);pool.release(a);assert.equal(pool.acquire(ammo,'ap',false,false),a);
});
test('fog clears abandoned observer regions and recalled drones',()=>{
 const p=new THREE.Vector3(),d=new THREE.Vector3(90,0,0),g={player:{body:{translation:()=>p},range:8},drone:{active:{ready:true,range:8,body:{translation:()=>d}}}},v=new Visibility(g);v.heights=new Float64Array(v.data.length);v.clearLine=()=>true;
 v.updateFog(0,true);const index=q=>Math.floor((q.z/v.extent+.5)*v.size)*v.size+Math.floor((q.x/v.extent+.5)*v.size),old=index(p),drone=index(d);assert.ok(v.data[old]>0&&v.data[drone]>0);
 p.x=40;g.drone.active=null;v.updateFog(.1);v.animate(2);assert.equal(v.data[old],0);assert.equal(v.data[drone],0);assert.ok(v.data[index(p)]>0);v.dispose();
});
test('skinned crew restores original world-space parts for hidden ragdolls',()=>{
 const crew=createCrew(makeMaterials({})),parent=new THREE.Group();parent.position.set(10,3,7);parent.rotation.y=.6;parent.add(crew.root);parent.updateMatrixWorld(true);const expected=crew.parts.map(p=>p.mesh.getWorldPosition(new THREE.Vector3()));skinCrew(crew);crew.skin.sync();crew.parts.forEach((p,i)=>assert.ok(p.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(expected[i])<1e-6));restoreCrew(crew);parent.updateMatrixWorld(true);crew.parts.forEach((p,i)=>assert.ok(p.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(expected[i])<1e-6));assert.equal(crew.skin,null);
});

test('staggered jeep steering accumulates real elapsed time and wakes on sight changes',async()=>{
 const {EnemyDirector}=await import('../src/ai.js'),g={time:0},director=new EnemyDirector(g),t={aiPhase:0,ai:{state:'pursue',sees:true,lastKnown:new THREE.Vector3(0,0,20)},body:{translation:()=>({x:0,y:0,z:0})},aimTarget:new THREE.Vector3(),turretYaw:0,navigation:{path:[1],recovery:0}};let calls=0,elapsed=0;
 director.navigation.steer=(_t,_target,dt)=>{calls++;elapsed+=dt;return {throttle:1,steer:0};};
 for(let i=1;i<=60;i++){g.time=i/60;t.steeringElapsed=(t.steeringElapsed||0)+1/60;director.command(t);}
 assert.ok(calls>=20&&calls<=21);assert.ok(Math.abs(elapsed-1)<1e-8);t.ai.sees=false;director.command(t);assert.equal(calls,22);
});
test('shadow fit contains elevated receivers and their sunward casters at every zoom',async()=>{
 const {ShadowFrustum}=await import('../src/shadow-frustum.js');const fit=new ShadowFrustum(),sun=new THREE.DirectionalLight();sun.position.set(-165,96,78);sun.shadow.mapSize.set(2048,2048);const camera=new THREE.PerspectiveCamera(43,2.1,.2,360),point=new THREE.Vector3();
 for(const zoom of [.7,1,1.5]){camera.position.set(0,43*zoom,30*zoom);camera.lookAt(0,0,-3);fit.update(camera,sun);sun.shadow.updateMatrices(sun);
  for(const height of [-12,0,24])for(const x of [-1,1])for(const y of [-1,1]){const a=new THREE.Vector3(x,y,-1).unproject(camera),b=new THREE.Vector3(x,y,1).unproject(camera);point.copy(b).sub(a).multiplyScalar((height-a.y)/(b.y-a.y)).add(a);const projected=point.clone().project(sun.shadow.camera);assert.ok(Math.abs(projected.x)<=1.001&&Math.abs(projected.y)<=1.001&&Math.abs(projected.z)<=1.001);const caster=point.clone().addScaledVector(sun.position.clone().normalize(),20).project(sun.shadow.camera);assert.ok(Math.abs(caster.x)<=1.001&&Math.abs(caster.y)<=1.001&&Math.abs(caster.z)<=1.001);}
 }
});

test('interpolation preserves authored yaw across 90 and 180 degrees and restores limb scale',()=>{
 const mesh=new THREE.Object3D(),gun=new THREE.Object3D();gun.position.z=1;mesh.add(gun);const g={shells:[{mesh}]},motion=new SceneMotion(),expected=new THREE.Quaternion(),direction=new THREE.Vector3();
 mesh.rotation.y=1.3;motion.after(g);
 for(let tick=0;tick<150;tick++){
  motion.before(g);const yaw=1.3+(tick+1)*.025;mesh.rotation.y=yaw;mesh.scale.y=1+tick*.001;motion.after(g);
  for(const alpha of [.1,.5,.9]){motion.present(alpha);motion.restore();expected.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);assert.ok(mesh.quaternion.angleTo(expected)<1e-6);assert.equal(mesh.rotation.x,0);assert.equal(mesh.rotation.z,0);assert.equal(mesh.scale.y,1+tick*.001);gun.getWorldDirection(direction);assert.ok(Math.abs(direction.x-Math.sin(yaw))<1e-6);}
 }
});
