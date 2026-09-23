import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {InfantryCrowd} from '../src/infantry-crowd.js';
import {skinCrew,restoreCrew} from '../src/infantry-skin.js';
import {createCrew,makeMaterials,box} from '../src/models.js';

function fixture(){
 const materials=makeMaterials({}),root=new THREE.Group(),crew=createCrew(materials),gun=new THREE.Group();
 box(gun,materials.dark,0,0,.2,.1,.1,.6);crew.root.add(gun);root.add(crew.root);skinCrew(crew);
 const p=new THREE.Vector3(50,0,0),s={root,crew,gun,body:{translation:()=>p},weapon:'mg',yaw:0,visibilityOpacity:1,gait:{phase:1,weight:1,run:0}};
 const g={root:new THREE.Group(),player:{body:{translation:()=>({x:0,z:0})}},soldiers:[s],time:0};g.root.add(root);
 return {s,g,p,crowd:new InfantryCrowd(g),free(){restoreCrew(crew);}};
}
test('crowd batching preserves fog, close detail, specialists and wounds',()=>{
 const f=fixture(),{s,crowd,p,g}=f;
 try{
  crowd.prepare();assert.equal(crowd.mesh.count,1);assert.equal(s.crew.skin.mesh.visible,false);assert.equal(s.gun.visible,false);
  assert.equal(crowd.mesh.geometry.getAttribute('crowdMotion').getX(0),1);
  s.visibilityOpacity=0;crowd.prepare();assert.equal(crowd.mesh.count,0);
  s.visibilityOpacity=.5;crowd.prepare();assert.equal(crowd.opacity.getX(0),.5);
  p.x=26;crowd.prepare();assert.equal(crowd.mesh.count,1,'hysteresis retains the existing representation');
  p.x=21;crowd.prepare();assert.equal(crowd.mesh.count,0);assert.equal(s.gun.visible,true);
  p.x=50;s.weapon='rpg';crowd.prepare();assert.equal(crowd.mesh.count,0);
  s.weapon='mg';g.autoTarget=s;crowd.prepare();assert.equal(crowd.mesh.count,0);
  g.autoTarget=null;s.wounded=true;crowd.prepare();assert.equal(crowd.mesh.count,0);
 }finally{crowd.dispose();f.free();}
});
test('crowd geometry includes body and weapon, and GPU poses patch color and shadow shaders',()=>{
 const f=fixture(),{crowd}=f;
 try{
  crowd.prepare();const geometry=crowd.mesh.geometry;
  assert.ok(Array.from(geometry.getAttribute('crowdPart').array).includes(11));
  for(const material of [crowd.mesh.material,crowd.mesh.customDepthMaterial,crowd.mesh.customDistanceMaterial]){
   const shader={vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};
   material.onBeforeCompile(shader);assert.match(shader.vertexShader,/crowdPose\(position,false\)/);assert.match(shader.fragmentShader,/vCrowdOpacity<=crowdThreshold/);
   if(material===crowd.mesh.material)assert.match(shader.vertexShader,/vSurface=surface/);
  }
 }finally{crowd.dispose();f.free();}
});
