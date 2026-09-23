import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Navigation,NAV_SIZE} from '../src/navigation.js';
import {InfantryRoutes} from '../src/infantry-routes.js';

test('nearby troops share a corridor with independent waypoint arrays',()=>{
 const nav=new Navigation({time:0,props:[]},.55);nav.refresh();nav.blocked.fill(0);
 const routes=new InfantryRoutes(nav),a=routes.route(new THREE.Vector3(0,0,0),new THREE.Vector3(40,0,40));
 const b=routes.route(new THREE.Vector3(2,0,0),new THREE.Vector3(42,0,40));
 assert.equal(routes.searches,1);assert.equal(routes.hits,1);
 const saved=b.map(p=>p.clone());a.shift();a[0].set(999,0,999);
 assert.deepEqual(b,saved);assert.equal(b.at(-1).x,42);
 for(let i=1;i<b.length;i++)assert.ok(nav.clearGrid(b[i-1],b[i]));
});

test('shared routes cannot bridge a blocked connector and expire when navigation refreshes',()=>{
 const g={time:0,props:[]},nav=new Navigation(g,.55);nav.refresh();nav.blocked.fill(0);
 const routes=new InfantryRoutes(nav),to=new THREE.Vector3(40,0,0);
 routes.route(new THREE.Vector3(2,0,0),to);
 const middle=Math.floor(NAV_SIZE/2);for(let z=0;z<NAV_SIZE;z++)nav.blocked[z*NAV_SIZE+middle]=1;
 assert.deepEqual(routes.route(new THREE.Vector3(-2,0,0),to),[]);assert.equal(routes.hits,0);
 g.time=2;routes.route(new THREE.Vector3(2,0,0),to);assert.equal(routes.searches,3);
});
