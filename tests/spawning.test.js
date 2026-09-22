import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {offCameraSpawn} from '../src/spawning.js';
import {Game} from '../src/game.js';
test('spawn exclusion includes camera edges and defers when every candidate is visible',()=>{const camera=new THREE.PerspectiveCamera(60,1,.1,500);camera.position.set(0,80,0);camera.lookAt(0,0,0);const g={camera,player:{body:{translation:()=>({x:0,z:0})}}};assert.equal(offCameraSpawn(g,0,0),false);assert.equal(offCameraSpawn(g,44,0),false);assert.equal(offCameraSpawn(g,90,90),true);camera.position.y=300;g.tanks=[];g.spawned=0;g.spawnTank=()=>{throw Error('must defer')};assert.equal(Game.prototype.spawnEnemy.call(g,0),false);assert.equal(g.spawned,0);assert.equal(g.spawnTimer,1);});
