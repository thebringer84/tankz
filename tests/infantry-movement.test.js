import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {InfantryMovement} from '../src/infantry-movement.js';
await RAPIER.init();

function fixture(){
 const world=new RAPIER.World({x:0,y:-18,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(50,.2,50).setTranslation(0,-.2,0));
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.725,0));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.4,.3),body);
 const s={body,collider,ai:{sees:false,engaged:true},visibleToPlayer:false};
 const g={world,entities:new Map([[collider.handle,{infantry:true}]]),time:0,tanks:[],props:[],shells:[],debris:[]};
 const movement=new InfantryMovement(g),controller=world.createCharacterController(.025);controller.enableSnapToGround(.4);
 const nav={blocked:[0],index:()=>0,clearGrid:()=>true};let calls=0;
 const compute=controller.computeColliderMovement.bind(controller);controller.computeColliderMovement=(...args)=>{calls++;return compute(...args);};
 world.step();
 const tick=(velocity=new THREE.Vector3(2,0,0))=>{g.time+=1/60;movement.prepare();const p=new THREE.Vector3().copy(body.translation());movement.tier(s,p,1/60);movement.move(s,p,velocity,1/60,controller,nav);world.step();return body.translation();};
 return {g,s,world,movement,controller,nav,tick,calls:()=>calls};
}

for(const engaged of [false,true])test(`${engaged?'engaged':'distant'} movement keeps physical capsules current at 60 Hz with fewer full queries`,()=>{
 const f=fixture();try{
  f.s.ai.sees=engaged;
  f.tick();const start=f.s.body.translation().x;let last=start;
  for(let i=0;i<120;i++){const p=f.tick();assert.ok(p.x>last,'capsule advances on every tick');assert.ok(Math.abs(p.y-.725)<.04);last=p.x;}
  assert.ok(Math.abs(last-start-4)<.05,'two seconds preserve requested patrol speed');
  assert.ok(f.calls()<20,`expected amortized movement queries, got ${f.calls()}`);
  assert.equal(f.s.movementState.tier,2,'sight does not raise physical movement detail');
  const p=f.s.body.translation();const hit=f.world.castRay(new RAPIER.Ray({x:p.x,y:p.y,z:-2},{x:0,y:0,z:1}),4,true);
  assert.equal(hit.collider.handle,f.s.collider.handle,'distant soldier remains hittable');
 }finally{f.world.free();}
});

test('stationary engaged soldiers retain current hitboxes with fewer controller queries',()=>{
 const f=fixture();try{
  f.s.ai.sees=true;const zero=new THREE.Vector3();
  for(let i=0;i<120;i++)f.tick(zero);
  assert.equal(f.s.movementState.tier,2);assert.ok(f.calls()<25,`stationary controller calls: ${f.calls()}`);
  const p=f.s.body.translation();assert.ok(Math.abs(p.y-.725)<.01);assert.ok(Math.abs(p.x)<.001);
  const hit=f.world.castRay(new RAPIER.Ray({x:0,y:p.y,z:-2},{x:0,y:0,z:1}),4,true);
  assert.equal(hit.collider.handle,f.s.collider.handle);
  const before=f.calls();f.tick(new THREE.Vector3(2,0,0));assert.equal(f.calls(),before+1);assert.ok(f.s.body.translation().x>0);
 }finally{f.world.free();}
});

test('stationary combat wakes immediately for hazards, displacement and lost support',()=>{
 for(const reason of ['projectile','damage','displacement','support']){
  const f=fixture();try{
   f.s.ai.sees=true;const zero=new THREE.Vector3();for(let i=0;i<3;i++)f.tick(zero);
   assert.ok(f.s.movementState.hold);const before=f.calls();
   if(reason==='projectile')f.g.shells=[{body:{translation:()=>({x:20,y:1,z:0}),linvel:()=>({x:-100,y:0,z:0})}}];
   if(reason==='damage')f.s.recentDamageUntil=f.g.time+1;
   if(reason==='displacement')f.s.body.setTranslation({x:1,y:.725,z:0},true);
   if(reason==='support'){const hit=f.world.castRay(new RAPIER.Ray({x:2,y:2,z:0},{x:0,y:-1,z:0}),4,true);f.world.removeCollider(hit.collider,true);f.world.step();}
   f.tick(zero);assert.equal(f.calls(),before+1,reason);
   if(reason==='support')assert.ok(f.s.body.translation().y<.7,'removed support cannot leave a floating soldier');
  }finally{f.world.free();}
 }
});

for(const engaged of [false,true])test(`${engaged?'engaged':'distant'} thin walls reject a cached corridor and the full controller prevents tunneling`,()=>{
 const f=fixture();try{
  f.s.ai.sees=engaged;
  f.world.createCollider(RAPIER.ColliderDesc.cuboid(.02,1,4).setTranslation(.6,1,0));f.world.step();
  for(let i=0;i<90;i++)f.tick();
  assert.ok(f.s.body.translation().x<.3);assert.ok(f.calls()>20,'obstruction falls back to full controller');
 }finally{f.world.free();}
});

test('engaged corridor reuse waits for physical hazards to clear',()=>{
 const f=fixture();try{
  f.s.ai.sees=true;for(let i=0;i<20;i++)f.tick();assert.ok(f.s.movementState.segment);
  f.s.recentDamageUntil=f.g.time+.03;const before=f.calls();f.tick();assert.equal(f.calls(),before+1);assert.equal(f.s.movementState.segment,null);
  for(let i=0;i<20;i++)f.tick();assert.equal(f.s.movementState.collisionQuiet<.5,true);assert.equal(f.s.movementState.segment,null);
  for(let i=0;i<20;i++)f.tick();assert.ok(f.s.movementState.segment);assert.equal(f.s.movementState.tier,2);
 }finally{f.world.free();}
});

test('incoming projectiles, fast vehicles and recent damage promote immediately; demotion is delayed',()=>{
 const f=fixture();try{
  for(let i=0;i<20;i++)f.tick();assert.ok(f.s.movementState.segment);
  const before=f.calls(),p=f.s.body.translation();
  f.g.shells.push({body:{translation:()=>({x:p.x+20,y:1,z:0}),linvel:()=>({x:-100,y:0,z:0})}});
  f.tick();assert.equal(f.s.movementState.tier,0);assert.equal(f.calls(),before+1);assert.equal(f.s.movementState.segment,null);
  f.g.shells=[];for(let i=0;i<10;i++)f.tick();assert.equal(f.s.movementState.tier,0);
  for(let i=0;i<35;i++)f.tick();assert.equal(f.s.movementState.tier,2);
  f.g.player={body:{translation:()=>({x:f.s.body.translation().x+10,y:1,z:0}),linvel:()=>({x:-40,y:0,z:0})}};f.g.tanks=[f.g.player];
  f.tick();assert.equal(f.s.movementState.tier,0,'turbo approach promotes before contact');
  f.g.tanks=[];f.s.recentDamageUntil=f.g.time+1;for(let i=0;i<40;i++)f.tick();assert.equal(f.s.movementState.tier,0);
 }finally{f.world.free();}
});

test('reveal changes detail and turning never reuses a stale movement segment',()=>{
 const f=fixture();try{
  for(let i=0;i<20;i++)f.tick();const start=f.s.body.translation();
  f.s.visibleToDrone=true;f.tick(new THREE.Vector3(0,0,2));
  const next=f.s.body.translation();assert.equal(f.s.movementState.tier,1);assert.ok(Math.abs(next.x-start.x)<.001);assert.ok(next.z>start.z);
  f.s.ai.sees=true;f.tick();assert.equal(f.s.movementState.tier,1);
 }finally{f.world.free();}
});

test('invalid support, slopes and blocked navigation refuse simplified movement',()=>{
 const f=fixture();try{
  const p=new THREE.Vector3().copy(f.s.body.translation()),motion=new THREE.Vector3(2,0,0),filter=()=>true;
  f.nav.blocked[0]=1;assert.equal(f.movement.validate(f.s,p,motion,.2,f.nav,filter),null);f.nav.blocked[0]=0;
  const cast=f.world.castRayAndGetNormal.bind(f.world);
  f.world.castRayAndGetNormal=()=>null;assert.equal(f.movement.validate(f.s,p,motion,.2,f.nav,filter),null);
  f.world.castRayAndGetNormal=(...args)=>({...cast(...args),normal:{x:.7,y:.7,z:0}});
  assert.equal(f.movement.validate(f.s,p,motion,.2,f.nav,filter),null);
 }finally{f.world.free();}
});

test('seeing a nearby tank preserves cheap movement outside its swept contact footprint',()=>{
 const f=fixture();try{
  f.s.ai.sees=true;f.s.visibleToPlayer=true;
  f.g.player={cfg:{scale:1},body:{translation:()=>({x:12,y:1,z:0}),linvel:()=>({x:0,y:0,z:0})}};
  f.g.tanks=[f.g.player];
  for(let i=0;i<60;i++)f.tick();
  assert.equal(f.s.movementState.tier,1);assert.ok(f.calls()<10);
  f.g.player.body.linvel=()=>({x:-50,y:0,z:0});
  const before=f.calls();f.tick();assert.equal(f.s.movementState.tier,0);assert.equal(f.calls(),before+1);
 }finally{f.world.free();}
});
