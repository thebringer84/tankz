import {markTextureRows} from './texture-updates.js';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight,MAP_SIZE} from './config.js';
const point=p=>new THREE.Vector3().copy(p);
// Optical height above the chassis determines the observer's horizon.
export function sightHeight(unit){return unit?.infantry?.65:unit?.jeep?.8:1.25*(unit?.cfg?.scale||1);}
export function sightRange(unit){return unit?.range??(unit?.infantry?32:unit?.jeep?38:40+20*(unit?.cfg?.scale||1));}
export class Visibility {
 constructor(game){this.game=game;this.screenPoint=new THREE.Vector3();this.size=Math.ceil(MAP_SIZE/1.375);this.extent=MAP_SIZE;this.data=new Uint8Array(this.size*this.size);this.target=new Uint8Array(this.data.length);this.display=new Float32Array(this.data.length);this.texture=new THREE.DataTexture(this.data,this.size,this.size,THREE.RedFormat);this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.needsUpdate=true;this.timer=0;this.units=new Map();this.fogActive=new Set();this.fogDirty=new Set();this.fogElapsed=0;}
 clearLine(observer,destination,target=null,ignoreInfantry=false){
  const scratch=this.lineScratch??={origin:new THREE.Vector3(),delta:new THREE.Vector3(),dir:new THREE.Vector3(),cloud:new THREE.Vector3(),nearest:new THREE.Vector3()};const g=this.game,origin=scratch.origin.copy(observer.body.translation());origin.y+=sightHeight(observer);
  const delta=scratch.delta.copy(destination).sub(origin),length=delta.length();if(length<.01)return true;
  const dir=scratch.dir.copy(delta).normalize();
  for(const cloud of g.smokeClouds||[]){const along=THREE.MathUtils.clamp(scratch.cloud.copy(cloud.p).sub(origin).dot(dir),0,length);if(scratch.nearest.copy(origin).addScaledVector(dir,along).distanceTo(cloud.p)<cloud.radius)return false;}
  const hit=g.world.castRay((scratch.ray??=new RAPIER.Ray(origin,dir)),Math.max(0,length-.15),true,undefined,undefined,undefined,observer.body,c=>{const e=g.entities.get(c.handle);return !e?.projectile&&(!ignoreInfantry||!e?.infantry||e===target);});
  return !hit||(target&&hit.collider.handle===target.collider.handle);
 }
 canSee(observer,target,range=sightRange(observer),ignoreInfantry=false){if(!observer||!target||observer.dead||target.dead)return false;const destination=point(target.body.translation());destination.y+=.55;const origin=observer.body.translation();return Math.hypot(origin.x-destination.x,origin.z-destination.z)<range&&this.clearLine(observer,destination,target,ignoreInfantry);}
 // Camera limits apply to player presentation, never enemy AI perception.
 screenWeight(position){
  const camera=this.game.camera;if(!camera)return 1;
  const p=this.screenPoint.copy(position).project(camera);if(p.z<=-1||p.z>=1)return 0;
  return 1-THREE.MathUtils.smoothstep(Math.max(Math.abs(p.x),Math.abs(p.y)),.88,1);
 }
 pointVisible(position){
  if(this.screenWeight(position)<=0)return false;
  const observers=[this.game.player],drone=this.game.drone?.active;if(drone?.ready)observers.push(drone);
  return observers.some(o=>{const p=o.body.translation();return Math.hypot(position.x-p.x,position.z-p.z)<sightRange(o)&&this.clearLine(o,position,null,true);});
 }
 sampledVisible(position){
  if(this.screenWeight(position)<=0)return false;
  const x=Math.floor((position.x/this.extent+.5)*this.size),z=Math.floor((position.z/this.extent+.5)*this.size);
  return x>=0&&z>=0&&x<this.size&&z<this.size&&this.target[z*this.size+x]>32;
 }
 track(unit){
  let state=this.units.get(unit);if(state)return state;
  state={parent:unit.root.parent,opacity:0,target:false,seen:0,lost:0,materials:new Map(),meshes:[],renderOrders:[]};
  // Clone once per distinct unit material, not per mesh or frame. This prevents
  // one soldier fading the whole squad through shared material references.
  const clone=material=>{if(!state.materials.has(material)){const copy=material.clone();if(material.userData.shaderPatch){copy.onBeforeCompile=material.userData.shaderPatch;copy.customProgramCacheKey=material.customProgramCacheKey;}copy.transparent=true;copy.userData.visibilityFade=true;copy.opacity=0;state.materials.set(material,copy);}return state.materials.get(material);};
  // Fading bodies must precede alpha dust/smoke. Their depth still occludes
  // particles behind them; foreground particles can then composite over them.
  unit.root.traverse(mesh=>{if(!mesh.material)return;state.meshes.push([mesh,mesh.material]);state.renderOrders.push([mesh,mesh.renderOrder]);mesh.renderOrder=-1;mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);});
  if(state.materials.has(unit.armor)){state.armor=unit.armor;unit.armor=state.materials.get(unit.armor);}
  this.units.set(unit,state);unit.visibilityOpacity=0;unit.root.visible=false;if(unit.infantry)unit.root.removeFromParent();return state;
 }
 release(unit){const state=this.units.get(unit);if(!state)return;if(unit.infantry&&!unit.root.parent)state.parent?.add(unit.root);for(const [mesh,order] of state.renderOrders)mesh.renderOrder=order;for(const [mesh,material] of state.meshes)mesh.material=material;if(state.armor)unit.armor=state.armor;for(const material of state.materials.values())material.dispose();this.units.delete(unit);unit.visibilityOpacity=undefined;}
 update(dt,force=false){
  // Fog samples the immutable base terrain, not the deforming track surface.
  // Cache its heights once instead of rebuilding thousands of samples per tick.
  if(!this.heights){this.heights=new Float64Array(this.size*this.size);for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)this.heights[z*this.size+x]=terrainHeight((x+.5)/this.size*this.extent-this.extent/2,(z+.5)/this.size*this.extent-this.extent/2);}
  const g=this.game;g.camera?.updateMatrixWorld();const drone=g.drone?.active;for(const units of [g.tanks,g.soldiers||[]])for(const t of units){if(!t.enemy)continue;if(t.dead){t.visibleToDrone=false;this.release(t);continue;}
   const state=this.track(t),onScreen=this.screenWeight(t.body.translation())>.05;t.visibleToDrone=!!(onScreen&&drone?.ready&&this.canSee(drone,t,drone.range,true));const seen=onScreen&&(this.canSee(g.player,t,sightRange(g.player),true)||t.visibleToDrone);t.visibleToPlayer=seen;
   state.seen=seen?state.seen+dt:0;state.lost=seen?0:state.lost+dt;
   // Schmitt-like temporal hysteresis filters single-tick edge occlusion. Combat
   // and auto-aim still use the immediate visibleToPlayer/canSee result.
   if(force){state.target=seen;state.opacity=seen?1:0;this.applyFade(t,state);}
   else if(seen&&state.seen>=.075)state.target=true;
   else if(!seen&&state.lost>=.13)state.target=false;
  }
  // Perception above runs every tick. Visual sampling runs once per rendered
  // frame; elapsed time is carried forward through catch-up ticks.
  this.fogElapsed+=dt;if(!force&&g.inFrame&&g.frameTick>0)return;
  this.updateFog(this.fogElapsed,force);this.fogElapsed=0;
 }
 updateFog(dt,force=false){
  const observers=[this.game.player],drone=this.game.drone?.active;if(drone?.ready)observers.push(drone);
  const size=this.size,cell=this.extent/size,half=this.extent/2;
  const regions=observers.map(o=>{const p=o.body.translation(),range=sightRange(o);return {o,p,range,x0:Math.max(0,Math.floor((p.x-range+half)/cell)),x1:Math.min(size-1,Math.ceil((p.x+range+half)/cell)),z0:Math.max(0,Math.floor((p.z-range+half)/cell)),z1:Math.min(size-1,Math.ceil((p.z+range+half)/cell))};});
  // Clear abandoned cells, including a recalled drone's region. Keep them
  // active until their display value has faded completely to black.
  for(const i of this.fogActive){const x=i%size,z=Math.floor(i/size);if(!regions.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1))this.target[i]=0;}
  const phases=6,steps=force?phases:Math.min(phases,Math.max(1,Math.ceil(dt*60))),start=this.fogPhase||0;
  const destination=this.fogPoint??=new THREE.Vector3();
  for(let step=0;step<steps;step++)for(const r of regions)for(let z=r.z0;z<=r.z1;z++){
   if(!force&&z%phases!==(start+step)%phases)continue;
   // A forced update visits each row once.
   if(force&&z%phases!==step)continue;
   for(let x=r.x0;x<=r.x1;x++){
    const i=z*size+x;destination.set((x+.5)*cell-half,this.heights[i]+.45,(z+.5)*cell-half);
    const screen=this.screenWeight(destination);let seen=0;
    if(screen>0)for(const other of regions){const d=Math.hypot(destination.x-other.p.x,destination.z-other.p.z);if(d<other.range&&this.clearLine(other.o,destination,null,true))seen=Math.max(seen,1-THREE.MathUtils.smoothstep(d,other.range-7,other.range));}
    this.target[i]=Math.round(255*seen*screen);if(this.target[i]||this.data[i])this.fogActive.add(i);
   }
  }
  this.fogPhase=(start+steps)%phases;
  if(force){this.display.set(this.target);this.data.set(this.target);this.texture.clearUpdateRanges();this.texture.needsUpdate=true;}

 }
 // Interpolate presentation every rendered frame; perception stays immediate.
 applyFade(unit,state){unit.visibilityOpacity=state.opacity;unit.root.visible=state.opacity>.005;if(unit.infantry){if(unit.root.visible&&!unit.root.parent)state.parent?.add(unit.root);else if(!unit.root.visible)unit.root.removeFromParent();}for(const [original,material] of state.materials)material.opacity=original.opacity*state.opacity;}
 animate(dt){
  for(const [unit,state] of this.units){if(unit.dead){this.release(unit);continue;}const goal=state.target?1:0;state.opacity=THREE.MathUtils.clamp(state.opacity+(goal?1:-1)*Math.max(0,dt)/(goal?.18:.24),0,1);this.applyFade(unit,state);}
  const blend=1-Math.exp(-10*Math.max(0,dt));
  this.fogDirty.clear();for(const i of this.fogActive){this.display[i]+=(this.target[i]-this.display[i])*blend;const next=Math.round(this.display[i]);if(next!==this.data[i]){this.data[i]=next;this.fogDirty.add(i);}if(!this.target[i]&&!next){this.display[i]=0;this.fogActive.delete(i);}}
  markTextureRows(this.texture,this.fogDirty,this.size);
 }
 dispose(){for(const unit of this.units.keys())this.release(unit);this.texture.dispose();}
}
