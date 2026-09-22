import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Geometry shared by the procedurally built tanks: lofted armour, band tracks and batching.
// Joins cross-sections (rings of [x,y], counter-clockwise seen from the front) into one faceted solid.
export function loft(sections){
 const positions=[],tri=(a,b,c)=>positions.push(...a,...b,...c),ring=s=>s.points.map(([x,y])=>[x,y,s.z]);
 for(let s=0;s<sections.length-1;s++){const a=ring(sections[s]),b=ring(sections[s+1]);for(let i=0;i<a.length;i++){const j=(i+1)%a.length;tri(a[i],a[j],b[j]);tri(a[i],b[j],b[i]);}}
 const cap=(s,front)=>{const pts=ring(s),c=[0,pts.reduce((sum,p)=>sum+p[1],0)/pts.length,s.z];for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;if(front)tri(c,pts[i],pts[j]);else tri(c,pts[j],pts[i]);}};
 cap(sections[0],false);cap(sections.at(-1),true);return solid(positions);
}
// Convex hull around the wheel circles in the (z,y) plane, resampled evenly with outward normals.
export function trackLoop(circles,count){
 const pts=[];for(const [z,y,r] of circles)for(let i=0;i<64;i++){const a=i/64*Math.PI*2;pts.push([z+Math.cos(a)*r,y+Math.sin(a)*r]);}
 pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];
 for(const p of pts){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of pts.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 const hull=[...lower.slice(0,-1),...upper.slice(0,-1)],lengths=[0];for(let i=1;i<=hull.length;i++){const a=hull[i-1],b=hull[i%hull.length];lengths.push(lengths[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
 const points=[];let k=0;for(let i=0;i<count;i++){const s=i/count*lengths.at(-1);while(lengths[k+1]<s)k++;const a=hull[k],b=hull[(k+1)%hull.length],t=(s-lengths[k])/((lengths[k+1]-lengths[k])||1);points.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
 return points.map((p,i)=>{const a=points[(i-1+count)%count],b=points[(i+1)%count],dz=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dz,dy);return {p,n:[dy/l,-dz/l]};});
}
// Rectangular band swept around the loop; each quad is flipped to face away from the band's centreline.
export function band(loop,width,thickness){
 const positions=[],w=width/2,count=loop.length;
 const frame=({p:[z,y],n:[nz,ny]})=>({c:new THREE.Vector3(0,y+ny*thickness/2,z+nz*thickness/2),v:[[-w,y,z],[w,y,z],[w,y+ny*thickness,z+nz*thickness],[-w,y+ny*thickness,z+nz*thickness]].map(v=>new THREE.Vector3(...v))});
 for(let i=0;i<count;i++){const a=frame(loop[i]),b=frame(loop[(i+1)%count]),centre=a.c.clone().add(b.c).multiplyScalar(.5);
  for(let e=0;e<4;e++){const f=(e+1)%4,quad=[a.v[e],a.v[f],b.v[f],b.v[e]],mid=quad.reduce((m,v)=>m.add(v),new THREE.Vector3()).multiplyScalar(.25);
   if(new THREE.Vector3().subVectors(quad[1],quad[0]).cross(new THREE.Vector3().subVectors(quad[2],quad[0])).dot(mid.sub(centre))<0)quad.reverse();
   for(const v of [quad[0],quad[1],quad[2],quad[0],quad[2],quad[3]])positions.push(v.x,v.y,v.z);}}
 return solid(positions);
}
export function solid(positions){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));geo.computeVertexNormals();return geo;}
// Worn metal from the shared generated running-gear maps (materials.vanguard.gear*), so fittings, hubs,
// cages, hooks and fixtures are never flat colour. Tint and metalness pick steel, dark iron or rubber.
export function gearMaterial(maps,high,color,metalness,scale=1.4){
 const m=high?new THREE.MeshPhysicalMaterial({map:maps.gearAlbedo||null,normalMap:maps.gearNormal||null,normalScale:new THREE.Vector2(.6,.6),roughnessMap:maps.gearRoughness||null,roughness:1,metalness,specularColorMap:maps.gearSpecular||null,envMapIntensity:.8})
  :new THREE.MeshStandardMaterial({map:maps.gearAlbedo||null,bumpMap:maps.gearBump||null,bumpScale:1,roughness:.88,metalness:Math.min(metalness,.2)});
 m.color.setHex(color);m.userData.projectUV={scale};return m;
}
// Moves an oriented helper group's meshes into its parent so they batch with everything else.
export function flatten(group){group.updateMatrix();for(const child of [...group.children]){child.applyMatrix4(group.matrix);group.parent.add(child);}group.parent.remove(group);}
// Per-triangle box projection gives textured armor an even texel density on every facet.
// Materials opt in with userData.projectUV: true, or {scale, offset:[u,v]} to place a tile.
function projectUV(geometry,{scale=.45,offset=[0,0]}={}){
 const p=geometry.attributes.position,uv=new Float32Array(p.count*2),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3();
 for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);n.subVectors(c,b).cross(a.clone().sub(b));const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);
  for(let k=0;k<3;k++){const v=[a,b,c][k];const [u,w]=ax>=ay&&ax>=az?[v.z,v.y]:ay>=az?[v.x,v.z]:[v.x,v.y];uv[(i+k)*2]=u*scale+offset[0];uv[(i+k)*2+1]=w*scale+offset[1];}}
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}
export function batch(group,exclude=new Set()){
 const materials=new Map();for(const child of [...group.children]){if(!child.isMesh||exclude.has(child))continue;child.updateMatrix();let geo=child.geometry.clone().applyMatrix4(child.matrix);if(geo.index){const original=geo;geo=geo.toNonIndexed();original.dispose();}if(!materials.has(child.material))materials.set(child.material,[]);materials.get(child.material).push(geo);child.geometry.dispose();group.remove(child);}
 for(const [material,geos] of materials){const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(material.userData.projectUV)projectUV(geometry,material.userData.projectUV===true?{}:material.userData.projectUV);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
}
