import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Visibility} from '../src/visibility.js';
import {EnemyDirector,createPatrol} from '../src/ai.js';
await RAPIER.init();
function setup(){const g={world:new RAPIER.World({x:0,y:0,z:0}),entities:new Map(),smokeClouds:[],tanks:[],time:0,onEvent(){}};function unit(x,z,enemy){const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,1,z)),collider=g.world.createCollider(RAPIER.ColliderDesc.cuboid(1,.8,1),body);const t={body,collider,enemy,root:new THREE.Group(),aiPhase:0};t.ai=createPatrol(t);g.entities.set(collider.handle,t);g.tanks.push(t);return t;}g.player=unit(0,0,false);g.enemy=unit(0,25,true);g.unit=unit;g.world.step();g.visibility=new Visibility(g);g.director=new EnemyDirector(g);g.tick=(n)=>{for(let i=0;i<n;i++){g.time+=.1;g.director.update(.1);}};return g;}
test('cover blocks both observers and destruction restores sight; intervening smoke also blocks',()=>{const g=setup();assert.ok(g.visibility.canSee(g.player,g.enemy));assert.ok(g.visibility.canSee(g.enemy,g.player));const wall=g.world.createCollider(RAPIER.ColliderDesc.cuboid(5,4,1).setTranslation(0,2,12));g.world.step();assert.equal(g.visibility.canSee(g.player,g.enemy),false);assert.equal(g.visibility.canSee(g.enemy,g.player),false);g.world.removeCollider(wall,true);g.world.step();assert.ok(g.visibility.canSee(g.player,g.enemy));g.smokeClouds.push({p:new THREE.Vector3(0,1,12),radius:4});assert.equal(g.visibility.canSee(g.player,g.enemy),false);g.visibility.dispose();g.world.free();});
test('patrol recognition, delayed local radio and staggered arrivals avoid global alerts',()=>{const g=setup(),near=g.unit(20,25,true),far=g.unit(90,90,true);g.visibility.canSee=(observer)=>observer===g.enemy;assert.equal(g.enemy.ai.state,'patrol');g.tick(5);assert.equal(g.enemy.ai.engaged,false);g.tick(5);assert.equal(g.enemy.ai.state,'pursue');assert.equal(near.ai.state,'patrol');g.tick(29);assert.equal(g.director.transmissions,1);assert.equal(near.ai.state,'patrol');g.tick(15);assert.equal(near.ai.state,'investigate');assert.equal(far.ai.state,'patrol');g.visibility.dispose();g.world.free();});
test('killing a patrol before engagement prevents radio; losing sight freezes last known position',()=>{const g=setup();g.tick(4);g.enemy.dead=true;g.tick(80);assert.equal(g.director.transmissions,0);assert.equal(g.director.messages.length,0);g.enemy.dead=false;g.tick(10);const last=g.enemy.ai.lastKnown.clone();g.visibility.canSee=()=>false;g.player.body.setTranslation({x:40,y:1,z:0},true);g.tick(10);assert.equal(g.enemy.ai.state,'investigate');assert.deepEqual(g.enemy.ai.lastKnown,last);g.visibility.dispose();g.world.free();});

test('fog transitions progressively in both directions and independently of frame rate',()=>{const g=setup(),v=g.visibility;v.target.fill(255);v.animate(1/60);assert.ok(v.data[0]>0&&v.data[0]<255);const first=v.data[0];v.animate(1/60);assert.ok(v.data[0]>first);v.display.fill(0);for(let i=0;i<30;i++)v.animate(1/60);const sixty=v.display[0];v.display.fill(0);for(let i=0;i<15;i++)v.animate(1/30);assert.ok(Math.abs(v.display[0]-sixty)<.001);v.target.fill(0);v.animate(1/60);assert.ok(v.data[0]>0&&v.data[0]<sixty);v.animate(1);assert.equal(v.data[0],0);v.dispose();g.world.free();});

test('brief fog edge sightings do not reveal hidden units; sustained sightings fade both ways',()=>{
 const g=setup(),v=g.visibility;let sight=false;v.canSee=()=>sight;
 const tick=()=>{v.update(1/60);v.animate(1/60);};
 for(let i=0;i<30;i++){sight=i%2===0;tick();}
 assert.equal(g.enemy.visibilityOpacity,0);assert.equal(g.enemy.root.visible,false);
 sight=true;for(let i=0;i<7;i++)tick();assert.ok(g.enemy.visibilityOpacity>0&&g.enemy.visibilityOpacity<1);
 for(let i=0;i<20;i++)tick();assert.equal(g.enemy.visibilityOpacity,1);
 sight=false;for(let i=0;i<3;i++)tick();assert.equal(g.enemy.visibleToPlayer,false);assert.equal(g.enemy.visibilityOpacity,1,'brief obstruction must not blink the model');
 sight=true;tick();assert.equal(g.enemy.visibilityOpacity,1);
 sight=false;for(let i=0;i<12;i++)tick();assert.ok(g.enemy.visibilityOpacity>0&&g.enemy.visibilityOpacity<1);
 for(let i=0;i<20;i++)tick();assert.equal(g.enemy.root.visible,false);v.dispose();g.world.free();
});

test('unit fading isolates shared materials and releases clones before ragdoll reuse',()=>{
 const g=setup(),other=g.unit(5,20,true),shared=new THREE.MeshStandardMaterial(),a=new THREE.Mesh(new THREE.BoxGeometry(),shared),b=new THREE.Mesh(a.geometry,shared);
 g.enemy.root.add(a);other.root.add(b);g.visibility.track(g.enemy);g.visibility.track(other);
 assert.notEqual(a.material,b.material);assert.notEqual(a.material,shared);
 g.visibility.applyFade(g.enemy,{...g.visibility.units.get(g.enemy),opacity:.4});
 assert.equal(a.material.opacity,.4);assert.equal(b.material.opacity,0);assert.equal(shared.opacity,1);
 let disposed=0;a.material.addEventListener('dispose',()=>disposed++);g.visibility.release(g.enemy);
 assert.equal(disposed,1);assert.equal(a.material,shared);g.visibility.dispose();g.world.free();
});

test('moving infantry does not punch flickering holes in presentation visibility',()=>{
 const g=setup(),blocker=g.unit(0,12,true);blocker.infantry=true;g.player.infantry=true;g.world.step();
 assert.equal(g.visibility.canSee(g.player,g.enemy),false);
 assert.equal(g.visibility.canSee(g.player,g.enemy,65,true),true);
 g.smokeClouds.push({p:new THREE.Vector3(0,1,18),radius:3});assert.equal(g.visibility.canSee(g.player,g.enemy,65,true),false);
 g.visibility.dispose();g.world.free();
});
