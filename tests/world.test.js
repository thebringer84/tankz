import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {MAP_SIZE,JUMP_RIDGES,INFANTRY_COUNT,JEEP_COUNT} from '../src/config.js';
import {ROCK_SITES,inJumpLane} from '../src/world-layout.js';
import {worldFixture,freeWorld} from './world-fixture.js';
await RAPIER.init();

test('expanded world has distributed patrols, open jump lanes and local terrain updates',async()=>{
 const g=await worldFixture();
 try{
  assert.ok(Math.abs(MAP_SIZE**2/220**2-6)<1e-10);
  assert.equal(g.soldiers.length,INFANTRY_COUNT);assert.equal(g.tanks.filter(t=>t.enemy).length,JEEP_COUNT);
  assert.equal(g.environment.jumpRocks.length,8);assert.equal(JUMP_RIDGES.length,24);
  const frontier=g.environment.frontier;assert.equal(frontier.extensions.length,4);
  const handles=new Set(frontier.colliders.map(c=>c.handle));
  // Test the visible barriers themselves, excluding the invisible safety walls.
  for(const side of [-1,1])for(let along=-MAP_SIZE/2+1;along<MAP_SIZE/2;along+=2)for(const axis of ['x','z']){
   const p={x:along,y:0,z:along};p[axis]=side*(MAP_SIZE/2-16);p.y=g.environment.surfaceHeight(p.x,p.z)+2;
   const dir={x:0,y:0,z:0};dir[axis]=side;
   assert.ok(g.world.castRay(new RAPIER.Ray(p,dir),30,true,undefined,undefined,undefined,undefined,c=>handles.has(c.handle)),`open frontier ${axis} ${side} ${along}`);
  }
  assert.ok(g.environment.jumpRocks.every(r=>r.mesh.geometry.attributes.position.count>200&&r.mesh.geometry.attributes.uv));
  for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(g.soldiers.some(s=>{const p=s.body.translation();return p.x*sx>150&&p.z*sz>150;}));
  for(let i=0;i<g.soldiers.length;i++)for(let j=0;j<i;j++){
   const a=g.soldiers[i].body.translation(),b=g.soldiers[j].body.translation();assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.79);
  }
  for(const [x,z] of ROCK_SITES)assert.equal(inJumpLane(x,z),false);
  const ruts=g.environment.ruts;assert.equal(ruts.patches.length,576);
  for(const patch of ruts.patches)assert.ok(patch.mesh.frustumCulled);
  const point=new THREE.Vector3(0,0,0);
  for(let i=0;i<20;i++)ruts.stamp(point,0,1.24);
  ruts.update(.2);g.world.step();assert.ok(ruts.lastUpdatedPatches>0&&ruts.lastUpdatedPatches<=4);
  const reference=ruts.geometry.clone();reference.computeVertexNormals();
  for(const patch of ruts.patches)for(let i=0;i<patch.ids.length;i++){
   const id=patch.ids[i],attrs=patch.mesh.geometry.attributes;
   assert.equal(attrs.position.getY(i),ruts.geometry.attributes.position.getY(id));
   assert.ok(Math.abs(attrs.normal.getY(i)-reference.attributes.normal.getY(id))<1e-5);
  }
  reference.dispose();
  for(const x of [-240,point.x,240]){
   const z=0,hit=g.world.castRay(new RAPIER.Ray({x,y:20,z},{x:0,y:-1,z:0}),40,true,undefined,undefined,undefined,undefined,c=>!g.entities.has(c.handle));
   assert.ok(hit);assert.ok(Math.abs(20-hit.timeOfImpact-g.environment.surfaceHeight(x,z))<.001);
  }
  const far=g.soldiers.find(s=>s.body.translation().x>180);far.visibleToPlayer=false;far.ai.engaged=false;
  for(let i=0;i<4;i++){g.infantry.update(1/60);g.world.step();assert.ok(Number.isFinite(far.body.translation().y));}
  far.ai.sees=true;const physicalTier=far.movementState.tier;g.infantry.update(1/60);assert.equal(far.movementState.tier,physicalTier,'sight alone does not raise movement detail');
  const jeeps=g.tanks.filter(t=>t.enemy);
  for(const jeep of jeeps.slice(0,8))g.hurt(jeep,100000,g.player);
  assert.equal(g.mode,'playing');assert.equal(g.kills,8);
  for(const jeep of jeeps.slice(8))g.hurt(jeep,100000,g.player);
  assert.equal(g.kills,JEEP_COUNT);assert.equal(g.mode,'results');assert.equal(g.credits,JEEP_COUNT*120+300);
 }finally{freeWorld(g);}
});

test('tank can launch and land from a ridge and a stone ramp',async()=>{
 const g=await worldFixture(false),t=g.player,ridge=JUMP_RIDGES[0];
 try{
  for(const ramp of [ridge,{...ridge,x:ridge.x+Math.cos(ridge.yaw)*22,z:ridge.z-Math.sin(ridge.yaw)*22}])for(const boost of [false,true]){
   const forward=new THREE.Vector3(Math.sin(ramp.yaw),0,Math.cos(ramp.yaw)),start=new THREE.Vector3(ramp.x,0,ramp.z).addScaledVector(forward,-55);
   start.y=g.environment.surfaceHeight(start.x,start.z)+1.05;
   t.body.setTranslation(start,true);t.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ramp.yaw),true);
   t.body.setLinvel({x:0,y:0,z:0},true);t.body.setAngvel({x:0,y:0,z:0},true);t.turboCharge=1;t.turboLocked=false;g.world.step();g.syncTank(t);
   const aim=start.clone().addScaledVector(forward,150);let air=0,landed=false,clearance=0;
   for(let i=0;i<480;i++){
    g.drive(t,{throttle:1,boost,steer:0,brake:false,aim,fire:false,secondary:false},1/60);g.world.step();g.syncTank(t);
    const p=t.body.translation();if(new THREE.Vector3().copy(p).sub(start).dot(forward)<45)continue;
    clearance=Math.max(clearance,p.y-g.environment.surfaceHeight(p.x,p.z));
    if(!t.grounded)air++;else if(air>3)landed=true;
   }
   assert.ok(air>=8,'sustained airborne launch');assert.ok(clearance>2,'clears the terrain');assert.ok(landed,'lands after launch');
  }
 }finally{freeWorld(g);}
});

test('turbo cannot drive through frontier fences on any edge',async()=>{
 const g=await worldFixture(false),t=g.player;
 try{
  for(let side=0;side<4;side++){
   const yaw=side*Math.PI/2,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
   const start=forward.clone().multiplyScalar(MAP_SIZE/2-38).addScaledVector(right,-155);start.y=g.environment.surfaceHeight(start.x,start.z)+1.05;
   t.body.setTranslation(start,true);t.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),true);t.body.setLinvel({x:0,y:0,z:0},true);t.body.setAngvel({x:0,y:0,z:0},true);t.turboCharge=1;t.turboLocked=false;
   const aim=start.clone().addScaledVector(forward,100);
   for(let i=0;i<300;i++){g.drive(t,{throttle:1,boost:true,steer:0,aim},1/60);g.world.step();g.syncTank(t);const p=t.body.translation();assert.ok(Math.max(Math.abs(p.x),Math.abs(p.z))<MAP_SIZE/2-3,'chassis stays inside boundary');}
   assert.ok(new THREE.Vector3().copy(t.body.translation()).dot(forward)>MAP_SIZE/2-15,'reaches the barrier');
  }
 }finally{freeWorld(g);}
});

test('deployment warm-up advances live simulation without consuming match time or player commands',async()=>{
 const g=await worldFixture();try{
  g.player.body.setLinvel({x:3,y:0,z:2},true);g.player.body.setAngvel({x:0,y:1,z:0},true);
  g.setDeploymentIntro(true);const timer=g.timer,time=g.time,hp=g.player.hp;
  const position={...g.player.body.translation()},rotation={...g.player.body.rotation()};
  g.keys.add('KeyW');g.keys.add('Space');
  for(let i=0;i<120;i++){g.step(1/60);assert.deepEqual({...g.player.body.translation()},position);assert.deepEqual({...g.player.body.rotation()},rotation);}
  assert.equal(g.timer,timer);assert.equal(g.player.hp,hp);assert.equal(g.shells.length,0);assert.ok(g.time>time);
  assert.equal(g.commandFor(g.player).throttle,0);g.keys.clear();g.setDeploymentIntro(false);
  assert.equal(g.player.body.bodyType(),RAPIER.RigidBodyType.Dynamic);
  assert.deepEqual({...g.player.body.linvel()},{x:0,y:0,z:0});
  g.keys.add('KeyW');for(let i=0;i<120;i++)g.step(1/60);
  assert.ok(g.timer<timer);assert.ok(Math.hypot(g.player.body.translation().x-position.x,g.player.body.translation().z-position.z)>2,'controls move the tank after the intro');
 }finally{freeWorld(g);}
});
