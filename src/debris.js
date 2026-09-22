import * as THREE from 'three';

export function fracturedStoneGeometry(size=1,random=Math.random){
 const geometry=new THREE.DodecahedronGeometry(size,0);
 // Warp the whole convex silhouette so coincident face vertices remain watertight.
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=1+.14*Math.sin(x*12+z*8+y*6);p.setXYZ(i,x*n,y*n*.65,z*n*.83);}
 geometry.rotateX(random()*.7);geometry.rotateY(random()*6.28);geometry.computeVertexNormals();return geometry;
}
export function createDebris(materials,kind,index,random){
 const root=new THREE.Group();root.userData.fragmentKind=kind;const size=.18+random()*.28;
 const add=(geometry,material)=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 const hot=new THREE.MeshStandardMaterial({color:0x40362b,metalness:.75,roughness:.56,emissive:0xff5b0b,emissiveIntensity:1.9});
 let emissive=null;
 if(kind==='vehicle'&&index%5===0){
  // Torn wheel with a separate metallic rim, rather than a generic chunk.
  add(new THREE.TorusGeometry(.28,.09,5,12),materials.track);
  add(new THREE.TorusGeometry(.18,.025,4,10),materials.steel);
  add(new THREE.CylinderGeometry(.07,.07,.15,6).rotateX(Math.PI/2),materials.dark);
 }else if(kind==='vehicle'||kind==='metal'){
  const shape=new THREE.Shape();shape.moveTo(-size,-size*.65);shape.lineTo(size*.25,-size*.9);shape.lineTo(size*.9,-size*.25);shape.lineTo(size*.7,size*.65);shape.lineTo(-size*.45,size);shape.lineTo(-size,size*.1);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false});const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+Math.max(0,p.getX(i))*.33);geo.computeVertexNormals();
  add(geo,index%3===0?hot:materials.armor);if(index%3===0)emissive=hot;
  const rivet=add(new THREE.SphereGeometry(.025,4,3),materials.steel);rivet.position.set(-size*.35,size*.4,.05);
  if(index%3===1){const edge=add(new THREE.CylinderGeometry(.018,.018,size*1.5,5),materials.rust);edge.rotation.z=.5;edge.position.x=-size*.35;}
 }else{
  add(fracturedStoneGeometry(size,random),kind==='masonry'?materials.concrete:materials.rock);
  if(kind==='masonry'&&index%3===0){const rebar=add(new THREE.CylinderGeometry(.018,.018,size*2.7,5),materials.rust);rebar.rotation.z=.8;}
 }
 if(!emissive)hot.dispose();
 // Convex collision is built from the actual fragment's transformed geometry.
 const vertices=[];root.updateMatrixWorld(true);root.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);vertices.push(v.x,v.y,v.z);}});
 return {mesh:root,vertices:new Float32Array(vertices),emissive};
}
export function disposeDebris(debris){debris.mesh.removeFromParent();debris.mesh.traverse(m=>m.geometry?.dispose());debris.emissive?.dispose();}
