import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from './config.js';
const point=p=>new THREE.Vector3().copy(p);
export class Visibility {
 constructor(game){this.game=game;this.size=80;this.extent=220;this.data=new Uint8Array(this.size*this.size);this.target=new Uint8Array(this.data.length);this.display=new Float32Array(this.data.length);this.texture=new THREE.DataTexture(this.data,this.size,this.size,THREE.RedFormat);this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.needsUpdate=true;this.timer=0;}
 clearLine(observer,destination,target=null){
  const g=this.game,origin=point(observer.body.translation());origin.y+=.85;
  const delta=point(destination).sub(origin),length=delta.length();if(length<.01)return true;
  const dir=delta.clone().normalize();
  for(const cloud of g.smokeClouds||[]){const along=THREE.MathUtils.clamp(point(cloud.p).sub(origin).dot(dir),0,length);if(origin.clone().addScaledVector(dir,along).distanceTo(cloud.p)<cloud.radius)return false;}
  const hit=g.world.castRay(new RAPIER.Ray(origin,dir),Math.max(0,length-.15),true,undefined,undefined,undefined,observer.body,c=>!g.entities.get(c.handle)?.projectile);
  return !hit||(target&&hit.collider.handle===target.collider.handle);
 }
 canSee(observer,target,range=65){if(!observer||!target||observer.dead||target.dead)return false;const destination=point(target.body.translation());destination.y+=.55;return point(observer.body.translation()).distanceTo(destination)<range&&this.clearLine(observer,destination,target);}
 update(dt,force=false){
  const g=this.game;for(const t of [...g.tanks,...(g.soldiers||[])])if(t.enemy&&!t.dead){t.visibleToPlayer=this.canSee(g.player,t);t.root.visible=t.visibleToPlayer;}
  // Spread visual field rays over a tenth of a second; unit perception above stays immediate.
  const rows=force?this.size:Math.min(this.size,Math.max(1,Math.ceil(this.size*dt/.1))),start=force?0:(this.nextRow||0);
  const p=g.player.body.translation();for(let row=0;row<rows;row++){const z=(start+row)%this.size;for(let x=0;x<this.size;x++){const wx=(x+.5)/this.size*this.extent-110,wz=(z+.5)/this.size*this.extent-110,d=Math.hypot(wx-p.x,wz-p.z);this.target[z*this.size+x]=d<65&&this.clearLine(g.player,{x:wx,y:terrainHeight(wx,wz)+.45,z:wz})?Math.round(255*(1-THREE.MathUtils.smoothstep(d,58,65))):0;}}
  this.nextRow=(start+rows)%this.size;
  if(force){this.display.set(this.target);this.data.set(this.target);this.texture.needsUpdate=true;}
 }
 // Interpolate presentation every rendered frame; perception stays immediate.
 animate(dt){
  const blend=1-Math.exp(-10*Math.max(0,dt));
  for(let i=0;i<this.data.length;i++){this.display[i]+=(this.target[i]-this.display[i])*blend;this.data[i]=Math.round(this.display[i]);}
  this.texture.needsUpdate=true;
 }
 dispose(){this.texture.dispose();}
}
