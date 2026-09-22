import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Effects} from '../src/effects.js';
import {WreckFires} from '../src/wreck-fires.js';
const setup=()=>{const root=new THREE.Group(),fx=new Effects(root,new THREE.Texture());return {root,fx,textures:{fireAtlas:new THREE.Texture()},rand:()=>.25};};
test('smoke sorts far to near and fades smoothly at birth and expiry',()=>{
 const g=setup(),camera=new THREE.PerspectiveCamera();
 for(const z of [-2,-10,-5])g.fx.emit(new THREE.Vector3(0,1,z),new THREE.Vector3(),0x555555,1,2,'smoke');
 g.fx.prepare(camera);assert.equal(g.fx.points.geometry.attributes.position.getZ(0),-10);assert.equal(g.fx.points.geometry.attributes.aAlpha.getX(0),0);
 g.fx.update(.5);g.fx.prepare(camera);assert.ok(g.fx.points.geometry.attributes.aAlpha.getX(0)>0);
 for(let i=0;i<30;i++)g.fx.update(.1);assert.equal(g.fx.particles.length,0);
});
test('wreck fire follows its husk, fades to smolder and returns to its pool',()=>{
 const g=setup(),fires=new WreckFires(g),p=new THREE.Vector3(2,1,3),target={body:{translation:()=>p},visibleToPlayer:true};
 fires.start(target,true);const item=fires.items[0];assert.equal(item.flames.length,3);fires.update(.2);p.x=7;fires.update(.2);assert.equal(item.group.position.x,7);
 for(let i=0;i<160;i++)fires.update(.1);assert.equal(item.flames[0].material.uniforms.intensity.value,0);assert.equal(item.light.intensity,0);assert.ok(g.fx.particles.length>0);
 for(let i=0;i<120;i++)fires.update(.1);assert.equal(fires.items.length,0);assert.equal(item.group.visible,false);assert.ok(item.group.parent===g.root,'expired fire stays in the prepared pool');
});
test('non-burning wrecks only smolder briefly; fire sources are bounded and hidden wrecks do not emit',()=>{
 const g=setup(),fires=new WreckFires(g);g.rand=()=>.95;
 for(let i=0;i<9;i++)fires.start({body:{translation:()=>new THREE.Vector3()},visibleToPlayer:false});
 assert.equal(fires.items.length,3);assert.ok(fires.items.every(i=>i.flames.length===0));fires.update(1);assert.equal(g.fx.particles.length,0);fires.update(5);assert.equal(fires.items.length,0);
});

test('screen smoke remains low and both emitters and particles expire',()=>{const g=setup();g.fx.screenSmoke(new THREE.Vector3(0,1,0),8,4.5);for(let i=0;i<30;i++)g.fx.update(.1);assert.ok(g.fx.particles.some(p=>p.screen));assert.ok(g.fx.particles.filter(p=>p.screen).every(p=>p.p.y<2.5));for(let i=0;i<80;i++)g.fx.update(.1);assert.equal(g.fx.screens.length,0);assert.equal(g.fx.particles.length,0);});

test('wreck ignition and extinction keep scene light count fixed and flash lights separate',()=>{const g=setup(),fires=new WreckFires(g),count=()=>{let n=0;g.root.traverse(o=>{if(o.isPointLight)n++;});return n;},before=count();fires.start({body:{translation:()=>new THREE.Vector3()},visibleToPlayer:true},true);fires.update(.2);const intensity=fires.items[0].light.intensity;g.fx.flash(new THREE.Vector3(),300,.2);g.fx.update(.01);assert.equal(fires.items[0].light.intensity,intensity);assert.equal(count(),before);fires.update(40);assert.equal(count(),before);});

test('sand dust keeps one source per track, increases with speed and lingers near its origin',()=>{const slow=setup(),fast=setup(),p=new THREE.Vector3(0,1,0),side=new THREE.Vector3(1,0,0);slow.fx.dust(p,new THREE.Vector3(0,0,2),1,side);fast.fx.dust(p,new THREE.Vector3(0,0,14),1,side);assert.equal(fast.fx.particles.length,1);assert.equal(slow.fx.particles.length,1);const a=slow.fx.particles[0],b=fast.fx.particles[0];assert.ok(b.size>a.size);assert.ok(b.total>a.total);assert.ok(b.v.x>a.v.x);assert.ok(b.density>a.density);const initial=b.p.x;fast.fx.update(.5);assert.ok(b.p.x>initial);assert.ok(b.p.x<initial+.7);assert.ok(b.life>4);});

test('tank damage smoke grows denser and darker at 40, 30 and 20 percent health',()=>{const totals=[],colors=[];for(const ratio of [.41,.4,.3,.2]){const g=setup(),tank={hp:1000*ratio,cfg:{hp:1000,scale:1},root:new THREE.Group(),body:{linvel:()=>({x:0,y:0,z:0})}};for(let i=0;i<60;i++)g.fx.damageSmoke(tank,1/60);totals.push(g.fx.particles.length);colors.push(g.fx.particles[0]?.color.r??1);}assert.equal(totals[0],0);assert.ok(totals[1]>0&&totals[2]>totals[1]&&totals[3]>totals[2]);assert.ok(colors[1]>colors[2]&&colors[2]>colors[3]);});

test('jeep explosion variants differ, shockwaves are bounded and all transient effects expire',()=>{const signatures=[];for(const variant of ['fuel','pressure','cookoff']){const {fx}=setup();assert.equal(fx.explosion(new THREE.Vector3(),1.25,variant),variant);signatures.push(fx.particles.filter(p=>p.kind==='fire').map(p=>p.delay+p.total).reduce((a,b)=>a+b,0));assert.ok(fx.particles.some(p=>p.blast));assert.ok(fx.particles.some(p=>p.blastDust));const wave=fx.shockwaves.find(w=>w.mesh.visible);fx.update(.2);const radius=wave.mesh.scale.x;fx.update(.2);assert.ok(wave.mesh.scale.x>radius);for(let i=0;i<120;i++)fx.update(.1);assert.equal(fx.particles.length,0);assert.ok(fx.shockwaves.every(w=>!w.mesh.visible));for(let i=0;i<20;i++)fx.explosion(new THREE.Vector3());assert.equal(fx.shockwaves.length,8);fx.clear();assert.ok(fx.shockwaves.every(w=>!w.mesh.visible));}assert.equal(new Set(signatures).size,3);});

test('muzzle flashes follow a moving muzzle briefly and release pooled slots',()=>{const {fx}=setup(),anchor=new THREE.Object3D();anchor.position.set(2,1,3);fx.muzzleJet(anchor.position,new THREE.Vector3(0,0,1),2,anchor);const flash=fx.muzzleFlashes.find(f=>f.life>0);anchor.position.x=5;fx.update(.016);assert.equal(flash.group.position.x,5);assert.ok(flash.group.visible);fx.update(.1);assert.equal(flash.group.visible,false);for(let i=0;i<50;i++)fx.muzzleJet(new THREE.Vector3(),new THREE.Vector3(1,0,0));assert.equal(fx.muzzleFlashes.length,24);fx.clear();assert.ok(fx.muzzleFlashes.every(f=>f.life===0&&!f.group.visible));});
