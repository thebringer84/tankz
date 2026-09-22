import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {MAP_SIZE,JUMP_RIDGES} from '../src/config.js';
import {ROCK_SITES,inJumpLane} from '../src/world-layout.js';
import {worldFixture,freeWorld} from './world-fixture.js';
await RAPIER.init();

test('expanded world has distributed patrols, open jump lanes and local terrain updates',async()=>{
 const g=await worldFixture();
 try{
  assert.ok(Math.abs(MAP_SIZE**2/220**2-6)<1e-10);
  assert.equal(g.soldiers.length,250);assert.equal(g.tanks.filter(t=>t.enemy).length,25);
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
  const elapsed=[];for(let i=0;i<4;i++){g.infantry.update(1/60);elapsed.push(far.movementElapsed);g.world.step();}
  assert.equal(elapsed.filter(t=>t===0).length,1);assert.ok(elapsed.some(t=>t>=2/60));
  far.ai.engaged=true;g.infantry.update(1/60);assert.equal(far.movementElapsed,0);
  const jeeps=g.tanks.filter(t=>t.enemy);
  for(const jeep of jeeps.slice(0,8))g.hurt(jeep,100000,g.player);
  assert.equal(g.mode,'playing');assert.equal(g.kills,8);
  for(const jeep of jeeps.slice(8))g.hurt(jeep,100000,g.player);
  assert.equal(g.kills,25);assert.equal(g.mode,'results');assert.equal(g.credits,3300);
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
