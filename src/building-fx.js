import * as THREE from 'three';
import {terrainHeight} from './config.js';

// Instanced masonry grit: thousands of tiny chips thrown by impacts and collapses.
// Pure ballistic motion against the terrain keeps them off the physics world.
export class Grit {
 constructor(parent,material,cap=1600){
  this.cap=cap;this.count=0;this.data=new Float32Array(cap*14);this.dummy=new THREE.Object3D();
  this.mesh=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1,0),material,cap);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.castShadow=false;this.mesh.receiveShadow=true;this.mesh.name='Building grit';
  this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);parent.add(this.mesh);this.color=new THREE.Color();
 }
 // Layout per chip: position(3) velocity(3) rotation(3) spin(3) size life
 burst(p,dir,n,speed=6,size=.09,colors=[0xd9ccb0,0xbcae92,0x9d917c],rand=Math.random){
  for(let i=0;i<n;i++){let k=this.count;if(k>=this.cap)k=Math.floor(rand()*this.cap);else this.count++;const d=this.data,o=k*14,s=speed*(.35+rand()*.9);
   d[o]=p.x+(rand()-.5)*.4;d[o+1]=p.y+(rand()-.5)*.4;d[o+2]=p.z+(rand()-.5)*.4;d[o+3]=dir.x*s+(rand()-.5)*speed*.9;d[o+4]=dir.y*s+rand()*speed*.6;d[o+5]=dir.z*s+(rand()-.5)*speed*.9;
   for(let j=6;j<9;j++)d[o+j]=rand()*6.28;for(let j=9;j<12;j++)d[o+j]=(rand()-.5)*18;d[o+12]=size*(.4+rand()*1.2);d[o+13]=1.6+rand()*2.2;
   this.mesh.setColorAt(k,this.color.set(colors[Math.floor(rand()*colors.length)]).multiplyScalar(.8+rand()*.3));}
  this.mesh.instanceColor.needsUpdate=true;
 }
 update(dt){
  const d=this.data,m=this.dummy;
  for(let k=this.count-1;k>=0;k--){const o=k*14;d[o+13]-=dt;if(d[o+13]<=0){this.count--;if(k<this.count){d.copyWithin(o,this.count*14,this.count*14+14);this.mesh.getColorAt(this.count,this.color);this.mesh.setColorAt(k,this.color);}continue;}
   d[o+4]-=18*dt;d[o]+=d[o+3]*dt;d[o+1]+=d[o+4]*dt;d[o+2]+=d[o+5]*dt;const ground=terrainHeight(d[o],d[o+2])+d[o+12]*.4;
   if(d[o+1]<ground){d[o+1]=ground;d[o+4]*=-.28;d[o+3]*=.5;d[o+5]*=.5;for(let j=9;j<12;j++)d[o+j]*=.5;}
   for(let j=0;j<3;j++)d[o+6+j]+=d[o+9+j]*dt;}
  for(let k=0;k<this.count;k++){const o=k*14,fade=Math.min(1,d[o+13]*2);m.position.set(d[o],d[o+1],d[o+2]);m.rotation.set(d[o+6],d[o+7],d[o+8]);m.scale.set(d[o+12]*fade,d[o+12]*.7*fade,d[o+12]*fade);m.updateMatrix();this.mesh.setMatrixAt(k,m.matrix);}
  this.mesh.count=this.count;if(this.count){this.mesh.instanceMatrix.clearUpdateRanges();this.mesh.instanceMatrix.addUpdateRange(0,this.count*16);this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;}
 }
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.dispose?.();}
}

// Settled debris is baked into ring buffers (one per material), so a street full of
// rubble costs a few draw calls and no physics bodies.
export class RubbleBatch {
 constructor(parent,materials,capacity=36000){
  this.parent=parent;this.materials=materials;this.capacity=capacity;this.batches=new Map();this.m=new THREE.Matrix4();this.nm=new THREE.Matrix3();this.v=new THREE.Vector3();
 }
 batch(key){let b=this.batches.get(key);if(b)return b;const cap=key==='core'||key==='plaster'?this.capacity*2:this.capacity,g=new THREE.BufferGeometry();
  for(const [name,size] of [['position',3],['normal',3],['uv',2],['color',3]])g.setAttribute(name,new THREE.BufferAttribute(new Float32Array(cap*size),size).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0,0);const mesh=new THREE.Mesh(g,this.materials[key]);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=true;mesh.name=`Rubble ${key}`;this.parent.add(mesh);b={mesh,cap,cursor:0,used:0};this.batches.set(key,b);return b;}
 add(mesh){
  mesh.updateMatrixWorld(true);const g=mesh.geometry,mats=Array.isArray(mesh.material)?mesh.material:[mesh.material],src=g.attributes;this.nm.getNormalMatrix(mesh.matrixWorld);
  const groups=g.groups.length?g.groups:[{start:0,count:src.position.count,materialIndex:0}];
  for(const grp of groups){const key=mats[grp.materialIndex]?.userData.key;if(!key)continue;const b=this.batch(key);if(grp.count>b.cap)continue;if(b.cursor+grp.count>b.cap){this.clearTail(b);b.cursor=0;}
   const a=b.mesh.geometry.attributes,o=b.cursor;
   for(let i=0;i<grp.count;i++){const s=grp.start+i,d=o+i;this.v.fromBufferAttribute(src.position,s).applyMatrix4(mesh.matrixWorld);a.position.setXYZ(d,this.v.x,this.v.y,this.v.z);this.v.fromBufferAttribute(src.normal,s).applyMatrix3(this.nm).normalize();a.normal.setXYZ(d,this.v.x,this.v.y,this.v.z);a.uv.setXY(d,src.uv.getX(s),src.uv.getY(s));
    // Settled rubble is dusted over, so it reads darker and flatter than the facade.
    a.color.setXYZ(d,src.color.getX(s)*.82,src.color.getY(s)*.8,src.color.getZ(s)*.76);}
   for(const attr of Object.values(a)){attr.addUpdateRange(o*attr.itemSize,grp.count*attr.itemSize);attr.needsUpdate=true;}
   b.cursor+=grp.count;b.used=Math.max(b.used,b.cursor);b.mesh.geometry.setDrawRange(0,b.used);}
 }
 clearTail(b){const p=b.mesh.geometry.attributes.position;p.array.fill(0,b.cursor*3,b.used*3);p.addUpdateRange(b.cursor*3,(b.used-b.cursor)*3);p.needsUpdate=true;b.used=b.cursor;}
 get vertexCount(){let n=0;for(const b of this.batches.values())n+=b.used;return n;}
 dispose(){for(const b of this.batches.values()){b.mesh.removeFromParent();b.mesh.geometry.dispose();}this.batches.clear();}
}

// Plaster dust: short puffs at impacts, a rolling ground-hugging cloud for collapses.
const DUST=[0xae9d7f,0xa08e70,0xbba98a,0x96846a];
export function dustPuff(fx,p,dir,scale=1,rand=Math.random){
 if(!fx?.emit)return;
 for(let i=0;i<Math.round(6*scale);i++){const v=new THREE.Vector3(dir.x*(1+rand()*2.5)+(rand()-.5)*1.6,dir.y*(1+rand()*2)+.4+rand()*1.3,dir.z*(1+rand()*2.5)+(rand()-.5)*1.6);fx.emit(p.clone().add(new THREE.Vector3((rand()-.5)*.6,(rand()-.5)*.6,(rand()-.5)*.6)),v,DUST[i%4],(.9+rand()*1.3)*scale,2.6+rand()*2.2,'smoke');const q=fx.particles.at(-1);q.density=.22;q.spin*=.4;}
 for(let i=0;i<Math.round(3*scale);i++){fx.emit(p,new THREE.Vector3((rand()-.5)*5,-.5-rand(),(rand()-.5)*5).multiplyScalar(scale),0xa99373,.8*scale,1.2+rand(),'dust');const q=fx.particles.at(-1);q.blastDust=true;q.density=.22;}
}
export function dustCloud(fx,p,radius,strength=1,rand=Math.random){
 if(!fx?.emit)return;const n=Math.round(7+strength*7);
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rand()*.4,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),pos=p.clone().addScaledVector(dir,radius*(.2+rand()*.8));pos.y=terrainHeight(pos.x,pos.z)+.4+rand()*1.5;
  const v=dir.multiplyScalar((2.5+rand()*4)*Math.sqrt(strength));v.y=.35+rand()*.7;fx.emit(pos,v,DUST[i%4],(3.4+rand()*2.8)*Math.min(1.6,.7+strength*.35),7+rand()*5,'dust',rand()*.25);
  Object.assign(fx.particles.at(-1),{trail:true,vehicleDust:true,wake:true,density:.08+rand()*.06,spread:2.1,wind:.45,spin:(rand()-.5)*.12});}
 for(let i=0;i<Math.round(3+strength*3);i++){const pos=p.clone().add(new THREE.Vector3((rand()-.5)*radius,rand()*radius*.8,(rand()-.5)*radius));fx.emit(pos,new THREE.Vector3((rand()-.5)*1.4,1.2+rand()*2,(rand()-.5)*1.4),DUST[(i+1)%4],(2.6+rand()*2.4)*Math.min(1.5,.7+strength*.3),5+rand()*3,'smoke',rand()*.5);const q=fx.particles.at(-1);q.density=.18;q.spin*=.3;}
}
export function dustTrail(fx,p,scale=1,rand=Math.random){if(!fx?.emit)return;fx.emit(p,new THREE.Vector3((rand()-.5)*.6,.2+rand()*.5,(rand()-.5)*.6),DUST[Math.floor(rand()*4)],(.9+rand()*.8)*scale,1.8+rand()*1.4,'smoke');const q=fx.particles.at(-1);q.density=.16;q.spin*=.3;}
export function glassBurst(fx,p,dir,rand=Math.random){if(!fx?.emit)return;for(let i=0;i<10;i++)fx.emit(p,new THREE.Vector3(dir.x*(2+rand()*4)+(rand()-.5)*3,1+rand()*3,dir.z*(2+rand()*4)+(rand()-.5)*3),0xdff4ff,.05+rand()*.05,.5+rand()*.6,'ember');}
