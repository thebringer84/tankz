import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Effects} from '../src/effects.js';
import {updateVehicleDust} from '../src/vehicle-dust.js';
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function setup(mass=1550){const fx=new Effects(new THREE.Group(),new THREE.Texture()),g={fx,environment:{surfaceHeight:()=>0,ruts:{softness:()=>1}}},t={cfg:{mass,scale:1},grounded:6,speed:0,yaw:0};return {g,t,fx};}
function tick(s,p=vec(),velocity=vec(),angular=vec(),dt=1/60){updateVehicleDust(s.g,s.t,dt,p,velocity,vec(0,0,1),vec(1,0,0),angular);s.fx.update(dt,false);}
test('both tracks feed an expanding shared wake, which drifts and persists after stopping',()=>{
 const s=setup();s.t.speed=12;for(let i=0;i<120;i++)tick(s,vec(0,1,i*.2),vec(0,0,12));
 const dust=s.fx.particles.filter(p=>p.vehicleDust);assert.ok(dust.some(p=>p.wake));assert.ok(dust.some(p=>!p.wake&&p.p.x<0)&&dust.some(p=>!p.wake&&p.p.x>0));
 s.fx.prepare(new THREE.PerspectiveCamera());assert.equal(s.fx.vehicleDust.mesh.geometry.instanceCount,dust.length);
 const a=s.fx.vehicleDust.mesh.geometry.attributes;assert.ok(Array.from(a.iSize.array).some(v=>v>7),'billows spread across the track gap');
 assert.ok(s.fx.tracks.renderOrder<s.fx.vehicleDust.mesh.renderOrder,'track decals must render beneath dust, not overlay it');
 const count=dust.length;s.t.speed=0;for(let i=0;i<60;i++)tick(s,vec(0,1,24));assert.ok(s.fx.particles.length>count*.5,'wake lingers after stopping');
 for(let i=0;i<600;i++)tick(s,vec(0,1,24));assert.equal(s.fx.particles.length,0);
});
test('stationary pivot churns a substantial cloud without requiring forward travel',()=>{
 const idle=setup(),pivot=setup();for(let i=0;i<180;i++){tick(idle);pivot.t.yaw=i/60;tick(pivot,vec(),vec(),vec(0,1.4,0));}
 assert.equal(idle.fx.particles.length,0);assert.ok(pivot.fx.particles.length>80);assert.ok(pivot.fx.particles.some(p=>p.wake));
});
test('landing burst scales with impact energy and ignores brief contact chatter or teleports',()=>{
 const drop=(mass,speed)=>{const s=setup(mass),hits=[];s.g.fx.landingDust=(...args)=>hits.push(args[3]);tick(s);s.t.grounded=0;for(let i=0;i<20;i++)tick(s,vec(0,2,0),vec(0,-speed,0));s.t.grounded=6;tick(s,vec(0,1,0),vec(0,-speed,0));for(let i=0;i<20;i++)tick(s,vec(0,1,0));assert.equal(hits.length,1);return hits[0];};
 assert.equal(drop(1550,6)/drop(1550,3),4);assert.equal(drop(2400,3)/drop(1000,3),2.4);
 const s=setup();let landings=0;s.fx.landingDust=()=>landings++;tick(s);s.t.grounded=0;tick(s,vec(0,1,0),vec(0,-8,0));s.t.grounded=6;tick(s);assert.equal(landings,0);
 s.t.grounded=0;for(let i=0;i<20;i++)tick(s,vec(0,3,0),vec(0,-8,0));s.t.grounded=6;tick(s,vec(100,1,100));assert.equal(landings,0);
});
test('harder landings produce larger, denser bursts within the existing particle budget',()=>{
 const soft=setup(),hard=setup();soft.fx.landingDust(vec(),0,1,3000);hard.fx.landingDust(vec(),0,1,70000);
 assert.ok(hard.fx.particles.length>soft.fx.particles.length);assert.ok(hard.fx.particles[0].size>soft.fx.particles[0].size);assert.ok(hard.fx.particles[0].density>soft.fx.particles[0].density);
 for(let i=0;i<100;i++)hard.fx.landingDust(vec(),0,1,70000);assert.ok(hard.fx.particles.length<=hard.fx.max);
 hard.fx.clear();assert.equal(hard.fx.vehicleDust.mesh.geometry.instanceCount,0);
});
