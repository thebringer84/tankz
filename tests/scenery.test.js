import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Scenery} from '../src/scenery.js';
import {Game} from '../src/game.js';
import {Effects} from '../src/effects.js';
import {makeMaterials} from '../src/models.js';
await RAPIER.init();
function setup(){const g=Object.create(Game.prototype);Object.assign(g,{world:new RAPIER.World({x:0,y:-18,z:0}),root:new THREE.Group(),materials:makeMaterials({}),textures:{},tanks:[],props:[],debris:[],entities:new Map(),nextId:1,rand:()=>.5,audio:{boom(){}},ammo:'ap',shake:0});g.world.createCollider(RAPIER.ColliderDesc.cuboid(150,.2,150).setTranslation(0,-.2,0));g.fx=new Effects(g.root,new THREE.Texture());g.player=g.spawnTank('medium',0,0,false);g.scenery=new Scenery(g);return g;}
test('five reactive scenery types spawn as physical cover and break into their own pieces',()=>{const g=setup();for(const [i,type] of ['car','crate','barricade','fuel','generator'].entries()){const p=g.scenery.spawn(type,20+i*12,10);assert.ok(p.body.isDynamic());assert.equal(g.entities.get(p.collider.handle),p);g.hurt(p,1000,g.player);assert.ok(p.destroyed);if(type==='car'){assert.ok(p.crushed&&p.mesh.scale.y<.3);assert.ok(p.body.isValid());}else {assert.equal(p.mesh.parent,null);assert.equal(g.entities.has(p.collider.handle),false);}}assert.ok(g.debris.length>25&&g.debris.length<=90);assert.ok(g.debris.every(d=>d.body.isDynamic()));g.world.free();});
test('tank contact breaks a wooden crate and tank can clear a flattened car',()=>{const g=setup(),crate=g.scenery.spawn('crate',0,6);crate.body.setTranslation({x:0,y:.68,z:6},true);const cmd={throttle:1,steer:0,brake:false,aim:new THREE.Vector3(0,0,50),fire:false,secondary:false};for(let i=0;i<300;i++){g.drive(g.player,cmd,1/60);g.world.step();g.scenery.update(1/60);}assert.ok(crate.destroyed);const car=g.scenery.spawn('car',0,60);g.hurt(car,1000,g.player);car.body.setTranslation({x:0,y:.21,z:60},true);car.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);g.player.body.setTranslation({x:0,y:1,z:53},true);g.player.body.setLinvel({x:0,y:0,z:0},true);for(let i=0;i<300;i++){g.drive(g.player,cmd,1/60);g.world.step();}assert.ok(g.player.body.translation().z>65);g.world.free();});
