import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Same rigid leg pivots as the close-up procedural rig, evaluated per vertex.
// Each instance carries phase, gait blend, run blend and weapon elevation.
const declarations=`
attribute float crowdPart;
attribute vec4 crowdMotion;
attribute float crowdOpacity;
varying float vCrowdOpacity;
vec3 crowdRX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec3 crowdPose(vec3 p,bool normal){
 float phase=crowdMotion.x,weight=crowdMotion.y,run=crowdMotion.z;
 bool left=crowdPart==5.0||crowdPart==6.0;
 bool leg=left||crowdPart==9.0||crowdPart==10.0;
 if(leg){
  float side=left?-1.0:1.0,step=phase+(left?0.0:3.14159265359);
  float swing=sin(step)*(.48+run*.3)*weight;
  float bend=max(0.0,-cos(step))*(.5+run*.65)*weight;
  vec3 hip=vec3(side*.11,.36,.015),knee=vec3(side*.11,.03,0.0);
  if(crowdPart==6.0||crowdPart==10.0)p=normal?crowdRX(p,-bend):crowdRX(p-knee,-bend)+knee;
  p=normal?crowdRX(p,swing):crowdRX(p-hip,swing)+hip;
 }
 if(crowdPart==11.0){p=crowdRX(p,crowdMotion.w);if(!normal)p+=vec3(.1,.72+sin(phase*2.0)*weight*.012,.18);}
 p=crowdRX(p,run*weight*.09);
 if(!normal)p.y+=-.42+abs(sin(phase))*weight*(.025+run*.035);
 return p;
}
`;
const fade=`
// Screen-door fading keeps depth, shadows and the fog pass consistent without
// per-instance transparent sorting. Fully hidden troops never enter the batch.
float crowdThreshold=fract(dot(floor(gl_FragCoord.xy),vec2(.754877666,.569840296)));
if(vCrowdOpacity<=crowdThreshold)discard;
`;
function patchAnimation(shader){
 shader.vertexShader=declarations+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=crowdPose(position,false);vCrowdOpacity=crowdOpacity;');
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal=crowdPose(normal,true);');
 shader.fragmentShader='varying float vCrowdOpacity;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+fade);
}

export function crowdGeometry(s){
 const body=s.crew.skin.mesh.geometry.clone(),indices=body.getAttribute('skinIndex');
 body.setAttribute('crowdPart',new THREE.Float32BufferAttribute(Array.from({length:indices.count},(_,i)=>indices.getX(i)),1));
 body.deleteAttribute('skinIndex');body.deleteAttribute('skinWeight');
 const parts=[body];
 s.gun.traverse(mesh=>{
  if(!mesh.isMesh)return;mesh.updateMatrix();
  let geo=mesh.geometry.clone();if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}
  geo.applyMatrix4(mesh.matrix);
  const count=geo.getAttribute('position').count,colors=new Float32Array(count*3),surfaces=new Float32Array(count*3),m=mesh.material;
  for(let i=0;i<count;i++){colors.set([m.color.r,m.color.g,m.color.b],i*3);surfaces.set([m.roughness??1,m.metalness??0,m.map?1:0],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setAttribute('surface',new THREE.BufferAttribute(surfaces,3));
  geo.setAttribute('crowdPart',new THREE.Float32BufferAttribute(new Float32Array(count).fill(11),1));parts.push(geo);
 });
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());return geometry;
}

export class InfantryCrowd {
 constructor(game){this.game=game;this.enabled=true;this.mesh=null;this.capacity=0;this.matrix=new THREE.Matrix4();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3(1,1,1);this.position=new THREE.Vector3();this.axis=new THREE.Vector3(0,1,0);}
 eligible(s){
  if(!this.enabled||s.dead||s.wounded||s.weapon!=='mg'||!s.crew.skin||this.game.autoTarget===s||(s.recentDamageUntil||0)>this.game.time)return false;
  const player=this.game.player?.body.translation();if(!player)return false;
  const p=s.body.translation(),distance=Math.hypot(p.x-player.x,p.z-player.z);
  return distance>(s.crowdBatched?22:30);
 }
 create(s){
  const geometry=crowdGeometry(s),material=s.crew.skin.material.clone();
  const surface=s.crew.skin.material.userData.shaderPatch;
  material.onBeforeCompile=shader=>{surface(shader);patchAnimation(shader);};
  material.customProgramCacheKey=()=> 'infantry-crowd-v1';
  this.mesh=new THREE.InstancedMesh(geometry,material,1);this.mesh.name='GPU infantry crowd';
  this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.castShadow=this.mesh.receiveShadow=true;this.mesh.renderOrder=-1;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),distance=new THREE.MeshDistanceMaterial();
  for(const m of [depth,distance]){m.onBeforeCompile=patchAnimation;m.customProgramCacheKey=()=> 'infantry-crowd-depth-v1';}
  this.mesh.customDepthMaterial=depth;this.mesh.customDistanceMaterial=distance;this.game.root.add(this.mesh);
 }
 prepare(){
  const g=this.game,soldiers=g.soldiers||[];
  if(!this.mesh){const source=soldiers.find(s=>!s.dead&&s.weapon==='mg'&&s.crew.skin);if(!source)return;this.create(source);}
  if(soldiers.length>this.capacity){
   if(this.capacity){this.mesh.dispose();this.mesh.geometry.dispose();}
   this.capacity=2**Math.ceil(Math.log2(Math.max(32,soldiers.length)));
   this.mesh.instanceMatrix=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*16),16).setUsage(THREE.DynamicDrawUsage);
   this.motion=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*4),4).setUsage(THREE.DynamicDrawUsage);
   this.opacity=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1).setUsage(THREE.DynamicDrawUsage);
   this.mesh.geometry.setAttribute('crowdMotion',this.motion);this.mesh.geometry.setAttribute('crowdOpacity',this.opacity);
  }
  // Visibility owns reveal/fade decisions; batching cannot reveal hidden units.
  let count=0;
  for(const s of soldiers){
   const batched=this.eligible(s);
   if(s.crowdBatched&&!batched&&!s.dead&&!s.wounded)g.infantry?.pose(s);
   s.crowdBatched=batched;
   if(s.crew.skin)s.crew.skin.mesh.visible=!batched;
   if(!s.wounded&&!s.dead)s.gun.visible=!batched;
   const opacity=s.visibilityOpacity??(s.visibleToPlayer===false?0:1);
   if(!batched||opacity<=.005||!s.root.visible)continue;
   this.position.copy(s.body.translation());
   this.rotation.setFromAxisAngle(this.axis,s.yaw);this.matrix.compose(this.position,this.rotation,this.scale);
   this.mesh.setMatrixAt(count,this.matrix);
   const gait=s.gait;this.motion.setXYZW(count,gait?.phase||0,gait?.weight||0,gait?.run||0,s.aimElevation||0);
   this.opacity.setX(count,opacity);count++;
  }
  this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;this.motion.needsUpdate=true;this.opacity.needsUpdate=true;
 }
 restore(s){
  s.crowdBatched=false;if(s.crew.skin)s.crew.skin.mesh.visible=true;if(!s.wounded)s.gun.visible=true;
 }
 dispose(){if(!this.mesh)return;this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.customDepthMaterial.dispose();this.mesh.customDistanceMaterial.dispose();this.mesh.dispose();this.mesh=null;}
}
