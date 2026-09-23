import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Rigid vertex weights preserve the procedural rig's exact part articulation.
// Original pieces stay available off-scene for wounds and physical ragdolls.
export function skinCrew(crew,texture){
 const rig=new THREE.Group();rig.matrixAutoUpdate=false;rig.matrixWorldAutoUpdate=false;
 for(const part of crew.parts)rig.add(part.mesh);rig.updateMatrixWorld(true);
 const geometries=[];
 crew.parts.forEach(({mesh},bone)=>mesh.traverse(source=>{
  if(!source.isMesh)return;
  let geo=source.geometry.clone();if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}
  geo.applyMatrix4(source.matrixWorld);
  const count=geo.attributes.position.count,color=new Float32Array(count*3),skinIndex=new Uint16Array(count*4),skinWeight=new Float32Array(count*4),surface=new Float32Array(count*3),material=source.material;
  for(let i=0;i<count;i++){color.set([material.color.r,material.color.g,material.color.b],i*3);skinIndex[i*4]=bone;skinWeight[i*4]=1;surface.set([material.roughness??1,material.metalness??0,material.map?1:0],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(color,3));geo.setAttribute('skinIndex',new THREE.BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(skinWeight,4));geo.setAttribute('surface',new THREE.BufferAttribute(surface,3));geometries.push(geo);
 }));
 const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
 const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,map:texture||null,roughness:1,metalness:1});
 const patch=shader=>{shader.vertexShader='attribute vec3 surface;varying vec3 vSurface;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=surface;');shader.fragmentShader='varying vec3 vSurface;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nif(vSurface.z>.5){vec4 sampledDiffuseColor=texture2D(map,vMapUv);diffuseColor*=sampledDiffuseColor;}\n#endif');shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=vSurface.x;').replace('#include <metalnessmap_fragment>','float metalnessFactor=vSurface.y;');};
 material.onBeforeCompile=patch;material.customProgramCacheKey=()=> 'infantry-surface-v1';
 // Material.clone does not preserve onBeforeCompile; visibility uses this hook.
 material.userData.shaderPatch=patch;
 const mesh=new THREE.SkinnedMesh(geometry,material),skeleton=new THREE.Skeleton(crew.parts.map(p=>p.mesh));mesh.name='Skinned infantry';mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.bind(skeleton,new THREE.Matrix4());crew.root.add(mesh);
 const sync=()=>{crew.root.updateWorldMatrix(true,false);rig.matrixWorld.copy(crew.root.matrixWorld);for(const part of crew.parts)part.mesh.updateMatrixWorld(true);skeleton.update();};
 mesh.onBeforeRender=sync;mesh.onBeforeShadow=sync;
 crew.skin={mesh,rig,material,skeleton,sync};
}
export function restoreCrew(crew){
 const skin=crew.skin;if(!skin)return;
 skin.mesh.removeFromParent();for(const part of crew.parts)crew.root.add(part.mesh);
 skin.skeleton.dispose();skin.mesh.geometry.dispose();skin.material.dispose();crew.skin=null;
}
