import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {snapshotVehicle,presentVehicle,followCamera} from '../src/motion-presentation.js';
import {FIXED_DT} from '../src/config.js';
import {Game} from '../src/game.js';

function vehicle(){const position=new THREE.Vector3(),rotation=new THREE.Quaternion();return {root:new THREE.Group(),body:{translation:()=>position,rotation:()=>rotation},position,rotation,wheels:[],speed:12};}
for(const hz of [60,75,90,120,144,165])test(`constant-speed presentation remains smooth at ${hz} Hz`,()=>{
 const t=vehicle();snapshotVehicle(t);let acc=0,time=0,last=0;
 for(let frame=0;frame<hz*3;frame++){
  const dt=1/hz;time+=dt;acc+=dt;
  while(acc+1e-12>=FIXED_DT){snapshotVehicle(t);t.position.x+=12*FIXED_DT;acc-=FIXED_DT;}
  const physics=t.position.clone();presentVehicle(t,Math.max(0,acc/FIXED_DT));
  if(frame>2)assert.ok(Math.abs(t.root.position.x-last-12*dt)<1e-9,'no repeated pose or double-sized movement');
  assert.deepEqual(t.position,physics,'presentation never changes simulation');last=t.root.position.x;
 }
});
test('interpolation handles variable frame intervals, rotations and teleport resets',()=>{
 const t=vehicle();snapshotVehicle(t);let acc=0,time=0;
 for(let i=0;i<200;i++){
  const dt=[.008,.014,.009,.025,.011][i%5];acc+=dt;time+=dt;
  while(acc>=FIXED_DT){snapshotVehicle(t);t.position.x+=12*FIXED_DT;acc-=FIXED_DT;}
  presentVehicle(t,acc/FIXED_DT);if(time>FIXED_DT)assert.ok(Math.abs(t.root.position.x-12*(time-FIXED_DT))<1e-9);
 }
 snapshotVehicle(t);t.rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);presentVehicle(t,.5);
 assert.ok(Math.abs(t.root.rotation.y-Math.PI/4)<1e-9);
 t.position.x+=100;presentVehicle(t,.1);assert.equal(t.root.position.x,t.position.x);
 Game.prototype.syncTank.call({},t);assert.deepEqual(t.root.position,t.position);
});
test('camera gaze and position share an anchor; render shake cannot feed back into follow motion',()=>{
 const g={camera:new THREE.PerspectiveCamera(),zoom:1},target=new THREE.Vector3();followCamera(g,target,10);
 const rotation=g.camera.quaternion.clone();
 for(let i=0;i<240;i++){
  target.set(i*.1,Math.sin(i*.1)*.3,i*.07);followCamera(g,target,1/120);
  assert.ok(g.camera.quaternion.angleTo(rotation)<1e-7,'translation must not introduce camera pitch/yaw pulses');
  g.camera.position.x+=2; // Render-only shake must not alter the next follow state.
 }
 const expected=g.cameraRig.anchor.clone().add(g.cameraRig.offset);followCamera(g,target,0);
 assert.ok(g.camera.position.distanceTo(expected)<1e-10);
});
