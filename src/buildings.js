import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {BUILDING_LOTS,lotFrame} from './config.js';
import {createBlueprint} from './building-catalog.js';
import {extractCells,hideCell,compactHull} from './building-geometry.js';
import {Grit,RubbleBatch,dustPuff,dustCloud,dustTrail,glassBurst} from './building-fx.js';

const V=()=>new THREE.Vector3();
// Building debris has its own membership bit (0x0020). It skips the tank chassis
// group (0x0002) so hulls ride over broken masonry on their suspension rays, and
// projectiles skip it (PROJECTILE_GROUPS) so loose rubble never soaks up tank rounds.
export const DEBRIS_GROUPS=0x0020fffd,PROJECTILE_GROUPS=0xffffffdf;
const LOAD_BEARING=new Set(['wall','column','parapet']),SLAB_GAP=.3;
const MAX_DEBRIS=110,MAX_FALLING=46,MAX_RUBBLE_COLLIDERS=160;

export const BUILDING_TEXTURES={buildingPlaster:'plaster-albedo.jpg',buildingPlasterNormal:'plaster-normal.png',buildingBrick:'brick-albedo.jpg',buildingBrickNormal:'brick-normal.png',buildingCore:'rubble-core-albedo.jpg',buildingCoreNormal:'rubble-core-normal.png',buildingRoof:'roof-albedo.jpg',buildingRoofNormal:'roof-normal.png',buildingTile:'tile-albedo.jpg',buildingTileNormal:'tile-normal.png',buildingMetal:'corrugated-albedo.jpg',buildingMetalNormal:'corrugated-normal.png',buildingAtlas:'facade-atlas.jpg'};
export async function loadBuildingTextures(loader,base,textures,anisotropy=8,progress=()=>{}){
 let done=0;const keys=Object.keys(BUILDING_TEXTURES);
 await Promise.all(keys.map(async key=>{const t=await loader.loadAsync(`${base}assets/buildings/${BUILDING_TEXTURES[key]}`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;if(!key.endsWith('Normal'))t.colorSpace=THREE.SRGBColorSpace;if(key==='buildingAtlas')t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;textures[key]=t;progress(++done/keys.length);}));
}
// Shared uniforms for the see-through cutaway around the player's tank.
export const CUTAWAY={center:{value:new THREE.Vector2()},radius:{value:0},depth:{value:0},aspect:{value:1}};
function cutaway(material){
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,{cutCenter:CUTAWAY.center,cutRadius:CUTAWAY.radius,cutDepth:CUTAWAY.depth,cutAspect:CUTAWAY.aspect});
  shader.vertexShader='varying vec4 vCutClip;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvCutClip=gl_Position;');
  shader.fragmentShader='uniform vec2 cutCenter;uniform float cutRadius,cutDepth,cutAspect;varying vec4 vCutClip;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(cutRadius>0.&&vViewPosition.z<cutDepth-1.2){vec2 d=(vCutClip.xy/vCutClip.w-cutCenter)*vec2(cutAspect,1.);float n=fract(sin(dot(floor(gl_FragCoord.xy*.5),vec2(12.9898,78.233)))*43758.5453);if(length(d)<cutRadius*(1.-.3*n))discard;}');};
 material.customProgramCacheKey=()=>'building-cutaway';return material;
}
export function buildingMaterials(textures={},shared={}){
 const make=(key,map,normal,opts={})=>{const m=cutaway(new THREE.MeshStandardMaterial({map:map||null,normalMap:normal||null,normalScale:new THREE.Vector2(.9,.9),vertexColors:true,roughness:.95,metalness:0,...opts}));m.userData.key=key;m.name=`building-${key}`;return m;};
 return {
  plaster:make('plaster',textures.buildingPlaster,textures.buildingPlasterNormal),
  brick:make('brick',textures.buildingBrick,textures.buildingBrickNormal,{normalScale:new THREE.Vector2(1.3,1.3)}),
  concrete:make('concrete',textures.concrete,textures.buildingPlasterNormal,{normalScale:new THREE.Vector2(.5,.5)}),
  roof:make('roof',textures.buildingRoof,textures.buildingRoofNormal),
  core:make('core',textures.buildingCore,textures.buildingCoreNormal,{normalScale:new THREE.Vector2(1.4,1.4)}),
  tile:make('tile',textures.buildingTile,textures.buildingTileNormal,{roughness:.42,normalScale:new THREE.Vector2(.5,.5)}),
  metal:make('metal',textures.buildingMetal,textures.buildingMetalNormal,{roughness:.62,metalness:.35,side:THREE.DoubleSide,normalScale:new THREE.Vector2(1.4,1.4)}),
  wood:make('wood',textures.sceneryWood,null,{roughness:.9}),
  paint:make('paint',null,null,{roughness:.78,side:THREE.DoubleSide}),
  steel:make('steel',null,null,{roughness:.55,metalness:.55}),
  atlas:make('atlas',textures.buildingAtlas,null,{roughness:.82}),
  grit:new THREE.MeshStandardMaterial({map:textures.buildingCore||null,roughness:1,flatShading:true}),
  ...shared
 };
}

export class Buildings {
 constructor(game,materials=game.materials?.buildings||buildingMaterials(game.textures)){
  this.game=game;this.materials=materials;this.items=[];this.debris=[];this.falling=[];this.rubbleColliders=[];this.time=0;this.chipFx=0;this.rand=game.rand||Math.random;
  this.grit=new Grit(game.root,materials.grit);this.rubble=new RubbleBatch(game.root,materials);this.stats={detached:0,collapsed:0,shattered:0};
 }
 deploy(lots=BUILDING_LOTS,dressing=true){for(const [i,lot] of lots.entries())this.spawn(lot,i*37+11);if(dressing)this.spawn({type:'street',x:0,z:0,yaw:0,pad:0,hw:0,hd:0},97);return this.items;}
 spawn(lot,seed=1){
  const g=this.game;lotFrame(lot);const bp=createBlueprint(lot.type,seed),geos=bp.writer.build(),fixed=bp.fixed.build();
  const group=new THREE.Group();group.name=`building-${lot.type}`;group.position.set(lot.x,lot.pad+.02,lot.z);group.rotation.y=lot.yaw;group.updateMatrixWorld(true);
  for(const [mat,geo] of [...geos,...fixed]){const mesh=new THREE.Mesh(geo,this.materials[mat]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=`${lot.type}-${mat}`;group.add(mesh);}
  const quat=group.quaternion.clone(),body=g.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(group.position.x,group.position.y,group.position.z).setRotation(quat));
  const b={id:`building-${g.nextId++}`,type:lot.type,lot,bp,group,geos,body,quat,matrix:group.matrixWorld.clone(),inverse:group.matrixWorld.clone().invert(),modules:bp.modules,lean:new THREE.Vector2(0,1),collapsedNotice:false,bounds:new THREE.Box3()};
  for(const m of b.modules){m.building=b;m.state='standing';m.stable=true;m.total=0;for(const c of m.cells)if(!c.decor)m.total+=c.volume;m.alive=m.total;
   if(m.removed){for(const c of m.cells){c.alive=false;hideCell(geos,c);}m.state='gone';continue;}
   m.world=this.worldBox(b,m.box);for(const grp of m.groups)this.groupColliders(b,m,grp);for(const c of m.cells)if(!c.group&&c.solid&&c.alive)this.cellCollider(b,m,c);}
  for(const m of b.modules)if(m.world)b.bounds.union(m.world);
  this.linkStructure(b);g.root.add(group);this.items.push(b);return b;
 }
 worldBox(b,box){const out=new THREE.Box3();for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])out.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(b.matrix));return out;}
 register(b,m,collider,extra={}){const e={building:true,buildingPart:true,b,m,...extra};this.game.entities.set(collider.handle,e);return e;}
 groupColliders(b,m,grp){
  if(grp.shape&&!grp.fractured){const s=grp.shape,basis=s.basis||[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)],q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(basis[0],basis[1],basis[2]));
   grp.collider=this.game.world.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(.02,s.half[0]),Math.max(.02,s.half[1]),Math.max(.02,s.half[2])).setTranslation(s.center.x,s.center.y,s.center.z).setRotation(q).setFriction(.8),b.body);this.register(b,m,grp.collider,{group:grp});return;}
  for(const c of grp.cells)if(c.alive&&c.solid)this.cellCollider(b,m,c);
 }
 cellCollider(b,m,c){const desc=RAPIER.ColliderDesc.convexHull(compactHull(c.hull))||RAPIER.ColliderDesc.cuboid(.1,.1,.1).setTranslation(c.center.x,c.center.y,c.center.z);c.collider=this.game.world.createCollider(desc.setFriction(.8),b.body);this.register(b,m,c.collider,{cell:c});}
 removeCollider(collider){if(!collider)return;this.game.entities.delete(collider.handle);if(this.game.world.getCollider(collider.handle))this.game.world.removeCollider(collider,false);}
 // Vertical supports carry weight; same-level neighbours can bridge a lost support.
 linkStructure(b){
  const mods=b.modules.filter(m=>m.state==='standing');
  for(const m of mods){m.supports=[];m.neighbors=[];m.ground=m.ground??(m.box.min.y<.15);
   if(m.explicit){for(const s of m.explicit)if(s&&s.state!=='gone')m.supports.push({m:s,w:1});}
   else if(!m.ground)for(const o of mods){if(o===m)continue;const w=Math.min(m.box.max.x,o.box.max.x+.05)-Math.max(m.box.min.x,o.box.min.x-.05),d=Math.min(m.box.max.z,o.box.max.z+.05)-Math.max(m.box.min.z,o.box.min.z-.05);if(w<=.02||d<=.02)continue;
    // Walls and columns also bear on the wall or column directly below, through the slab.
    if(Math.abs(o.box.max.y-m.box.min.y)<=.24)m.supports.push({m:o,w:w*d});else if(LOAD_BEARING.has(m.kind)&&LOAD_BEARING.has(o.kind)&&o.kind!=='parapet'&&Math.abs(o.box.max.y+SLAB_GAP-m.box.min.y)<=.26)m.supports.push({m:o,w:w*d*4});}
   for(const o of mods){if(o===m||o.kind!==m.kind||Math.abs(o.box.min.y-m.box.min.y)>.3)continue;if(m.box.clone().expandByScalar(.14).intersectsBox(o.box))m.neighbors.push(o);}
   m.supportTotal=m.supports.reduce((s,x)=>s+x.w,0);}
  b.order=[...mods].sort((a,c)=>(a.box.min.y+(a.explicit?.18:0))-(c.box.min.y+(c.explicit?.18:0)));
  this.evaluate(b,false);
 }
 integrity(m){return m.total>0?m.alive/m.total:m.state==='standing'?1:0;}
 // Re-evaluates stability bottom-up. Unstable modules are scheduled to fall, lower first.
 evaluate(b,schedule=true,originY=0){
  for(let pass=0;pass<3;pass++){
   for(const m of b.order){if(m.state!=='standing'){m.stable=false;m.vstable=false;continue;}
    let v=1;if(!m.ground){let sum=0;for(const s of m.supports)if(s.m.state==='standing'&&s.m.stable!==false)sum+=s.w*Math.min(1,this.integrity(s.m)/.75);v=m.supportTotal>0?sum/m.supportTotal:0;}
    m.vstable=v>=m.need;}
   for(const m of b.order){if(m.state!=='standing')continue;m.stable=m.vstable||m.neighbors.filter(o=>o.state==='standing'&&o.vstable).length>=m.lateral;}
  }
  const failing=[];for(const m of b.order)if(m.state==='standing'&&!m.stable){if(!schedule)continue;if(m.collapseAt===undefined){m.collapseAt=this.time+.12+Math.max(0,m.box.min.y-originY)*.075+this.rand()*.28;m.creak=0;}failing.push(m);}
  return failing;
 }
 local(b,p){return p.clone().applyMatrix4(b.inverse);}
 toWorld(b,p){return p.clone().applyMatrix4(b.matrix);}
 dirToWorld(b,d){return d.clone().applyQuaternion(b.quat);}
 dirToLocal(b,d){return d.clone().applyQuaternion(b.quat.clone().invert());}
 // Direct projectile hit on a building collider.
 hit(entity,point,shell){
  const b=entity.b,local=this.local(b,point),vel=V().copy(shell.incomingVelocity||shell.body?.linvel?.()||{x:0,y:0,z:-1});const dir=this.dirToLocal(b,vel.lengthSq()>1e-4?vel.normalize():new THREE.Vector3(0,0,-1));
  const damage=shell.damage||0,radius=shell.ammo?.radius||0;
  if(shell.secondary||damage<25)return this.chip(b,entity,local,dir,damage);
  const he=radius>3;this.breach(b,local,he?1.25+damage/170:.8+damage/260,dir,damage,he,entity.m);
  if(he)this.splashLocal(b,local,radius*.42,damage*.45,entity.m);
 }
 // HE splash from impacts that did not hit this building directly.
 splash(point,radius,damage,shell,skip=null){
  for(const b of this.items){if(skip?.b===b)continue;const local=this.local(b,point);let near=false;for(const m of b.modules)if(m.state==='standing'&&m.box.distanceToPoint(local)<radius*.45){near=true;break;}if(near)this.splashLocal(b,local,radius*.45,damage*.6,null);}
 }
 splashLocal(b,local,radius,damage,exclude){
  let hitAny=false;for(const m of b.modules){if(m===exclude||m.state!=='standing')continue;const d=m.box.distanceToPoint(local);if(d>radius)continue;const r=Math.max(.5,(1-d/radius)*(.6+damage/260));const p=new THREE.Vector3().copy(local).clamp(m.box.min,m.box.max);if(this.breach(b,p,r,p.clone().sub(local).normalize(),damage*(1-d/radius),true,m,false,true))hitAny=true;}
  if(hitAny){const p=this.toWorld(b,local);dustPuff(this.game.fx,p,new THREE.Vector3(0,.6,0),1.2,this.rand);this.settle(b,local.y);}
 }
 chip(b,entity,local,dir,damage){
  const cell=entity.cell||this.nearestCell(entity.m,local);if(this.chipFx<=0){this.chipFx=.06;const p=this.toWorld(b,local);dustPuff(this.game.fx,p,this.dirToWorld(b,dir).negate(),.35,this.rand);this.grit.burst(p,this.dirToWorld(b,dir).negate(),3,3,.05,undefined,this.rand);}
  if(!cell)return;cell.chip=(cell.chip||0)+damage;if(cell.chip>(cell.decor?14:70)){this.detach(b,cell,this.dirToWorld(b,dir).multiplyScalar(2));this.settle(b,local.y);}
 }
 nearestCell(m,p){let best=null,d=Infinity;for(const c of m?.cells||[]){if(!c.alive)continue;const dd=c.center.distanceToSquared(p);if(dd<d){d=dd;best=c;}}return best;}
 // Knocks out cells around a local point. Returns true when anything broke.
 breach(b,local,radius,dir,damage,he,hitModule,evaluate=true,splash=false){
  const g=this.game,list=[];
  for(const m of b.modules){if(m.state!=='standing'||m.box.distanceToPoint(local)>radius+.6)continue;for(const c of m.cells){if(!c.alive)continue;const d=c.center.distanceTo(local)-c.radius*.35;if(d<radius*(c.decor?1+c.anchor*.35:1))list.push({c,d});}}
  list.sort((a,c)=>a.d-c.d);
  // A direct hit always takes at least one chunk out of the struck module.
  if(hitModule&&!splash&&!list.some(x=>x.c.module===hitModule&&!x.c.decor)){const c=this.nearestCell(hitModule,local);if(c)list.unshift({c,d:0});}
  let broke=0;const wp=this.toWorld(b,local),wdir=this.dirToWorld(b,dir);
  for(const {c,d} of list){if(!c.alive)continue;if(d>radius*(.55+this.rand()*.45)&&broke>0&&!c.decor)continue;
   const out=c.center.clone().sub(local);out.y=Math.max(out.y,0);if(out.lengthSq()<1e-4)out.copy(dir);out.normalize();
   const push=he?out.multiplyScalar(3+this.rand()*6+damage/60):dir.clone().multiplyScalar(3+this.rand()*4+damage/90).addScaledVector(out,1.5+this.rand()*2);push.y+=1+this.rand()*2.5;
   this.detach(b,c,this.dirToWorld(b,push));broke++;}
  if(broke&&!splash){b.lean.set(local.x,local.z);if(b.lean.lengthSq()<.01)b.lean.set(dir.x,dir.z);b.lean.normalize();
   dustPuff(g.fx,wp,wdir.clone().negate(),Math.min(2.6,.9+broke*.18),this.rand);this.grit.burst(wp,wdir.clone().negate().add(new THREE.Vector3(0,.4,0)),Math.min(90,20+broke*8),he?7:5,.08,undefined,this.rand);
   const dist=wp.distanceTo(g.player?.root.position||wp);g.audio?.debris?.(Math.min(1,.3+broke*.08),dist);}
  if(broke)for(const m of new Set(list.map(x=>x.c.module)))this.dropIslands(b,m);
  if(broke&&evaluate)this.settle(b,local.y);
  return broke>0;
 }
 // Cells no longer connected (through touching neighbours) to an edge of their module
 // that rests on or hangs from other structure fall out instead of floating.
 dropIslands(b,m){
  if(m.state!=='standing'||!['wall','slab','parapet'].includes(m.kind))return;const cells=m.cells.filter(c=>c.alive&&!c.decor);if(cells.length<2)return;
  const boxes=new Map(cells.map(c=>{const box=new THREE.Box3();for(let i=0;i<c.hull.length;i+=3)box.expandByPoint(V().set(c.hull[i],c.hull[i+1],c.hull[i+2]));return [c,box];}));
  // Every cell spans the panel's thickness, so only the in-plane edges count as anchors.
  const e=.06,mb=m.box,size=mb.getSize(V()),thin=size.x<=size.y&&size.x<=size.z?'x':size.y<=size.z?'y':'z',touches=box=>['x','y','z'].some(a=>a!==thin&&(box.min[a]<mb.min[a]+e||box.max[a]>mb.max[a]-e));
  const reached=new Set(cells.filter(c=>touches(boxes.get(c)))),queue=[...reached];
  while(queue.length){const c=queue.pop(),box=boxes.get(c).clone().expandByScalar(e);for(const o of cells)if(!reached.has(o)&&box.intersectsBox(boxes.get(o))){reached.add(o);queue.push(o);}}
  for(const c of cells)if(!reached.has(c))this.detach(b,c,this.dirToWorld(b,new THREE.Vector3((this.rand()-.5)*2,-1,(this.rand()-.5)*2)));
 }
 // Integrity failures break a module apart; then the structure is re-checked.
 settle(b,originY=0){
  for(const m of b.modules){if(m.state==='standing'&&m.total>0&&this.integrity(m)<m.fail&&m.collapseAt===undefined){m.collapseAt=this.time+.02+this.rand()*.08;m.creak=0;}}
  this.evaluate(b,true,originY);
 }
 detach(b,c,worldVel){
  const g=this.game,m=c.module;if(!c.alive)return;c.alive=false;this.stats.detached++;
  if(c.group&&c.group.collider){this.removeCollider(c.group.collider);c.group.collider=null;c.group.fractured=true;for(const o of c.group.cells)if(o.alive&&o.solid&&!o.collider)this.cellCollider(b,m,o);}
  this.removeCollider(c.collider);c.collider=null;if(!c.decor)m.alive-=c.volume;
  const center=this.toWorld(b,c.center);
  if(c.glass)glassBurst(g.fx,center,worldVel.clone().normalize(),this.rand);
  if(c.explosive)this.explode(center);
  if(c.volume>.003&&(this.debris.length<MAX_DEBRIS||this.recycleDebris()))this.spawnDebris(b,[c],center,worldVel);
  else this.grit.burst(center,worldVel.clone().normalize(),8,4,.07,undefined,this.rand);
  hideCell(b.geos,c);
 }
 explode(p){const g=this.game;g.blast?.(p,1.5,'metal','fuel');for(const target of [...(g.tanks||[]),...(g.props||[])]){if(target.dead||target.destroyed||!target.body)continue;const d=V().copy(target.body.translation()).distanceTo(p);if(d<7)g.hurt?.(target,170*(1-d/7),null);}this.splash(p,6,200,null);}
 recycleDebris(){const i=this.debris.findIndex(d=>d.age>1.2);if(i<0)return false;this.bake(this.debris[i]);this.debris.splice(i,1);return true;}
 // Dynamic body for cells centred on `center` (building-local); pose defaults to where they stand.
 bodyFor(cells,center,vel,compound=false,worldPos=null,worldQuat=null){
  const g=this.game,b=cells[0].module.building,worldCenter=worldPos||this.toWorld(b,center),q=worldQuat||b.quat;
  const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(worldCenter.x,worldCenter.y,worldCenter.z).setRotation(q).setLinvel(vel.x,vel.y,vel.z).setAngvel({x:(this.rand()-.5)*4,y:(this.rand()-.5)*4,z:(this.rand()-.5)*4}).setLinearDamping(.05).setAngularDamping(.35));
  let mass=0;const add=hull=>{const pts=new Float32Array(hull.length);for(let i=0;i<hull.length;i+=3){pts[i]=hull[i]-center.x;pts[i+1]=hull[i+1]-center.y;pts[i+2]=hull[i+2]-center.z;}const desc=RAPIER.ColliderDesc.convexHull(compactHull(pts,compound?24:40));if(!desc)return;g.world.createCollider(desc.setDensity(1).setFriction(.85).setRestitution(.08).setCollisionGroups(DEBRIS_GROUPS),body);};
  // Compound chunks get one hull per cell; tall rigid groups (minaret) one per module.
  const solid=cells.filter(c=>c.solid),merge=list=>{const all=[];for(const c of list)for(const v of c.hull)all.push(v);add(new Float32Array(all));};
  if(compound&&solid.length>14){const byModule=new Map();for(const c of solid){if(!byModule.has(c.module))byModule.set(c.module,[]);byModule.get(c.module).push(c);}for(const list of byModule.values())merge(list);}
  else if(compound&&solid.length>1)for(const c of solid)add(c.hull);else merge(solid.length?solid:cells);
  for(const c of cells)mass+=c.volume;return {body,mass};
 }
 spawnDebris(b,cells,worldCenter,vel,worldQuat=b.quat){
  const center=cells[0].center.clone(),{geometry,materials}=extractCells(b.geos,cells,center,this.materials),mesh=new THREE.Mesh(geometry,materials);mesh.castShadow=cells[0].volume>.12;mesh.receiveShadow=true;
  const {body}=this.bodyFor(cells,center,vel,false,worldCenter,worldQuat);mesh.position.copy(worldCenter);mesh.quaternion.copy(worldQuat);this.game.root.add(mesh);
  const d={mesh,body,age:0,rest:0,volume:cells.reduce((s,c)=>s+c.volume,0),trail:cells[0].volume>.25?.1:Infinity};this.debris.push(d);return d;
 }
 // Turns a whole module (or a rigid group of modules) into falling chunks.
 collapse(b,mods){
  const g=this.game,cells=[];for(const m of mods){m.state='gone';this.stats.collapsed++;for(const grp of m.groups){this.removeCollider(grp.collider);grp.collider=null;}for(const c of m.cells){this.removeCollider(c.collider);c.collider=null;if(c.alive)cells.push(c);}}
  if(!cells.length)return;
  const lean=new THREE.Vector3(b.lean.x,0,b.lean.y),rigid=mods.length>1&&mods[0].rigid;let clusters;
  if(rigid)clusters=[cells];else{const box=mods[0].box,size=box.getSize(V()),axis=size.x>=size.y&&size.x>=size.z?'x':size.z>=size.y?'z':'y',sorted=[...cells].sort((a,c)=>a.center[axis]-c.center[axis]),k=Math.min(3,Math.max(1,Math.round(sorted.filter(c=>!c.decor).length/5)));clusters=Array.from({length:k},(_,i)=>sorted.slice(Math.floor(i*sorted.length/k),Math.floor((i+1)*sorted.length/k)));}
  for(const cluster of clusters){if(!cluster.length)continue;
   if(this.falling.length>=MAX_FALLING){for(const c of cluster){c.alive=false;hideCell(b.geos,c);}const wp=this.toWorld(b,cluster[0].center);dustPuff(g.fx,wp,new THREE.Vector3(0,-1,0),1.6,this.rand);this.grit.burst(wp,new THREE.Vector3(0,.2,0),30,4,.1,undefined,this.rand);continue;}
   const center=V();let vol=0;for(const c of cluster){center.addScaledVector(c.center,c.volume);vol+=c.volume;}center.divideScalar(vol);
   const {geometry,materials}=extractCells(b.geos,cluster,center,this.materials),mesh=new THREE.Mesh(geometry,materials);mesh.castShadow=true;mesh.receiveShadow=true;
   const height=Math.max(0,center.y),vel=lean.clone().multiplyScalar((.4+this.rand()*.8)*(.5+height*.08)).add(new THREE.Vector3((this.rand()-.5)*.8,-.3-this.rand()*.6,(this.rand()-.5)*.8));
   const {body}=this.bodyFor(cluster,center,this.dirToWorld(b,vel),true);
   // Tip the chunk away from the damage so walls topple and floors pancake with a lean.
   const axis=this.dirToWorld(b,new THREE.Vector3(lean.z,0,-lean.x)).multiplyScalar(rigid?.28:.4+this.rand()*1.1);if(rigid){const base=Math.min(...mods.map(m=>m.box.min.y)),arm=center.y-base;body.setLinvel(this.dirToWorld(b,lean.clone().multiplyScalar(arm*.28)),true);}body.setAngvel({x:axis.x+(this.rand()-.5)*.3,y:(this.rand()-.5)*.3,z:axis.z+(this.rand()-.5)*.3},true);
   mesh.position.copy(body.translation());mesh.quaternion.copy(b.quat);g.root.add(mesh);
   for(const c of cluster){c.alive=false;hideCell(b.geos,c);}
   this.falling.push({b,mesh,body,cells:cluster,age:0,speed:0,trail:0,rigid,volume:vol});}
  // Collapses in quick succession share one ground cloud and one rumble.
  const wp=this.toWorld(b,mods[0].box.getCenter(V()));b.pendingDust=(b.pendingDust||0)+cells.length;
  // Collapsed sections keep smouldering for a while.
  b.smolder=Math.min(45,(b.smolder||0)+2.5);b.smolderAt=(b.smolderAt||wp.clone()).lerp(wp,.35);
  if(this.time-(b.cloudAt??-Infinity)>.7){b.cloudAt=this.time;dustCloud(g.fx,wp.setY(Math.min(wp.y,this.toWorld(b,new THREE.Vector3(0,0,0)).y+2)),Math.max(2,mods[0].box.getSize(V()).length()*.5),Math.min(2,.5+b.pendingDust*.03),this.rand);g.audio?.collapse?.(Math.min(1,.35+b.pendingDust*.02),wp.distanceTo(g.player?.root.position||wp));b.pendingDust=0;}
  else dustPuff(g.fx,wp,new THREE.Vector3(0,-.4,0),1,this.rand);
  if(g.director?.navigation)g.director.navigation.refreshAt=-Infinity;if(g.infantry?.navigation)g.infantry.navigation.refreshAt=-Infinity;
  const standing=b.modules.filter(m=>m.state==='standing'&&m.total>0).length,total=b.modules.filter(m=>m.total>0).length;if(!b.collapsedNotice&&standing<total*.4){b.collapsedNotice=true;g.onEvent?.('toast',`${b.type.toUpperCase()} COLLAPSED`);}
  this.settle(b);
 }
 // Breaks a falling chunk into its cells when it slams into something.
 shatter(f){
  const g=this.game,b=f.b,p=V().copy(f.body.translation()),q=new THREE.Quaternion().copy(f.body.rotation()),vel=V().copy(f.body.linvel()),ang=V().copy(f.body.angvel());this.stats.shattered++;
  g.world.removeRigidBody(f.body);f.mesh.removeFromParent();
  const inv=b.quat.clone().invert(),rel=new THREE.Quaternion().multiplyQuaternions(q,inv),center=V();let vol=0;for(const c of f.cells){center.addScaledVector(c.center,c.volume);vol+=c.volume;}center.divideScalar(vol);
  const small=[];
  for(const c of f.cells){const offset=c.center.clone().sub(center).applyQuaternion(b.quat).applyQuaternion(rel),pos=p.clone().add(offset),v=vel.clone().add(V().crossVectors(ang,offset)).multiplyScalar(.45).add(new THREE.Vector3((this.rand()-.5)*3,1+this.rand()*2.5,(this.rand()-.5)*3));
   if(c.volume>.02&&(this.debris.length<MAX_DEBRIS||this.recycleDebris()))this.spawnDebris(b,[c],pos,v,rel.clone().multiply(b.quat));else small.push(c);}
  // Cells beyond the debris budget are baked in place as settled rubble.
  if(small.length){const {geometry,materials}=extractCells(b.geos,small,center,this.materials),mesh=new THREE.Mesh(geometry,materials);mesh.position.copy(p);mesh.quaternion.copy(q);this.rubble.add(mesh);geometry.dispose();}
  const ground=p.clone();dustPuff(g.fx,ground,new THREE.Vector3(0,.3,0),Math.min(3,1+f.volume*.35),this.rand);if(f.volume>3)dustCloud(g.fx,ground,2+Math.sqrt(f.volume),Math.min(1.6,f.volume*.12),this.rand);
  this.grit.burst(ground,new THREE.Vector3(0,.5,0),Math.min(120,25+f.cells.length*6),6,.1,undefined,this.rand);
  g.audio?.debris?.(Math.min(1,.4+f.volume*.08),p.distanceTo(g.player?.root.position||p));g.shake=Math.max(g.shake||0,Math.min(.5,f.volume*.05/(1+p.distanceTo(g.player?.root.position||p)*.05)));
 }
 bake(d){
  this.rubble.add(d.mesh);const g=this.game;
  if(d.volume>.35){const t=d.body.translation(),r=d.body.rotation();const colliders=[];for(let i=0;i<d.body.numColliders();i++)colliders.push(d.body.collider(i));const fixed=g.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(t.x,t.y,t.z).setRotation(r));for(const c of colliders){const shape=c.shape;const desc=new RAPIER.ColliderDesc(shape).setCollisionGroups(DEBRIS_GROUPS).setFriction(.9);g.world.createCollider(desc,fixed);}this.rubbleColliders.push(fixed);if(this.rubbleColliders.length>MAX_RUBBLE_COLLIDERS)g.world.removeRigidBody(this.rubbleColliders.shift());}
  g.world.removeRigidBody(d.body);d.mesh.removeFromParent();d.mesh.geometry.dispose();
 }
 // Tanks shove through walls: a fast heavy hull breaks the cells it presses on.
 ram(dt){
  const g=this.game;for(const t of g.tanks||[]){if(t.dead||!t.collider||Math.abs(t.speed||0)<2.2)continue;const energy=Math.abs(t.speed)*t.cfg.mass;if(energy<(t.jeep?8000:5200))continue;
   const hits=new Set();g.world.contactPairsWith(t.collider,other=>{const e=g.entities.get(other.handle);if(!e?.buildingPart||e.m.state!=='standing')return;let touching=false;g.world.contactPair(t.collider,other,manifold=>{for(let i=0;i<manifold.numContacts();i++)if(manifold.contactDist(i)<.08)touching=true;});if(touching)hits.add(e);});
   for(const e of hits){const m=e.m;if((m.rammed||0)>this.time)continue;m.rammed=this.time+.3;const p=V().copy(t.body.translation()),fwd=new THREE.Vector3(0,0,1).applyQuaternion(t.body.rotation()).multiplyScalar(Math.sign(t.speed));
    const local=this.local(e.b,p.clone().addScaledVector(fwd,1.9*(t.cfg.scale||1)).add(new THREE.Vector3(0,.6,0))).clamp(m.box.min,m.box.max);
    this.breach(e.b,local,.7+energy/22000,this.dirToLocal(e.b,fwd),energy/80,false,m);t.body.applyImpulse(fwd.multiplyScalar(-t.cfg.mass*.9),true);}}
 }
 update(dt){
  const g=this.game;this.time+=dt;this.chipFx-=dt;
  // Scheduled collapses: dust trickles while the structure sags, then it goes.
  for(const b of this.items){const due=[];for(const m of b.modules){if(m.state!=='standing'||m.collapseAt===undefined)continue;if(this.time>=m.collapseAt)due.push(m);else if((m.creak-=dt)<=0){m.creak=.12+this.rand()*.2;const p=this.toWorld(b,new THREE.Vector3(m.box.min.x+(m.box.max.x-m.box.min.x)*this.rand(),m.box.min.y,m.box.min.z+(m.box.max.z-m.box.min.z)*this.rand()));dustTrail(g.fx,p,.8,this.rand);this.grit.burst(p,new THREE.Vector3(0,-.5,0),3,1,.05,undefined,this.rand);}}
   if(!due.length)continue;const rigid=new Map(),single=[];for(const m of due){if(m.rigid){if(!rigid.has(m.rigid))rigid.set(m.rigid,[]);rigid.get(m.rigid).push(m);}else single.push(m);}
   // A rigid group (minaret, palm) falls as one piece together with everything above it.
   for(const [tag,list] of rigid){const all=b.modules.filter(m=>m.rigid===tag&&m.state==='standing'&&(list.includes(m)||m.box.min.y>=Math.min(...list.map(x=>x.box.min.y))));this.collapse(b,all);}
   for(const m of single)if(m.state==='standing')this.collapse(b,[m]);}
  this.ram(dt);
  for(const b of this.items){if(!(b.smolder>0))continue;b.smolder-=dt;if((b.smokeTimer=(b.smokeTimer||0)-dt)>0)continue;b.smokeTimer=.28+this.rand()*.3;const p=b.smolderAt.clone().add(new THREE.Vector3((this.rand()-.5)*5,0,(this.rand()-.5)*5));p.y=Math.max(p.y-2,b.group.position.y+.5);
   if(g.fx?.emit){g.fx.emit(p,new THREE.Vector3((this.rand()-.5)*.4,1.4+this.rand(),(this.rand()-.5)*.4),this.rand()<.5?0x4a423a:0x6b5f52,1.6+this.rand()*1.4,6+this.rand()*3,'smoke');const q=g.fx.particles.at(-1);q.density=.22*Math.min(1,b.smolder/10);q.plume=true;}}
  for(let i=this.falling.length-1;i>=0;i--){const f=this.falling[i];f.age+=dt;const v=f.body.linvel(),speed=Math.hypot(v.x,v.y,v.z);f.mesh.position.copy(f.body.translation());f.mesh.quaternion.copy(f.body.rotation());
   if((f.trail-=dt)<=0&&speed>2){f.trail=.09;dustTrail(g.fx,f.mesh.position,Math.min(2,.8+f.volume*.15),this.rand);}
   const impact=f.age>.12&&(f.speed-speed>(f.rigid?5:3.2)||(f.speed>2.5&&speed<.8));if(impact||f.age>(f.rigid?9:6)){this.shatter(f);this.falling.splice(i,1);continue;}f.speed=speed;}
  for(let i=this.debris.length-1;i>=0;i--){const d=this.debris[i];d.age+=dt;d.mesh.position.copy(d.body.translation());d.mesh.quaternion.copy(d.body.rotation());const v=d.body.linvel(),w=d.body.angvel(),speed=Math.hypot(v.x,v.y,v.z);
   if(d.trail!==Infinity&&(d.trail-=dt)<=0&&speed>3){d.trail=.12;dustTrail(g.fx,d.mesh.position,.6,this.rand);}
   d.rest=speed<.35&&Math.hypot(w.x,w.y,w.z)<.6?d.rest+dt:0;if(d.rest>.5||d.age>10||d.body.isSleeping()){this.bake(d);this.debris.splice(i,1);}}
  this.grit.update(dt);
 }
 // Opens a dithered see-through hole around the tank whenever a building stands
 // between it and the follow camera (or the tank drives inside one).
 updateCutaway(camera,target,dt){
  const u=CUTAWAY;if(!camera||!target){u.radius.value=0;return;}const eye=camera.position,focus=V().copy(target).add(new THREE.Vector3(0,1.2,0)),ray=this.cutRay??=new THREE.Ray(),hit=V(),box=this.cutBox??=new THREE.Box3();ray.origin.copy(eye);ray.direction.copy(focus).sub(eye).normalize();const reach=eye.distanceTo(focus);
  let blocked=false;if(this.occlusion!==false)for(const b of this.items){box.copy(b.bounds).expandByScalar(1.5);if(box.max.y>focus.y+1.5&&(box.containsPoint(focus)||!!ray.intersectBox(box,hit)&&hit.distanceTo(eye)<reach-1)){blocked=true;break;}}
  this.cutOpen=THREE.MathUtils.clamp((this.cutOpen||0)+(blocked?dt*4:-dt*3),0,1);
  const clip=focus.clone().project(camera);u.center.value.set(clip.x,clip.y);u.aspect.value=camera.aspect;u.depth.value=-focus.clone().applyMatrix4(camera.matrixWorldInverse).z;u.radius.value=.29*this.cutOpen*this.cutOpen*(3-2*this.cutOpen);
 }
 // Ground-floor footprints of standing modules, for route planning.
 navBlocks(fn){for(const b of this.items)for(const m of b.modules)if(m.state==='standing'&&m.world&&m.box.min.y<1.6&&m.box.max.y>.5&&m.kind!=='parapet')fn(m.world);}
 get standingModules(){let n=0;for(const b of this.items)for(const m of b.modules)if(m.state==='standing')n++;return n;}
 dispose(){this.grit.dispose();this.rubble.dispose();for(const d of this.debris)d.mesh.geometry.dispose();for(const f of this.falling)f.mesh.geometry.dispose();for(const b of this.items){for(const geo of b.geos.values())geo.dispose();b.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}CUTAWAY.radius.value=0;}
}
