import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Infantry} from '../src/infantry.js';
import {Navigation,NAV_SIZE} from '../src/navigation.js';

function planner(){const infantry=Object.create(Infantry.prototype);Object.assign(infantry,{coverJobs:new Map(),routeJobs:new Map(),neighbors:new Map(),game:{soldiers:[]}});return infantry;}

test('simultaneous horde planning is bounded, fair, and drops dead units',()=>{
 const infantry=planner(),completed=new Set();let routes=0,coverSteps=0;
 infantry.navigation={route(p,goal){routes++;completed.add(p.id);return [goal.clone()];}};
 for(let i=0;i<200;i++){
  const s={index:i,ai:{engaged:true},body:{translation:()=>({id:i})}};
  infantry.game.soldiers.push(s);
  infantry.routeJobs.set(s,new THREE.Vector3(i,0,0));
  infantry.coverJobs.set(s,(function*(){for(let j=0;j<6;j++){coverSteps++;yield;}return null;})());
 }
 infantry.game.soldiers[0].dead=true;
 for(let tick=0;tick<400;tick++){
  const beforeRoutes=routes,beforeCover=coverSteps;infantry.plan();
  assert.ok(routes-beforeRoutes<=4);assert.ok(coverSteps-beforeCover<=32);
 }
 assert.equal(completed.size,199);assert.ok(!completed.has(0));
 assert.equal(infantry.routeJobs.size,0);assert.equal(infantry.coverJobs.size,0);
});

test('spatial separation matches all-pairs forces across negative coordinates and cell edges',()=>{
 const infantry=planner();
 for(let i=0;i<240;i++){
  const p={x:(i%20)*.6-6.01,y:0,z:Math.floor(i/20)*.6-3.31};
  infantry.game.soldiers.push({dead:i%19===0,body:{translation:()=>p}});
 }
 infantry.rebuildNeighbors();
 for(const s of infantry.game.soldiers){if(s.dead)continue;const p=s.body.translation(),expected=new THREE.Vector3(),actual=new THREE.Vector3();
  for(const other of infantry.game.soldiers){if(other===s||other.dead)continue;const offset=new THREE.Vector3().copy(p).sub(other.body.translation()),d=offset.length();if(d>0&&d<1.1)expected.addScaledVector(offset,(1.1-d)*2/d);}
  infantry.separate(s,p,actual);assert.ok(actual.distanceTo(expected)<1e-10);
 }
});

test('heap searches recover from unreachable routes and return independent valid paths',()=>{
 const nav=new Navigation({time:0,props:[]});nav.refresh();nav.blocked.fill(0);
 const middle=Math.floor(NAV_SIZE/2);for(let z=0;z<NAV_SIZE;z++)nav.blocked[z*NAV_SIZE+middle]=1;
 const from={x:-40,z:-40},to={x:40,z:-40};assert.deepEqual(nav.route(from,to),[]);
 nav.blocked[(NAV_SIZE-2)*NAV_SIZE+middle]=0;const path=nav.route(from,to),saved=path.map(p=>p.toArray());
 assert.ok(path.length>100);
 for(let i=1;i<path.length;i++)assert.ok(nav.clearGrid(path[i-1],path[i]));
 assert.ok(nav.route(to,from).length);assert.deepEqual(path.map(p=>p.toArray()),saved);
 nav.blocked.fill(0);const straight=nav.route({x:1,z:1},{x:21,z:21});
 assert.equal(straight.length,11);
});

test('catch-up ticks share the same render-frame planning budget',()=>{
 const infantry=planner();let routes=0,cover=0;
 infantry.navigation={route(){routes++;return [];}};
 for(let i=0;i<40;i++){
  const s={index:i,ai:{engaged:true},body:{translation:()=>({x:0,z:0})}};
  infantry.routeJobs.set(s,new THREE.Vector3());
  infantry.coverJobs.set(s,(function*(){for(let j=0;j<100;j++){cover++;yield;}})());
 }
 infantry.beginFrame();for(let i=0;i<5;i++)infantry.plan();
 assert.equal(routes,4);assert.ok(cover<=32);infantry.endFrame();
 infantry.beginFrame();infantry.plan();infantry.endFrame();assert.equal(routes,8);
});
