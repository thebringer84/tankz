import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MAP_HALF,MAP_SIZE,terrainHeight,seededRandom} from './config.js';

// Face-projected UVs keep strata readable on vertical fractures and ramp tops.
export function stoneUV(source){
 const geo=source.index?source.toNonIndexed():source;geo.computeVertexNormals();
 const p=geo.attributes.position,n=geo.attributes.normal,uv=[],colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
  uv.push((ax>ay&&ax>az?z:x)*.14,(ay>ax&&ay>az?z:y)*.14);
  const shade=.86+.1*Math.sin(x*.47+z*.32)+.04*Math.sin(y*5);colors.push(shade,shade*.97,shade*.9);
 }geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geo;
}

export function rampGeometry(seed){
 const random=seededRandom(seed),xs=[-4.8,-3.3,-1.7,0,1.7,3.3,4.8],zs=[-8,-5,-2,1,3,4.2,6],pos=[],indices=[];
 for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){
  const z=zs[j],edge=i===0||i===xs.length-1,shoulder=Math.abs(xs[i])/4.8;
  const profile=z<=3?(z+8)/11*2.3:(6-z)/3*2.3;
  const breadth=[.62,.90,1.08,1,.92,.79,.58][j];
  pos.push(xs[i]*breadth+(edge?(random()-.5)*.85:0),profile*(1-.23*shoulder**4)+(j>0&&j<zs.length-1?(random()-.5)*.10:0),z+(edge?(random()-.5)*.85:0));
 }
 for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){const a=j*xs.length+i,b=a+xs.length;indices.push(a,b,a+1,a+1,b,b+1);}
 // Fractured vertical skirt closes the slab while leaving the launch surface smooth.
 const edge=[];for(let i=0;i<7;i++)edge.push(i);for(let j=1;j<7;j++)edge.push(j*7+6);for(let i=5;i>=0;i--)edge.push(42+i);for(let j=5;j>0;j--)edge.push(j*7);
 const middle=pos.length/3;
 for(const id of edge){const x=pos[id*3],y=pos[id*3+1],z=pos[id*3+2];pos.push(x*(1.05+random()*.05),y*.45-.1,z+(random()-.5)*.5);}
 const bottom=pos.length/3;
 for(const id of edge)pos.push(pos[id*3]*(.88+random()*.09),-.45,pos[id*3+2]);
 for(let k=0;k<edge.length;k++){const next=(k+1)%edge.length,a=edge[k],b=edge[next],c=middle+k,d=middle+next,e=bottom+k,f=bottom+next;indices.push(a,b,c,b,d,c,c,d,e,d,f,e);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);const result=stoneUV(geo);geo.dispose();return result;
}

export function buildFrontier(group,world,materials,textures){
 const stone=new THREE.MeshStandardMaterial({map:textures.frontierStone||textures.rock,bumpMap:textures.frontierStone||textures.rock,bumpScale:.12,color:0xe4d7c2,roughness:1,vertexColors:true,flatShading:true});
 const random=seededRandom(9157),barriers=[],colliders=[],extensions=[],edge=MAP_HALF-2;
 const transform=(side,along,out)=>side===0?[along,out]:side===1?[out,-along]:side===2?[-along,-out]:[-out,along];
 for(let side=0;side<4;side++){
  const pieces=[],metal=[],concrete=[],count=Math.ceil(MAP_SIZE/12),step=MAP_SIZE/count;
  const piece=(list,geometry,x,y,z,sx,sy,sz,yaw=0)=>{geometry.scale(sx,sy,sz);geometry.rotateY(yaw);geometry.translate(x,y,z);if(geometry.index){list.push(geometry.toNonIndexed());geometry.dispose();}else list.push(geometry);};
  for(let i=0;i<count;i++){
   const along=-MAP_HALF+(i+.5)*step,[x,z]=transform(side,along,edge),ground=terrainHeight(x,z),yaw=side*Math.PI/2;
   // Overlapping concrete footings close every gap beneath rock and fence sections.
   piece(concrete,new THREE.BoxGeometry(),x,ground+1,z,step+.25,3.8,4,yaw);
   if(i%11>=8){
    piece(metal,new THREE.BoxGeometry(),x,ground+4.4,z,step+.2,6.6,.35,yaw);
    for(const offset of [-step/2,0,step/2]){const [px,pz]=transform(side,along+offset,edge-.35);piece(concrete,new THREE.BoxGeometry(),px,ground+3.2,pz,.5,8,.65,yaw);}
    for(const h of [2.6,5.8])piece(metal,new THREE.BoxGeometry(),x,ground+h,z,step+.4,.18,.8,yaw);
    for(let offset=-step/2+1;offset<step/2;offset+=1.4){const [px,pz]=transform(side,along+offset,edge-.28);piece(metal,new THREE.BoxGeometry(),px,ground+4.4,pz,.09,6.2,.16,yaw);}
   }else{
    const height=10+random()*6;
    // An angular solid cliff core prevents the visual pinholes of separate spheres.
    const core=new THREE.BoxGeometry(step+.35,height,5,2,2,1),p=core.attributes.position;
    for(let v=0;v<p.count;v++)if(p.getY(v)>0)p.setY(v,p.getY(v)+(random()-.5)*1.3);
    core.rotateY(yaw);core.translate(x,ground+height/2-1.5,z);pieces.push(core.toNonIndexed());core.dispose();
    for(let j=0;j<2;j++){const [rx,rz]=transform(side,along+(j-.5)*step*.48,edge+1);piece(pieces,new THREE.DodecahedronGeometry(1,0),rx,ground+3.5,rz,5+random()*2,6+random()*3,4.5,yaw+random());}
   }
  }
  for(const [list,material] of [[pieces,stone],[metal,materials.rust],[concrete,materials.concrete]]){
   const merged=mergeGeometries(list);list.forEach(g=>g.dispose());const geometry=material===stone?stoneUV(merged):merged;if(geometry!==merged)merged.dispose();
   const mesh=new THREE.Mesh(geometry,material);mesh.name='Impassable frontier';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);barriers.push(mesh);
   const vertices=geometry.attributes.position.array,indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
   colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,indices).setFriction(.8)));
  }
  // Coarse terrain strips continue every square edge and join exactly at corners.
  const positions=[],uv=[],indices=[],cols=48,rows=12;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const distance=j/rows*260,radius=MAP_HALF+distance,along=(-1+2*i/cols)*radius,[x,z]=transform(side,along,radius);
   const base=terrainHeight(x,z),blend=Math.min(1,distance/50),mesa=9+13*Math.sin(x*.018+z*.011)**2+9*Math.cos(z*.025-x*.009)**2;
   positions.push(x,base+blend*mesa,z);uv.push(x*.035,z*.035);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:textures.frontierStone||textures.rock,color:0xcec3b1,roughness:1,flatShading:true,side:THREE.DoubleSide}));mesh.name='Beyond boundary terrain';mesh.receiveShadow=true;group.add(mesh);extensions.push(mesh);
 }
 return {stone,barriers,colliders,extensions};
}
