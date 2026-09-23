import {buildFrontier,rampGeometry} from './frontier.js';
import {RUIN_SITES,ROCK_SITES} from './world-layout.js';
import {TerrainRuts} from './terrain-ruts.js';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight,MAP_SIZE,MAP_HALF,TERRAIN_SEGMENTS,JUMP_RIDGES,seededRandom,inBuildingLot} from './config.js';
import {fracturedStoneGeometry} from './debris.js';
import {terrainSampler,alignToGround,seatOnGround} from './grounding.js';
import {freezeStatic,chunkInstances} from './render-geometry.js';
import {box,cylinder,batchStaticMeshes} from './models.js';
export function buildTerrain(scene,world,textures,materials,props,entities){
 const group=new THREE.Group();scene.add(group);const rand=seededRandom();
 const geo=new THREE.PlaneGeometry(MAP_SIZE,MAP_SIZE,TERRAIN_SEGMENTS,TERRAIN_SEGMENTS);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 const colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,terrainHeight(x,z));const noise=Math.sin(x*.11+Math.sin(z*.07))*Math.cos(z*.09);const c=new THREE.Color().setRGB(.89+noise*.09,.82+noise*.1,.66+noise*.12);colors.push(c.r,c.g,c.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 textures.height.repeat.set(MAP_SIZE*.055,MAP_SIZE*.055);
 const ruts=new TerrainRuts(geo,world);
 const mat=new THREE.MeshStandardMaterial({map:textures.sand,normalMap:textures.normal,normalScale:new THREE.Vector2(.55,.55),bumpMap:textures.height,bumpScale:.13,roughness:1,vertexColors:true});
 // World-space splatting blends three rotated scales and a broad gravel mask.
 mat.onBeforeCompile=shader=>{shader.uniforms.mapSize={value:MAP_SIZE};shader.uniforms.rutMap={value:ruts.texture};shader.uniforms.heightTex={value:textures.height};shader.uniforms.rockTex={value:textures.rock};shader.vertexShader='varying vec3 vGround;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGround=position;');shader.fragmentShader='uniform float mapSize;varying vec3 vGround;uniform sampler2D heightTex;uniform sampler2D rockTex;uniform sampler2D rutMap;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec2 uv1=vGround.xz*.055;vec2 uv2=mat2(.8,-.6,.6,.8)*vGround.xz*.089+vec2(.32,.71);vec2 uv3=vGround.xz*.017;float mask=smoothstep(-.45,.65,sin(vGround.x*.065+sin(vGround.z*.042)*2.)*cos(vGround.z*.073));vec4 a=texture2D(map,uv1);vec4 b=texture2D(map,uv2);vec4 c=texture2D(map,uv3);float h=texture2D(heightTex,uv1).r;float rockMask=smoothstep(.4,.82,sin(vGround.x*.1+sin(vGround.z*.08))*cos(vGround.z*.12));vec4 ground=mix(a,b,mask)*mix(vec4(.86),vec4(1.13),c.r)*mix(.92,1.07,h);diffuseColor*=mix(ground,texture2D(rockTex,uv2*.48)*vec4(.87,.84,.76,1.),rockMask*.75);diffuseColor.rgb*=1.-texture2D(rutMap,(vGround.xz+mapSize*.5)/mapSize).r*.18;`);shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n#if defined(USE_BUMPMAP) && defined(USE_NORMALMAP_TANGENTSPACE)\nfloat rutHeight=-texture2D(rutMap,(vGround.xz+mapSize*.5)/mapSize).r*.075;normal=perturbNormalArb(-vViewPosition,normal,dHdxy_fwd()+vec2(dFdx(rutHeight),dFdy(rutHeight)),faceDirection);\n#endif');};
 const surfaceHeight=terrainSampler(geo,MAP_SIZE,TERRAIN_SEGMENTS);
 const terrain=new THREE.Group();terrain.name='Chunked terrain';group.add(terrain);ruts.attachRender(terrain,mat);
 // Continuous safety backstop behind the solid visible frontier, including airborne jumps.
 for(const s of [-1,1]){world.createCollider(RAPIER.ColliderDesc.cuboid(2,15,MAP_SIZE/2).setTranslation(s*(MAP_SIZE/2-2),10,0));world.createCollider(RAPIER.ColliderDesc.cuboid(MAP_SIZE/2,15,2).setTranslation(0,10,s*(MAP_SIZE/2-2)));}
 const addProp=(mesh,x,y,z,hx,hy,hz,hp=180,dynamic=false,mass=30,meshCollision=false,kind='cover')=>{
   mesh.position.set(x,y,z);if(kind==='rock'||kind==='barrel')alignToGround(mesh,surfaceHeight);
   y=seatOnGround(mesh,mesh.geometry,surfaceHeight,dynamic?.005:kind==='rock'?Math.max(.08,hy*.22):.06);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
   const rb=world.createRigidBody((dynamic?RAPIER.RigidBodyDesc.dynamic():RAPIER.RigidBodyDesc.fixed()).setTranslation(x,y,z).setRotation(mesh.quaternion));
   let shape;if(meshCollision){const geometry=mesh.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(),new THREE.Quaternion(),mesh.scale));const vertices=new Float32Array(geometry.attributes.position.array);const indices=geometry.index?new Uint32Array(geometry.index.array):Uint32Array.from({length:vertices.length/3},(_,i)=>i);shape=dynamic?RAPIER.ColliderDesc.convexHull(vertices):RAPIER.ColliderDesc.trimesh(vertices,indices);geometry.dispose();}else shape=kind==='barrel'?RAPIER.ColliderDesc.cylinder(hy,hx):RAPIER.ColliderDesc.cuboid(hx,hy,hz);
   const collider=world.createCollider(shape.setMass(mass).setFriction(.85),rb);
   const prop={id:`cover-${props.length}`,mesh,body:rb,collider,hp,maxHp:hp,dynamic,destroyed:false,kind};props.push(prop);entities.set(collider.handle,prop);return prop;
 };
 // Ruined blocks leave lanes wide enough for a broad tank and flank routes.
 const ruins=RUIN_SITES;
 for(let b=0;b<ruins.length;b++){
  const [cx,cz]=ruins[b],details=new THREE.Group();group.add(details);
  const floor=box(details,materials.concrete,cx,terrainHeight(cx,cz)+.06,cz,10,.16,9);floor.receiveShadow=true;
  for(let j=0;j<5;j++)for(const axis of [0,1]){if((j===2&&axis===0)||(j===4&&axis===1))continue;const x=cx+(axis? -4.5:-4+j*2),z=cz+(axis?-4+j*2:-4.5),h=2+rand()*3.6;const mesh=new THREE.Mesh(new THREE.BoxGeometry(axis?.65:1.9,h,axis?1.9:.65),materials.concrete);addProp(mesh,x,terrainHeight(x,z)+h/2,z,axis?.325:.95,h/2,axis?.95:.325,190);box(details,materials.dark,x,terrainHeight(x,z)+h+.32,z,.045,.8,.045);}
  for(let j=0;j<7;j++){const x=cx+(rand()-.5)*12,z=cz+(rand()-.5)*12;const sx=.45+rand()*.9,sy=.25+rand()*.35,sz=.5+rand()*.7;const mesh=new THREE.Mesh(fracturedStoneGeometry(1,rand),materials.concrete);mesh.scale.set(sx*1.25,sy*1.7,sz*1.3);addProp(mesh,x,terrainHeight(x,z)+sy,z,sx,sy,sz,90,true,120,true);}
  // Rusted beams keep the industrial silhouette above broken masonry.
  for(let j=0;j<2;j++)box(details,materials.rust,cx-4.5+j*9,terrainHeight(cx,cz)+3,cz+3,.18,6,.18);
  box(details,materials.rust,cx,terrainHeight(cx,cz)+5.9,cz+3,9,.2,.2);batchStaticMeshes(details);
 }
 const frontier=buildFrontier(group,world,materials,textures);
 const rockGeo=new THREE.DodecahedronGeometry(1,0);
 // Broad low stone shelves provide additional launch points beside the dunes.
 const jumpRocks=[];
 for(let i=0;i<JUMP_RIDGES.length;i+=3){const ridge=JUMP_RIDGES[i],x=ridge.x+Math.cos(ridge.yaw)*22,z=ridge.z-Math.sin(ridge.yaw)*22;
  const geometry=rampGeometry(729+i);
  const mesh=new THREE.Mesh(geometry,frontier.stone);mesh.rotation.y=ridge.yaw;const rock=addProp(mesh,x,0,z,4,2.3,8,Infinity,false,30,true,'rock');rock.jump=true;jumpRocks.push(rock);
 }
 for(const [x,z] of ROCK_SITES){const sx=1+rand()*2.7,sy=.5+rand()*1.6,sz=.8+rand()*2.3;const mesh=new THREE.Mesh(rockGeo,materials.rock);mesh.scale.set(sx,sy,sz);mesh.rotation.y=rand()*6;addProp(mesh,x,terrainHeight(x,z)+sy*.65,z,sx*.78,sy*.75,sz*.78,Infinity,false,30,true,'rock');}
 // Fuel drums are physical objects and can chain-react under HE.
 for(let i=0;i<20;i++){const [cx,cz]=ruins[i%ruins.length],x=cx+6+rand()*2,z=cz+rand()*4;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,1.3,12),materials.rust);const pr=addProp(mesh,x,terrainHeight(x,z)+.7,z,.45,.65,.45,65,true,35,false,'barrel');pr.explosive=true;}
 // Instanced dry shrubs: clustered low-poly foliage on small branches.
 const shrubMat=new THREE.MeshStandardMaterial({color:0x7d8058,roughness:1,flatShading:true});const shrubGeo=new THREE.IcosahedronGeometry(1,1),shrubs=new THREE.InstancedMesh(shrubGeo,shrubMat,6000);const d=new THREE.Object3D();let n=0;
 for(let i=0;i<1100;i++){const x=(rand()-.5)*(MAP_SIZE-15),z=(rand()-.5)*(MAP_SIZE-15);if(Math.hypot(x,z-17)<7)continue;const size=.35+rand()*.75;for(let j=0;j<5;j++){d.position.set(x+(rand()-.5)*size,terrainHeight(x,z)+size*.33+rand()*.35,z+(rand()-.5)*size);d.scale.set(size*.42,size*(.2+rand()*.3),size*.32);d.rotation.set(rand(),rand()*6,rand());seatOnGround(d,shrubGeo,surfaceHeight,.07);if(!inBuildingLot(x,z,.5))shrubs.setMatrixAt(n++,d.matrix);}}
 const branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.05,1,4),materials.canvas,1000);let bn=0;const twigRand=seededRandom(919);for(let i=0;i<900;i++){const x=(twigRand()-.5)*(MAP_SIZE-15),z=(twigRand()-.5)*(MAP_SIZE-15);d.position.set(x,terrainHeight(x,z)+.35,z);d.scale.set(1,.6+twigRand()*.5,1);d.rotation.set((twigRand()-.5)*.5,twigRand()*6,(twigRand()-.5)*.5);seatOnGround(d,branches.geometry,surfaceHeight,.06);if(!inBuildingLot(x,z,.5))branches.setMatrixAt(bn++,d.matrix);}branches.count=bn;group.add(branches);shrubs.count=n;shrubs.castShadow=true;shrubs.receiveShadow=true;group.add(shrubs);
 group.add(chunkInstances(shrubs,MAP_SIZE),chunkInstances(branches,MAP_SIZE));freezeStatic(group,new Set(props.filter(p=>p.dynamic).map(p=>p.mesh)));
 ruts.props=props;ruts.ruins=ruins;return {group,terrain,frontier,ruins,surfaceHeight,shrubs,branches,ruts,jumpRocks,jumpRidges:JUMP_RIDGES};
}
