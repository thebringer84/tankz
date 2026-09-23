import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Buildings} from '../src/buildings.js';
import {BUILDING_TYPES} from '../src/building-catalog.js';
import {fracturePolygon,rectPolygon,polygonArea} from '../src/building-geometry.js';
import {BUILDING_LOTS,terrainHeight,inBuildingLot,seededRandom} from '../src/config.js';
import {ROCK_SITES} from '../src/world-layout.js';
await RAPIER.init({});

function setup(types=null){
 const g={world:new RAPIER.World({x:0,y:-18,z:0}),root:new THREE.Group(),entities:new Map(),nextId:1,rand:seededRandom(5),textures:{},fx:null,tanks:[],props:[],blasts:[]};
 g.blast=(p,size)=>g.blasts.push({p:p.clone(),size});
 const sys=new Buildings(g);sys.deploy(types?BUILDING_LOTS.filter(l=>types.includes(l.type)):BUILDING_LOTS,!types);
 for(const b of sys.items)g.world.createCollider(RAPIER.ColliderDesc.cuboid(30,.5,30).setTranslation(b.lot.x,b.group.position.y-.5,b.lot.z));
 return {g,sys};
}
const run=(g,sys,steps)=>{for(let i=0;i<steps;i++){g.world.step();sys.update(1/60);}};
const shoot=(sys,b,local,dir=new THREE.Vector3(0,0,-1),he=true)=>{const m=b.modules.filter(x=>x.state==='standing').sort((a,c)=>a.box.distanceToPoint(local)-c.box.distanceToPoint(local))[0];sys.hit({b,m},local.clone().applyMatrix4(b.matrix),{damage:he?155:230,ammo:{radius:he?7.5:1.5},incomingVelocity:dir.clone().multiplyScalar(40).applyQuaternion(b.quat)});};

test('Voronoi fracture tiles a wall panel exactly and marks only fresh breaks as cuts',()=>{
 const rect=rectPolygon(0,0,3.8,2.9),cells=fracturePolygon(rect,1,seededRandom(2));
 assert.ok(cells.length>=8);assert.ok(Math.abs(cells.reduce((s,c)=>s+polygonArea(c),0)-3.8*2.9)<1e-6);
 for(const cell of cells)for(let i=0;i<cell.length;i++){const a=cell[i],b=cell[(i+1)%cell.length],onBoundary=[a,b].every(p=>Math.abs(p.x)<1e-6)||[a,b].every(p=>Math.abs(p.x-3.8)<1e-6)||[a,b].every(p=>Math.abs(p.y)<1e-6)||[a,b].every(p=>Math.abs(p.y-2.9)<1e-6);assert.equal(a.label,onBoundary?'edge':'cut');}
});

test('ten building types assemble from the kit, start stable and stay within budget',()=>{
 const {g,sys}=setup();assert.equal(Object.keys(BUILDING_TYPES).length,10);assert.equal(sys.items.filter(b=>BUILDING_TYPES[b.type]).length,10);
 let tris=0;
 for(const b of sys.items){
  for(const geo of b.geos.values())tris+=geo.attributes.position.count/3;
  const standing=b.modules.filter(m=>m.state==='standing');assert.ok(standing.length>=20,`${b.type} is modular`);
  assert.deepEqual(standing.filter(m=>!m.stable).map(m=>m.kind),[],`${b.type} starts stable`);
  assert.deepEqual(standing.filter(m=>!m.ground&&!m.supports.length).map(m=>m.kind),[],`${b.type} has no floating parts`);
  if(BUILDING_TYPES[b.type])assert.ok(new Set(standing.map(m=>m.kind)).size>=3,`${b.type} mixes component kinds`);
 }
 assert.ok(tris<140000,`district triangle budget (${tris})`);
 // Every building collider maps back to its module for damage routing.
 let mapped=0;g.world.forEachCollider(c=>{if(g.entities.get(c.handle)?.buildingPart)mapped++;});assert.ok(mapped>1500);
 g.world.free();
});

test('building lots are flat pads clear of rocks',()=>{
 for(const lot of BUILDING_LOTS){const c=Math.cos(lot.yaw),s=Math.sin(lot.yaw),h=terrainHeight(lot.x,lot.z);for(const [u,v] of [[-.9,-.9],[.9,.9],[-.9,.9],[.9,-.9]]){const lx=u*lot.hw,lz=v*lot.hd;assert.ok(Math.abs(terrainHeight(lot.x+lx*c+lz*s,lot.z-lx*s+lz*c)-h)<1e-9,lot.type);}}
 assert.equal(ROCK_SITES.filter(([x,z])=>inBuildingLot(x,z,4)).length,0);
});

test('a direct HE hit knocks out cells, fractures the intact collider and throws debris',()=>{
 const {g,sys}=setup(['market']);const b=sys.items[0],wall=b.modules.find(m=>m.kind==='wall'&&m.box.max.z>3.5&&m.box.min.y<.1);
 const before=wall.cells.filter(c=>c.alive).length,colliders=g.world.colliders.len();
 shoot(sys,b,new THREE.Vector3((wall.box.min.x+wall.box.max.x)/2,1.4,wall.box.max.z),new THREE.Vector3(0,0,-1));
 assert.ok(wall.cells.filter(c=>c.alive).length<before);assert.ok(sys.debris.length>0);assert.ok(sys.stats.detached>=3);
 assert.notEqual(g.world.colliders.len(),colliders);
 // Hidden cells no longer render: their triangles collapse to a point.
 const gone=wall.cells.find(c=>!c.alive&&!c.decor),r=gone.ranges[0],a=b.geos.get(r.mat).attributes.position.array;assert.equal(a[r.start*3],a[(r.start+r.count-1)*3]);
 run(g,sys,700);assert.equal(sys.debris.length,0,'debris settles into baked rubble');assert.ok(sys.rubble.vertexCount>0);
 g.world.free();
});

test('knocking out ground-floor bays brings down the storeys above',()=>{
 const {g,sys}=setup(['hotel']);const b=sys.items[0],start=sys.standingModules;
 for(let i=0;i<6;i++){shoot(sys,b,new THREE.Vector3(-4+i%3*4,1.3,6.1));run(g,sys,40);}
 run(g,sys,240);
 const upper=b.modules.filter(m=>m.kind==='wall'&&m.box.min.y>6&&m.box.max.z>5.5);
 assert.ok(upper.some(m=>m.state==='gone'),'front walls above the breach collapsed');assert.ok(start-sys.standingModules>10);assert.ok(sys.stats.collapsed>10&&sys.stats.shattered>0);
 g.world.free();
});

test('the minaret topples as a single rigid body and the petrol pumps explode',()=>{
 const {g,sys}=setup(['mosque','petrol']);const mosque=sys.items.find(b=>b.type==='mosque'),minaret=mosque.modules.filter(m=>m.rigid==='minaret');
 shoot(sys,mosque,new THREE.Vector3(10.5,2,5.7),new THREE.Vector3(-1,0,0));run(g,sys,12);
 assert.ok(minaret.every(m=>m.state==='gone'));assert.equal(sys.falling.filter(f=>f.rigid==='minaret').length,1);
 const petrol=sys.items.find(b=>b.type==='petrol'),pump=petrol.modules.flatMap(m=>m.cells).find(c=>c.explosive);
 shoot(sys,petrol,pump.center.clone());assert.ok(g.blasts.length>=1);
 g.world.free();
});

test('standing ground-floor modules block navigation until they fall',()=>{
 const {g,sys}=setup(['warehouse']);let count=0;sys.navBlocks(()=>count++);assert.ok(count>10);
 for(const m of sys.items[0].modules)if(m.state==='standing'&&m.box.min.y<1)sys.collapse(sys.items[0],[m]);
 let after=0;sys.navBlocks(()=>after++);assert.ok(after<count/2);g.world.free();
});

test('cells cut off from every supported edge of a wall drop out instead of floating',()=>{
 const {g,sys}=setup(['hotel']);const b=sys.items[0],boxOf=c=>{const o=new THREE.Box3();for(let i=0;i<c.hull.length;i+=3)o.expandByPoint(new THREE.Vector3(c.hull[i],c.hull[i+1],c.hull[i+2]));return o;};
 const interior=(m,c)=>{const mb=m.box,size=mb.getSize(new THREE.Vector3()),thin=size.x<=size.y&&size.x<=size.z?'x':size.y<=size.z?'y':'z',o=boxOf(c);return ['x','y','z'].every(a=>a===thin||(o.min[a]>mb.min[a]+.06&&o.max[a]<mb.max[a]-.06));};
 let wall,inner;for(const m of b.modules.filter(m=>m.kind==='slab')){inner=m.cells.find(c=>!c.decor&&interior(m,c));if(inner){wall=m;break;}}
 assert.ok(inner,'a slab tile has an interior cell');
 const near=boxOf(inner).expandByScalar(.07);for(const c of wall.cells)if(c!==inner&&!c.decor&&boxOf(c).intersectsBox(near))sys.detach(b,c,new THREE.Vector3());
 sys.dropIslands(b,wall);assert.equal(inner.alive,false);g.world.free();
});

test('a shattering chunk leaves its pieces where it landed',()=>{
 const {g,sys}=setup(['market']);const b=sys.items[0],wall=b.modules.find(m=>m.kind==='parapet');
 sys.collapse(b,[wall]);const f=sys.falling[0];f.body.setTranslation({x:f.body.translation().x+6,y:f.body.translation().y,z:f.body.translation().z},true);
 const at=new THREE.Vector3().copy(f.body.translation());sys.shatter(f);sys.falling.length=0;
 assert.ok(sys.debris.length>0);for(const d of sys.debris)assert.ok(new THREE.Vector3().copy(d.body.translation()).distanceTo(at)<4,'debris spawns at the chunk, not the original wall');
 g.world.free();
});

test('large settled chunks keep a fixed rubble collider that tanks ride over but shells ignore',()=>{
 const {g,sys}=setup(['hotel']);const b=sys.items[0],slab=b.modules.find(m=>m.kind==='slab'&&m.box.min.y>2.5&&m.box.min.y<3.5);
 const big=slab.cells.find(c=>c.volume>.35);assert.ok(big);sys.detach(b,big,new THREE.Vector3(0,-1,0));const d=sys.debris.at(-1);
 d.rest=1;run(g,sys,1);assert.ok(sys.rubbleColliders.length>=1);const collider=sys.rubbleColliders[0].collider(0);
 assert.equal(collider.collisionGroups(),0x0020fffd);
 // The minaret's rigid body has one hull per module so its whole height collides.
 const mosque=setup(['mosque']);const mb=mosque.sys.items[0];mosque.sys.collapse(mb,mb.modules.filter(m=>m.rigid==='minaret'));
 const body=mosque.sys.falling[0].body;assert.equal(body.numColliders(),mb.modules.filter(m=>m.rigid==='minaret').length);
 g.world.free();mosque.g.world.free();
});
