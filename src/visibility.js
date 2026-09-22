import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight,MAP_SIZE} from './config.js';
const point=p=>new THREE.Vector3().copy(p);
// Optical height above the chassis determines the observer's horizon.
export function sightHeight(unit){return unit?.infantry?.65:unit?.jeep?.8:1.25*(unit?.cfg?.scale||1);}
export function sightRange(unit){return unit?.range??(unit?.infantry?32:unit?.jeep?38:40+20*(unit?.cfg?.scale||1));}
export class Visibility {
 constructor(game){this.game=game;this.screenPoint=new THREE.Vector3();this.size=Math.ceil(MAP_SIZE/2.75);this.extent=MAP_SIZE;this.data=new Uint8Array(this.size*this.size);this.target=new Uint8Array(this.data.length);this.display=new Float32Array(this.data.length);this.texture=new THREE.DataTexture(this.data,this.size,this.size,THREE.RedFormat);this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.needsUpdate=true;this.timer=0;this.units=new Map();}
 clearLine(observer,destination,target=null,ignoreInfantry=false){
  const g=this.game,origin=point(observer.body.translation());origin.y+=sightHeight(observer);
  const delta=point(destination).sub(origin),length=delta.length();if(length<.01)return true;
  const dir=delta.clone().normalize();
  for(const cloud of g.smokeClouds||[]){const along=THREE.MathUtils.clamp(point(cloud.p).sub(origin).dot(dir),0,length);if(origin.clone().addScaledVector(dir,along).distanceTo(cloud.p)<cloud.radius)return false;}
  const hit=g.world.castRay(new RAPIER.Ray(origin,dir),Math.max(0,length-.15),true,undefined,undefined,undefined,observer.body,c=>{const e=g.entities.get(c.handle);return !e?.projectile&&(!ignoreInfantry||!e?.infantry||e===target);});
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
  state={opacity:0,target:false,seen:0,lost:0,materials:new Map(),meshes:[]};
  // Clone once per distinct unit material, not per mesh or frame. This prevents
  // one soldier fading the whole squad through shared material references.
  const clone=material=>{if(!state.materials.has(material)){const copy=material.clone();copy.transparent=true;copy.userData.visibilityFade=true;copy.opacity=0;state.materials.set(material,copy);}return state.materials.get(material);};
  unit.root.traverse(mesh=>{if(!mesh.material)return;state.meshes.push([mesh,mesh.material]);mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);});
  if(state.materials.has(unit.armor)){state.armor=unit.armor;unit.armor=state.materials.get(unit.armor);}
  this.units.set(unit,state);unit.visibilityOpacity=0;unit.root.visible=false;return state;
 }
 release(unit){const state=this.units.get(unit);if(!state)return;for(const [mesh,material] of state.meshes)mesh.material=material;if(state.armor)unit.armor=state.armor;for(const material of state.materials.values())material.dispose();this.units.delete(unit);unit.visibilityOpacity=undefined;}
 update(dt,force=false){
  const g=this.game;g.camera?.updateMatrixWorld();const drone=g.drone?.active;for(const units of [g.tanks,g.soldiers||[]])for(const t of units){if(!t.enemy)continue;if(t.dead){t.visibleToDrone=false;this.release(t);continue;}
   const state=this.track(t),onScreen=this.screenWeight(t.body.translation())>.05;t.visibleToDrone=!!(onScreen&&drone?.ready&&this.canSee(drone,t,drone.range,true));const seen=onScreen&&(this.canSee(g.player,t,sightRange(g.player),true)||t.visibleToDrone);t.visibleToPlayer=seen;
   state.seen=seen?state.seen+dt:0;state.lost=seen?0:state.lost+dt;
   // Schmitt-like temporal hysteresis filters single-tick edge occlusion. Combat
   // and auto-aim still use the immediate visibleToPlayer/canSee result.
   if(force){state.target=seen;state.opacity=seen?1:0;this.applyFade(t,state);}
   else if(seen&&state.seen>=.075)state.target=true;
   else if(!seen&&state.lost>=.13)state.target=false;
  }
  // Spread visual field rays over a tenth of a second; unit perception above stays immediate.
  const rows=force?this.size:Math.min(this.size,Math.max(1,Math.ceil(this.size*dt/.1))),start=force?0:(this.nextRow||0);
  const observers=[g.player];if(drone?.ready)observers.push(drone);
  for(let row=0;row<rows;row++){const z=(start+row)%this.size;for(let x=0;x<this.size;x++){
   const wx=(x+.5)/this.size*this.extent-this.extent/2,wz=(z+.5)/this.size*this.extent-this.extent/2;
   const destination={x:wx,y:terrainHeight(wx,wz)+.45,z:wz},screen=this.screenWeight(destination);let seen=0;
   if(screen>0)for(const observer of observers){const p=observer.body.translation(),range=sightRange(observer),d=Math.hypot(wx-p.x,wz-p.z);
    if(d<range&&this.clearLine(observer,destination,null,true))seen=Math.max(seen,1-THREE.MathUtils.smoothstep(d,range-7,range));
   }
   this.target[z*this.size+x]=Math.round(255*seen*screen);
  }}
  this.nextRow=(start+rows)%this.size;
  if(force){this.display.set(this.target);this.data.set(this.target);this.texture.needsUpdate=true;}
 }
 // Interpolate presentation every rendered frame; perception stays immediate.
 applyFade(unit,state){unit.visibilityOpacity=state.opacity;unit.root.visible=state.opacity>.005;for(const [original,material] of state.materials)material.opacity=original.opacity*state.opacity;}
 animate(dt){
  for(const [unit,state] of this.units){if(unit.dead){this.release(unit);continue;}const goal=state.target?1:0;state.opacity=THREE.MathUtils.clamp(state.opacity+(goal?1:-1)*Math.max(0,dt)/(goal?.18:.24),0,1);this.applyFade(unit,state);}
  const blend=1-Math.exp(-10*Math.max(0,dt));
  for(let i=0;i<this.data.length;i++){this.display[i]+=(this.target[i]-this.display[i])*blend;this.data[i]=Math.round(this.display[i]);}
  this.texture.needsUpdate=true;
 }
 dispose(){for(const unit of this.units.keys())this.release(unit);this.texture.dispose();}
}
