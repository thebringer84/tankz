import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createVanguard} from './vanguard.js';
import {createKestrel} from './kestrel.js';
import {createMarauder} from './marauder.js';
import {TANKS} from './config.js';
const boxGeo=new RoundedBoxGeometry(1,1,1,1,.05), cylGeo=new THREE.CylinderGeometry(1,1,1,12);
export function box(parent,mat,x,y,z,sx,sy,sz,rz=0){const m=new THREE.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function cylinder(parent,mat,x,y,z,r,h,axis='y'){const m=new THREE.Mesh(cylGeo,mat);m.position.set(x,y,z);m.scale.set(r,h,r);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function createTank(type,materials,enemy=false,detail='low'){
 if(type==='medium')return createVanguard(materials,enemy,detail);
 if(type==='heavy'){const model=createMarauder(materials,enemy,detail);model.root.scale.setScalar(TANKS.heavy.scale);return model;}
 if(type==='scout'){const model=createKestrel(materials,enemy,detail);model.root.scale.setScalar(TANKS.scout.scale);return model;}
 throw new Error(`Unknown tank type: ${type}`);
}
export function makeMaterials(textures){
 return {
 armorNormal:textures.armorNormal||null,armorRoughness:textures.armorRoughness||null,droneComposite:textures.droneComposite||null,
 vanguard:{albedo:textures.vanguardAlbedo||textures.armor||null,normal:textures.vanguardNormal||null,roughness:textures.vanguardRoughness||null,specular:textures.vanguardSpecular||null,bump:textures.vanguardBump||null,
  gearAlbedo:textures.vanguardGearAlbedo||null,gearNormal:textures.vanguardGearNormal||null,gearRoughness:textures.vanguardGearRoughness||null,gearSpecular:textures.vanguardGearSpecular||null,gearBump:textures.vanguardGearBump||null,
  canvas:textures.vanguardCanvas||null,canvasNormal:textures.vanguardCanvasNormal||null,canvasBump:textures.vanguardCanvasBump||null,decal:textures.vanguardDecal||null,lens:textures.vanguardLens||null,grime:textures.vanguardGrime||null},
 kestrel:{albedo:textures.kestrelAlbedo||null,normal:textures.kestrelNormal||null,roughness:textures.kestrelRoughness||null,specular:textures.kestrelSpecular||null,bump:textures.kestrelBump||null},
 marauder:{albedo:textures.marauderAlbedo||null,normal:textures.marauderNormal||null,roughness:textures.marauderRoughness||null,specular:textures.marauderSpecular||null,bump:textures.marauderBump||null,hazard:textures.marauderHazard||null},
 uniform:new THREE.MeshStandardMaterial({map:textures.armor,color:0xc7bb95,roughness:1}),
 skin:new THREE.MeshStandardMaterial({color:0xc59a73,roughness:1}),
 helmet:new THREE.MeshStandardMaterial({color:0x73774b,roughness:.9}),
 armor:new THREE.MeshStandardMaterial({map:textures.armor,roughness:.88,metalness:.08}),
 dark:new THREE.MeshStandardMaterial({color:0x262d29,roughness:.83,metalness:.45}),
 steel:new THREE.MeshStandardMaterial({color:0x4b5147,roughness:.62,metalness:.65}),
 track:new THREE.MeshStandardMaterial({color:0x383a31,roughness:.96}),
 concrete:new THREE.MeshStandardMaterial({map:textures.concrete,color:0xdedbcc,roughness:1,normalMap:textures.normal,normalScale:new THREE.Vector2(.11,.11)}),
 rock:new THREE.MeshStandardMaterial({map:textures.rock,color:0xd0c7b5,normalMap:textures.normal,normalScale:new THREE.Vector2(.23,.23),roughness:1,flatShading:true}),
 rust:new THREE.MeshStandardMaterial({map:textures.armor,color:0x9d5a37,roughness:.92,metalness:.4}),
 canvas:new THREE.MeshStandardMaterial({color:0x8b7a55,roughness:1}),
 teal:new THREE.MeshStandardMaterial({color:0x8bc9be,roughness:.7}),
 red:new THREE.MeshStandardMaterial({color:0xc86e49,roughness:.7}),
 lamp:new THREE.MeshStandardMaterial({color:0xffdea1,emissive:0xe5a755,emissiveIntensity:.25})
 };
}

export function batchStaticMeshes(group,exclude=new Set()){
 const batches=new Map();for(const child of [...group.children]){if(!child.isMesh||exclude.has(child))continue;(group.batchedSources??=[]).push(child);child.updateMatrix();const geo=child.geometry.clone().applyMatrix4(child.matrix);if(!geo.index){/* normalized below */}const normalized=geo.index?geo.toNonIndexed():geo;if(normalized!==geo)geo.dispose();if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(normalized);group.remove(child);}
 for(const [material,geometries] of batches){const merged=mergeGeometries(geometries,false);if(merged){const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}geometries.forEach(g=>g.dispose());}
}

// Separate mesh parts double as the bodies of an articulated ragdoll after ejection.
export function createCrew(materials,seated=false){
 const root=new THREE.Group(),parts=[],links=[];
 const part=(name,material,position,size,mass)=>{const mesh=box(root,material,...position,...size);parts.push({name,mesh,mass});return mesh;};
 part('torso',materials.uniform,[0,.75,0],[.38,.46,.24],14);
 part('pelvis',materials.uniform,[0,.43,0],[.34,.22,.23],8);
 const head=part('head',materials.skin,[0,1.13,.025],[.24,.25,.23],4);
 // Child details remain attached to their rigid head/torso, with no extra bodies.
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.16,10,6,0,Math.PI*2,0,Math.PI*.65),materials.helmet);helmet.position.set(0,.095,0);helmet.scale.set(1/.24,1/.25,1/.23);head.add(helmet);
 links.push(['torso','head',[0,.995,0]],['torso','pelvis',[0,.535,0]]);
 for(const side of [-1,1]){
  const suffix=side<0?'L':'R';
  part('upperArm'+suffix,materials.uniform,[side*.28,.77,0],[.15,.3,.16],3);
  const forearm=part('forearm'+suffix,materials.uniform,[side*.28,.61,.16],[.14,.15,.32],2);
  const hand=new THREE.Mesh(boxGeo,materials.skin);hand.position.set(0,0,.52);hand.scale.set(.85,.85,.35);forearm.add(hand);
  const thigh=seated?[side*.11,.34,.17]:[side*.11,.2,0];const shin=seated?[side*.11,.095,.32]:[side*.11,-.15,.015];
  part('thigh'+suffix,materials.uniform,thigh,seated?[.17,.18,.4]:[.17,.34,.19],6);
  const boot=part('shin'+suffix,materials.uniform,shin,[.155,.32,.17],4);
  const foot=new THREE.Mesh(boxGeo,materials.dark);foot.position.set(0,-.36,.24);foot.scale.set(1.1,.36,1.6);boot.add(foot);
  links.push(['torso','upperArm'+suffix,[side*.215,.86,0]],['upperArm'+suffix,'forearm'+suffix,[side*.28,.625,.015]],['pelvis','thigh'+suffix,[side*.11,.36,.015]],['thigh'+suffix,'shin'+suffix,seated?[side*.11,.25,.32]:[side*.11,.03,0]]);
 }
 return {root,parts,links};
}
export function createJeep(materials){
 const root=new THREE.Group(),body=new THREE.Group(),armor=materials.armor.clone();armor.color.setHex(0xd8c79f);root.add(body);
 box(body,armor,0,-.1,0,1.7,.28,2.9);box(body,armor,0,.18,1.02,1.65,.38,1.04);box(body,materials.dark,0,-.05,1.57,1.82,.18,.16);
 // Flat grille, round lamps, open cabin and exposed rear bed.
 box(body,armor,0,.12,1.56,1.5,.45,.1);for(let i=0;i<7;i++)box(body,materials.dark,-.45+i*.15,.16,1.62,.055,.27,.02);
 for(const side of [-1,1]){cylinder(body,materials.lamp,side*.62,.23,1.64,.13,.05,'z');box(body,armor,side*.78,.2,-.63,.12,.56,1.9);box(body,armor,side*.92,.17,1.04,.38,.1,1.15);box(body,materials.dark,side*.79,.8,.55,.045,.95,.045);}
 box(body,materials.steel,0,1.27,.55,1.62,.045,.05);box(body,materials.steel,0,.54,.55,1.62,.045,.05);box(body,materials.steel,0,.89,.55,.045,.73,.05);
 for(const side of [-1,1]){box(body,materials.canvas,side*.39,.14,.1,.5,.15,.5);box(body,materials.canvas,side*.39,.44,-.12,.5,.56,.12);}
 const wheels=[];for(const side of [-1,1])for(const z of [-1.16,1.16]){const wheel=new THREE.Group();wheel.position.set(side*.95,-.25,z);cylinder(wheel,materials.track,0,0,0,.43,.31,'x');cylinder(wheel,armor,side*.17,0,0,.23,.035,'x');batchStaticMeshes(wheel,new Set());body.add(wheel);wheels.push(wheel);}
 cylinder(body,materials.track,0,.37,-1.59,.43,.26,'z');cylinder(body,armor,0,.37,-1.735,.22,.025,'z');
 cylinder(body,materials.steel,0,.52,-.62,.065,1.15);
 const turret=new THREE.Group();turret.position.set(0,.99,-.63);body.add(turret);
 const gun=new THREE.Group();turret.add(gun);box(gun,materials.dark,0,0,.22,.15,.16,.54);cylinder(gun,materials.steel,0,0,.76,.042,.68,'z');box(gun,materials.canvas,-.14,-.045,.18,.16,.24,.25);
 const muzzlePoint=new THREE.Object3D();muzzlePoint.position.set(0,0,1.13);gun.add(muzzlePoint);
 const driver=createCrew(materials,true);driver.root.position.set(-.39,.17,.12);body.add(driver.root);
 const gunner=createCrew(materials,false);gunner.root.position.set(0,-.59,-.33);turret.add(gunner.root);
 cylinder(body,materials.dark,-.39,.63,.42,.16,.04,'z');
 batchStaticMeshes(body,new Set([turret,...wheels]));batchStaticMeshes(turret,new Set([gun]));batchStaticMeshes(gun,new Set());
 return {root,body,turret,gun,muzzlePoint,wheels,armor,crew:[driver,gunner]};
}
