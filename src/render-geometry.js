import * as THREE from 'three';

export function freezeStatic(root,exclude=new Set()){
 if(exclude.has(root))return;
 root.updateMatrix();root.matrixAutoUpdate=false;
 for(const child of root.children)freezeStatic(child,exclude);
}

// Keep the source as a lightweight registry for grounding/debug consumers, but
// submit only spatially bounded chunks. Instance transforms remain identical.
export function chunkInstances(source,extent,columns=8){
 const group=new THREE.Group(),buckets=new Map(),matrix=new THREE.Matrix4();
 group.name='Chunked '+(source.name||'vegetation');
 for(let i=0;i<source.count;i++){
  source.getMatrixAt(i,matrix);
  const x=THREE.MathUtils.clamp(Math.floor((matrix.elements[12]/extent+.5)*columns),0,columns-1),z=THREE.MathUtils.clamp(Math.floor((matrix.elements[14]/extent+.5)*columns),0,columns-1),key=z*columns+x;
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);
 }
 for(const ids of buckets.values()){
  const mesh=new THREE.InstancedMesh(source.geometry,source.material,ids.length);
  mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
  ids.forEach((id,i)=>{source.getMatrixAt(id,matrix);mesh.setMatrixAt(i,matrix);});
  mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
 }
 source.removeFromParent();source.userData.chunks=group;return group;
}
