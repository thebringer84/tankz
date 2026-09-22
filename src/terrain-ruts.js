import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {MAP_SIZE,TERRAIN_SEGMENTS} from './config.js';
const RES=2048,DEPTH=.075;
export class TerrainRuts {
 constructor(geometry,world,segments=geometry.parameters.widthSegments||TERRAIN_SEGMENTS){
  this.geometry=geometry;this.size=geometry.parameters.width||MAP_SIZE;this.dirtyVertices=new Set();this.patchColumns=Math.ceil(segments/18);this.world=world;this.segments=segments;this.base=Float32Array.from(geometry.attributes.position.array);this.data=new Uint8Array(RES*RES);this.dirty=new Set();this.timer=0;this.props=[];this.ruins=[];
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
 sample(x,z){const u=THREE.MathUtils.clamp((x/this.size+.5)*RES-.5,0,RES-1.001),v=THREE.MathUtils.clamp((z/this.size+.5)*RES-.5,0,RES-1.001),ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,k=iz*RES+ix;return ((this.data[k]*(1-fx)+this.data[k+1]*fx)*(1-fz)+(this.data[k+RES]*(1-fx)+this.data[k+RES+1]*fx)*fz)/255*DEPTH;}
 stamp(position,yaw,width,scale=1){
  const co=Math.cos(yaw),si=Math.sin(yaw),cell=this.size/RES;
  for(const side of [-1,1]){const x=position.x+co*width*side,z=position.z-si*width*side,soft=this.softness(x,z);if(soft<.1)continue;
   const radius=.75*scale,ix=Math.floor((x/this.size+.5)*RES),iz=Math.floor((z/this.size+.5)*RES),reach=Math.ceil(radius/cell);
   for(let dz=-reach;dz<=reach;dz++)for(let dx=-reach;dx<=reach;dx++){const tx=ix+dx,tz=iz+dz;if(tx<1||tz<1||tx>=RES-1||tz>=RES-1)continue;const wx=(tx+.5)*cell-this.size/2-x,wz=(tz+.5)*cell-this.size/2-z,across=Math.abs(wx*co-wz*si),along=Math.abs(wx*si+wz*co);const profile=(1-THREE.MathUtils.smoothstep(across,.18*scale,.46*scale))*(1-THREE.MathUtils.smoothstep(along,.25*scale,.7*scale));if(profile<=0)continue;const k=tz*RES+tx,target=Math.round(255*soft*profile);this.data[k]=Math.max(this.data[k],Math.min(target,this.data[k]+Math.ceil(target*.2)));}
   const grid=this.size/this.segments,stride=this.segments+1;
   for(let vz=Math.max(0,Math.floor((z-radius+this.size/2)/grid));vz<=Math.min(this.segments,Math.ceil((z+radius+this.size/2)/grid));vz++)for(let vx=Math.max(0,Math.floor((x-radius+this.size/2)/grid));vx<=Math.min(this.segments,Math.ceil((x+radius+this.size/2)/grid));vx++){const id=vz*stride+vx,px=this.base[id*3],pz=this.base[id*3+2];this.geometry.attributes.position.setY(id,this.base[id*3+1]-this.sample(px,pz));this.dirtyVertices.add(id);this.markPatches(vx,vz);}
   this.changed=true;
  }
 }
 markPatches(vx,vz){
  const cols=this.patchColumns;
  for(let z=Math.max(0,Math.floor((vz-1)/18));z<=Math.min(cols-1,Math.floor(vz/18));z++)for(let x=Math.max(0,Math.floor((vx-1)/18));x<=Math.min(cols-1,Math.floor(vx/18));x++)this.dirty.add(z*cols+x);
 }
 attachRender(group,material){
  for(const patch of this.patches){const geo=new THREE.BufferGeometry();geo.setIndex(new THREE.BufferAttribute(patch.indices,1));
   for(const key of ['position','normal','uv','color']){const source=this.geometry.attributes[key];if(!source)continue;const data=new Float32Array(patch.ids.length*source.itemSize);for(let i=0;i<patch.ids.length;i++)for(let j=0;j<source.itemSize;j++)data[i*source.itemSize+j]=source.array[patch.ids[i]*source.itemSize+j];geo.setAttribute(key,new THREE.BufferAttribute(data,source.itemSize));}
   geo.computeBoundingSphere();geo.boundingSphere.radius+=DEPTH;const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.name=`Terrain chunk ${patch.x},${patch.z}`;group.add(mesh);patch.mesh=mesh;
  }
 }
 updateNormal(id){
  const stride=this.segments+1,x=id%stride,z=Math.floor(id/stride),p=this.geometry.attributes.position.array,index=this.geometry.index.array;let nx=0,ny=0,nz=0;
  for(let cz=Math.max(0,z-1);cz<=Math.min(this.segments-1,z);cz++)for(let cx=Math.max(0,x-1);cx<=Math.min(this.segments-1,x);cx++)for(let t=0;t<2;t++){
   const base=(cz*this.segments+cx)*6+t*3,a=index[base],b=index[base+1],c=index[base+2];if(a!==id&&b!==id&&c!==id)continue;
   const abx=p[b*3]-p[a*3],aby=p[b*3+1]-p[a*3+1],abz=p[b*3+2]-p[a*3+2],acx=p[c*3]-p[a*3],acy=p[c*3+1]-p[a*3+1],acz=p[c*3+2]-p[a*3+2];nx+=aby*acz-abz*acy;ny+=abz*acx-abx*acz;nz+=abx*acy-aby*acx;
  }
  const length=Math.hypot(nx,ny,nz)||1;this.geometry.attributes.normal.setXYZ(id,nx/length,ny/length,nz/length);
 }
 update(dt){
  this.timer-=dt;if(!this.changed||this.timer>0)return;this.timer=.2;this.changed=false;this.texture.needsUpdate=true;
  const stride=this.segments+1,normals=new Set();
  for(const id of this.dirtyVertices){this.surfaceData[id]=this.geometry.attributes.position.getY(id);const x=id%stride,z=Math.floor(id/stride);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(x+dx<0||x+dx>this.segments||z+dz<0||z+dz>this.segments)continue;normals.add((z+dz)*stride+x+dx);this.markPatches(x+dx,z+dz);}}
  for(const id of normals)this.updateNormal(id);
  this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.normal.needsUpdate=true;this.surfaceTexture.needsUpdate=true;
  for(const id of this.dirty){const patch=this.patches[id];this.copyPatch(patch);patch.collider.setShape(new RAPIER.TriMesh(patch.vertices,patch.indices));
   if(patch.mesh){const attributes=patch.mesh.geometry.attributes;for(const key of ['position','normal']){const source=this.geometry.attributes[key];for(let i=0;i<patch.ids.length;i++)for(let j=0;j<3;j++)attributes[key].array[i*3+j]=source.array[patch.ids[i]*3+j];attributes[key].needsUpdate=true;}}
  }
  this.lastUpdatedPatches=this.dirty.size;this.dirty.clear();this.dirtyVertices.clear();
 }
 dispose(){this.texture.dispose();this.surfaceTexture.dispose();this.geometry.dispose();}
}
