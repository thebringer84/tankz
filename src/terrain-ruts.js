import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {MAP_SIZE} from './config.js';
const RES=1024,DEPTH=.075;
export class TerrainRuts {
 constructor(geometry,world,segments=180){
  this.geometry=geometry;this.world=world;this.segments=segments;this.base=Float32Array.from(geometry.attributes.position.array);this.data=new Uint8Array(RES*RES);this.dirty=new Set();this.timer=0;this.props=[];this.ruins=[];
  this.texture=new THREE.DataTexture(this.data,RES,RES,THREE.RedFormat);this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.needsUpdate=true;
  this.surfaceData=Float32Array.from({length:geometry.attributes.position.count},(_,i)=>geometry.attributes.position.getY(i));this.surfaceTexture=new THREE.DataTexture(this.surfaceData,segments+1,segments+1,THREE.RedFormat,THREE.FloatType);this.surfaceTexture.needsUpdate=true;
  // Small collision patches can be replaced independently after mesh displacement.
  this.patches=[];const stride=segments+1;
  for(let z=0;z<segments;z+=18)for(let x=0;x<segments;x+=18){const ids=[],indices=[],w=Math.min(18,segments-x),h=Math.min(18,segments-z);for(let dz=0;dz<=h;dz++)for(let dx=0;dx<=w;dx++)ids.push((z+dz)*stride+x+dx);for(let dz=0;dz<h;dz++)for(let dx=0;dx<w;dx++){const a=dz*(w+1)+dx;indices.push(a,a+w+1,a+1,a+w+1,a+w+2,a+1);}const patch={x,z,w,h,ids,indices:new Uint32Array(indices),vertices:new Float32Array(ids.length*3)};this.copyPatch(patch);patch.collider=world.createCollider(RAPIER.ColliderDesc.trimesh(patch.vertices,patch.indices).setFriction(.8));this.patches.push(patch);}
 }
 copyPatch(patch){const p=this.geometry.attributes.position;patch.ids.forEach((id,i)=>{patch.vertices[i*3]=p.getX(id);patch.vertices[i*3+1]=p.getY(id);patch.vertices[i*3+2]=p.getZ(id);});}
 softness(x,z){
  if(this.ruins.some(([rx,rz])=>Math.abs(x-rx)<5.5&&Math.abs(z-rz)<5))return 0;
  for(const p of this.props){if(p.destroyed||p.dynamic||p.kind!=='rock')continue;const pos=p.body.translation();if(Math.abs(x-pos.x)<p.mesh.scale.x+.3&&Math.abs(z-pos.z)<p.mesh.scale.z+.3)return 0;}
  const rock=Math.sin(x*.1+Math.sin(z*.08))*Math.cos(z*.12);return 1-THREE.MathUtils.smoothstep(rock,.35,.72);
 }
 sample(x,z){const u=THREE.MathUtils.clamp((x/MAP_SIZE+.5)*RES-.5,0,RES-1.001),v=THREE.MathUtils.clamp((z/MAP_SIZE+.5)*RES-.5,0,RES-1.001),ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,k=iz*RES+ix;return ((this.data[k]*(1-fx)+this.data[k+1]*fx)*(1-fz)+(this.data[k+RES]*(1-fx)+this.data[k+RES+1]*fx)*fz)/255*DEPTH;}
 stamp(position,yaw,width,scale=1){
  const co=Math.cos(yaw),si=Math.sin(yaw),cell=MAP_SIZE/RES;
  for(const side of [-1,1]){const x=position.x+co*width*side,z=position.z-si*width*side,soft=this.softness(x,z);if(soft<.1)continue;
   const radius=.75*scale,ix=Math.floor((x/MAP_SIZE+.5)*RES),iz=Math.floor((z/MAP_SIZE+.5)*RES),reach=Math.ceil(radius/cell);
   for(let dz=-reach;dz<=reach;dz++)for(let dx=-reach;dx<=reach;dx++){const tx=ix+dx,tz=iz+dz;if(tx<1||tz<1||tx>=RES-1||tz>=RES-1)continue;const wx=(tx+.5)*cell-MAP_SIZE/2-x,wz=(tz+.5)*cell-MAP_SIZE/2-z,across=Math.abs(wx*co-wz*si),along=Math.abs(wx*si+wz*co);const profile=(1-THREE.MathUtils.smoothstep(across,.18*scale,.46*scale))*(1-THREE.MathUtils.smoothstep(along,.25*scale,.7*scale));if(profile<=0)continue;const k=tz*RES+tx,target=Math.round(255*soft*profile);this.data[k]=Math.max(this.data[k],Math.min(target,this.data[k]+Math.ceil(target*.2)));}
   const grid=MAP_SIZE/this.segments,stride=this.segments+1;
   for(let vz=Math.max(0,Math.floor((z-radius+MAP_SIZE/2)/grid));vz<=Math.min(this.segments,Math.ceil((z+radius+MAP_SIZE/2)/grid));vz++)for(let vx=Math.max(0,Math.floor((x-radius+MAP_SIZE/2)/grid));vx<=Math.min(this.segments,Math.ceil((x+radius+MAP_SIZE/2)/grid));vx++){const id=vz*stride+vx,px=this.base[id*3],pz=this.base[id*3+2];this.geometry.attributes.position.setY(id,this.base[id*3+1]-this.sample(px,pz));for(let j=0;j<this.patches.length;j++){const p=this.patches[j];if(vx>=p.x&&vx<=p.x+p.w&&vz>=p.z&&vz<=p.z+p.h)this.dirty.add(j);}}
   this.changed=true;
  }
 }
 update(dt){this.timer-=dt;if(!this.changed||this.timer>0)return;this.timer=.2;this.changed=false;this.texture.needsUpdate=true;this.geometry.attributes.position.needsUpdate=true;this.geometry.computeVertexNormals();for(let i=0;i<this.surfaceData.length;i++)this.surfaceData[i]=this.geometry.attributes.position.getY(i);this.surfaceTexture.needsUpdate=true;for(const id of this.dirty){const p=this.patches[id];this.copyPatch(p);p.collider.setShape(new RAPIER.TriMesh(p.vertices,p.indices));}this.dirty.clear();}
 dispose(){this.texture.dispose();this.surfaceTexture.dispose();}
}
