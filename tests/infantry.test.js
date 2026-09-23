import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {animateInfantry} from '../src/infantry-animation.js';
import {Game} from '../src/game.js';
import {Infantry} from '../src/infantry.js';
import {makeMaterials} from '../src/models.js';
import {Ragdolls} from '../src/ragdolls.js';
import {Visibility} from '../src/visibility.js';
await RAPIER.init();
function setup(){const g=Object.create(Game.prototype);Object.assign(g,{time:0,world:new RAPIER.World({x:0,y:-18,z:0}),root:new THREE.Group(),materials:makeMaterials({sand:null,normal:null,height:null,armor:null,concrete:null,rock:null}),tanks:[],soldiers:[],props:[],entities:new Map(),nextId:1,rand:()=>.5,shells:[],fx:{smear(){g.smears++;},muzzle(){}},audio:{boom(){}},smears:0});g.world.createCollider(RAPIER.ColliderDesc.cuboid(150,.2,150).setTranslation(0,-.2,0));g.player=g.spawnTank('medium',0,0,false);g.ragdolls=new Ragdolls(g.world,g.root,g.fx);g.infantry=new Infantry(g);g.visibility=new Visibility(g);g.world.step();return g;}
test('running over a crowd safely evicts ragdolls during the same update',()=>{
 const g=setup();
 try{
  for(let i=0;i<g.ragdolls.max;i++){
   const s=g.infantry.spawn(-45+i*3,25);assert.ok(s);
   const p=s.body.translation();g.player.body.setTranslation(p,true);g.player.grounded=6;g.player.speed=10;g.infantry.sync();assert.equal(s.dead,true);
  }
  assert.equal(g.ragdolls.items.length,g.ragdolls.max);
  for(const item of g.ragdolls.items)item.age=.9;
  g.player.speed=0;
  for(let i=0;i<90;i++){g.world.step();g.ragdolls.update(1/60,g.player);assert.ok(g.ragdolls.items.length<=g.ragdolls.max);}
  assert.ok(g.smears>0);assert.ok(g.ragdolls.items.every(item=>item.parts.every(part=>part.body.isValid())));
 }finally{g.world.free();}
});
test('deployment populates 250 infantry in 25 roaming squads',()=>{const g=setup();g.infantry.deploy();assert.deepEqual(g.infantry.squads.map(s=>s.members.length),Array(25).fill(10));assert.equal(g.soldiers.length,250);assert.ok(g.soldiers.every(s=>s.crew.parts.length===11&&s.muzzlePoint));g.world.free();});
test('infantry fires low-damage physical machine-gun rounds',()=>{const g=setup(),s=g.infantry.spawn(0,15);g.fire(s,true);assert.equal(g.shells.length,1);assert.ok(g.shells[0].damage<1);assert.ok(g.shells[0].body.isDynamic());assert.ok(s.secondary>0);g.world.free();});
test('explosion launches jointed infantry ragdolls and cleans up live colliders',()=>{const g=setup(),s=g.infantry.spawn(0,15),p=new THREE.Vector3().copy(s.body.translation());g.infantry.blast(p.clone().add(new THREE.Vector3(1,0,0)),7,150);assert.ok(s.dead);assert.equal(g.entities.has(s.collider.handle),false);assert.equal(g.ragdolls.items.length,1);assert.equal(g.ragdolls.items[0].joints.length,10);assert.ok(g.ragdolls.items[0].parts[0].body.linvel().y>4);g.infantry.blast(p,7,150);assert.equal(g.ragdolls.items.length,1);g.world.free();});
test('running over standing infantry first ragdolls beneath the tank, then produces one smear',()=>{const g=setup(),s=g.infantry.spawn(0,15),p=s.body.translation();g.player.body.setTranslation({x:p.x,y:p.y,z:p.z},true);g.player.grounded=6;g.player.speed=5;g.infantry.sync();g.infantry.sync();assert.ok(s.dead);assert.equal(g.smears,0);assert.equal(g.entities.has(s.collider.handle),false);assert.equal(g.ragdolls.items.length,1);assert.equal(g.ragdolls.items[0].parts.length,11);for(let i=0;i<12;i++){g.world.step();g.ragdolls.update(1/60,g.player);}assert.equal(g.smears,0,'ragdoll must remain visible before crushing');g.player.speed=0;for(let i=0;i<60;i++){g.world.step();g.ragdolls.update(1/60,g.player);}assert.equal(g.smears,1);assert.ok(g.ragdolls.items.length>=6&&g.ragdolls.items.length<=8);assert.ok(g.ragdolls.items.every(r=>r.limb));for(let i=0;i<150;i++){g.world.step();g.ragdolls.update(1/60,null);}const limb=g.ragdolls.items[0],lp=limb.parts[0].body.translation();g.player.body.setTranslation({x:lp.x,y:lp.y+.8,z:lp.z},true);g.player.grounded=6;g.player.speed=4;g.ragdolls.update(1/60,g.player);assert.ok(!g.ragdolls.items.includes(limb));assert.ok(g.smears>=2);g.world.free();});
test('cover selection chooses reachable ground concealed from the last known threat',()=>{const g=setup(),s=g.infantry.spawn(7,18);s.ai.lastKnown.set(0,1,0);const mesh=new THREE.Mesh(new THREE.BoxGeometry(10,5,2)),body=g.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,2.5,12)),collider=g.world.createCollider(RAPIER.ColliderDesc.cuboid(5,2.5,1),body);g.props.push({mesh,body,collider});g.world.step();g.time=2;const cover=g.infantry.findCover(s);assert.ok(cover,'must find cover behind wall');assert.ok(g.infantry.blockedFrom(s.ai.lastKnown,cover.point,s));assert.ok(g.infantry.navigation.route(s.body.translation(),cover.point).length);g.world.free();});
test('roaming infantry walks under character-controller collision and gravity',()=>{const g=setup(),squad={members:[],goal:new THREE.Vector3(16,1,15),waypoint:1,phase:0},s=g.infantry.spawn(0,15,squad,0);g.infantry.squads.push(squad);const start=new THREE.Vector3().copy(s.body.translation());for(let i=0;i<240;i++){g.time+=1/60;g.infantry.update(1/60);g.world.step();g.infantry.sync();}assert.ok(new THREE.Vector3().copy(s.body.translation()).distanceTo(start)>3);assert.ok(s.body.translation().y>.65&&s.body.translation().y<1,'capsule stays grounded');g.world.free();});

test('infantry glancing rounds reflect from real tank armor normals and lose speed',()=>{const g=setup(),soldier=g.infantry.spawn(0,15);g.fire(soldier,true);const shell=g.shells[0],origin=new THREE.Vector3(-3,g.player.body.translation().y,-2.5),velocity=new THREE.Vector3(90,0,20);shell.previous.copy(origin);shell.incomingVelocity=velocity.clone();shell.body.setTranslation(origin,true);shell.body.setLinvel(velocity,true);g.world.step();const hit=g.player.collider.castRayAndGetNormal(new RAPIER.Ray(origin,velocity.clone().normalize()),10,true);assert.ok(hit);const point=origin.clone().addScaledVector(velocity.clone().normalize(),hit.timeOfImpact);g.impact(shell,g.player,point,hit.normal);assert.equal(shell.dead,false);assert.equal(shell.bounces,1);assert.ok(shell.body.linvel().z<0);assert.ok(new THREE.Vector3().copy(shell.body.linvel()).length()<velocity.length());assert.ok(g.player.hp>g.player.cfg.hp-.1);g.world.free();});
test('head-on infantry rounds terminate on armor instead of bouncing indefinitely',()=>{const g=setup(),soldier=g.infantry.spawn(0,15);g.fire(soldier,true);const shell=g.shells[0];shell.incomingVelocity=new THREE.Vector3(0,0,95);g.impact(shell,g.player,new THREE.Vector3(0,1,-1.8),new THREE.Vector3(0,0,-1));assert.ok(shell.dead);assert.equal(shell.bounces,0);g.world.free();});
test('soldier gait transitions from walking to running to idle with articulated knees',()=>{const g=setup(),s=g.infantry.spawn(0,15);s.speed=2.2;for(let i=0;i<60;i++)animateInfantry(s,1/60);assert.equal(s.locomotion,'walk');const thigh=s.crew.parts.find(p=>p.name==='thighL').mesh;assert.ok(Math.abs(thigh.rotation.x)>.05);s.speed=3.8;for(let i=0;i<60;i++)animateInfantry(s,1/60);assert.equal(s.locomotion,'run');assert.ok(s.crew.root.rotation.x>.07);s.speed=0;for(let i=0;i<60;i++)animateInfantry(s,1/60);assert.equal(s.locomotion,'idle');assert.ok(Math.abs(thigh.rotation.x)<.001);g.world.free();});

test('direct cannon hit dismembers infantry and launches parts along the incoming shell',()=>{const g=setup(),s=g.infantry.spawn(0,15);g.damage=0;g.blast=()=>{};const shell={dead:false,owner:g.player,damage:230,secondary:false,incomingVelocity:new THREE.Vector3(68,0,0),body:{linvel:()=>({x:68,y:0,z:0})},ammo:{radius:1.5}};g.impact(shell,s,new THREE.Vector3().copy(s.body.translation()));assert.ok(s.dead);assert.ok(shell.dead);assert.equal(g.smears,1);assert.ok(g.ragdolls.items.length>=6&&g.ragdolls.items.length<=8);assert.ok(g.ragdolls.items.every(r=>r.limb));for(const fragment of g.ragdolls.items)for(const part of fragment.parts){assert.ok(part.body.linvel().x>2);assert.ok(part.body.linvel().y>5);}g.world.free();});

test('repeated machine-gun hits emit blood and dismember on a lethal burst',()=>{const g=setup(),s=g.infantry.spawn(0,15);s.hp=30;let blood=0;g.fx.blood=()=>blood++;for(let i=0;i<3;i++){const shell={dead:false,secondary:true,damage:11,owner:g.player,incomingVelocity:new THREE.Vector3(0,0,10)};g.impact(shell,s,new THREE.Vector3(0,1,15));if(i<2)assert.equal(s.dead,false);}assert.equal(blood,3);assert.equal(s.bulletHits,3);assert.equal(s.dead,true);assert.ok(g.ragdolls.items.length>=6&&g.ragdolls.items.length<=8);assert.ok(g.ragdolls.items.every(r=>r.limb));g.world.free();});

test('unreachable infantry routes respect retry interval instead of searching every tick',()=>{const g=setup(),s=g.infantry.spawn(0,15);let routes=0;g.infantry.navigation.route=()=>{routes++;return [];};for(let i=0;i<60;i++){g.time+=1/60;g.infantry.update(1/60);}assert.ok(routes<=2,`unexpected repeated searches: ${routes}`);g.world.free();});

test('jeep machine-gun rounds share infantry ricochets and cannot physically impede a tank',()=>{const g=setup(),jeep=g.spawnTank('jeep',0,15,true);g.fire(jeep,false);const shell=g.shells[0];assert.ok(shell.collider.isSensor());const origin=new THREE.Vector3(-3,g.player.body.translation().y,-2.5),velocity=new THREE.Vector3(90,0,20);shell.previous.copy(origin);shell.incomingVelocity=velocity.clone();shell.body.setTranslation(origin,true);shell.body.setLinvel(velocity,true);g.world.step();const hit=g.player.collider.castRayAndGetNormal(new RAPIER.Ray(origin,velocity.clone().normalize()),10,true);g.player.body.setLinvel({x:0,y:0,z:8},true);const before={...g.player.body.linvel()};g.impact(shell,g.player,origin.clone().addScaledVector(velocity.clone().normalize(),hit.timeOfImpact),hit.normal);assert.equal(shell.bounces,1);assert.equal(shell.dead,false);assert.deepEqual({...g.player.body.linvel()},before);g.world.free();});

test('a stream of physical machine-gun sensor rounds leaves chassis motion unchanged',()=>{const a=setup(),b=setup();for(const g of [a,b]){g.shooter=g.spawnTank('jeep',0,15,true);g.player.body.setLinvel({x:0,y:0,z:8},true);}for(let i=0;i<30;i++){a.fire(a.shooter,false);const round=a.shells.at(-1),p=a.player.body.translation();round.body.setTranslation({x:p.x,y:p.y,z:p.z+2},true);round.body.setLinvel({x:0,y:0,z:-115},true);a.world.step();b.world.step();}assert.ok(new THREE.Vector3().copy(a.player.body.translation()).distanceTo(b.player.body.translation())<1e-4);assert.ok(new THREE.Vector3().copy(a.player.body.linvel()).distanceTo(b.player.body.linvel())<1e-4);a.world.free();b.world.free();});

test('running kinematic soldiers cannot push the tank chassis',()=>{const g=setup(),s=g.infantry.spawn(0,15);g.world.gravity={x:0,y:0,z:0};g.player.body.setTranslation({x:0,y:2,z:0},true);g.player.body.setLinvel({x:0,y:0,z:0},true);s.body.setTranslation({x:0,y:2,z:4},true);for(let i=0;i<90;i++){s.body.setNextKinematicTranslation({x:0,y:2,z:4-i*.09});g.world.step();}assert.ok(Math.abs(g.player.body.translation().z)<.001);assert.ok(Math.abs(g.player.body.linvel().z)<.001);g.world.free();});

test('RPG soldiers wait to aim, reset when sight is lost, and launch a physical explosive rocket',()=>{const g=setup(),s=g.infantry.spawn(0,15,null,0,'rpg');s.ai.state='pursue';s.ai.sees=true;s.ai.lastKnown.copy(s.body.translation()).add(new THREE.Vector3(0,0,30));s.ai.goal.copy(s.body.translation());s.yaw=0;for(let i=0;i<45;i++){g.time+=1/60;g.infantry.update(1/60);}assert.equal(g.shells.length,0);assert.ok(s.aimTime>.6);s.ai.sees=false;g.infantry.update(1/60);assert.equal(s.aimTime,0);s.ai.sees=true;for(let i=0;i<75;i++){g.time+=1/60;g.infantry.update(1/60);}assert.equal(g.shells.length,1);const r=g.shells[0];assert.ok(r.rocket&&!r.secondary&&r.body.isDynamic());assert.ok(r.damage>=90&&r.ammo.radius>3);assert.ok(s.secondary>4);g.world.free();});

test('specialists animate carry, shoulder aim and reload with visible equipment',()=>{const g=setup(),s=g.infantry.spawn(0,15,null,0,'rpg');for(let i=0;i<40;i++)animateInfantry(s,1/60);assert.equal(s.weaponPose,'carry');const carryY=s.gun.position.y;s.ai.sees=true;s.secondary=0;for(let i=0;i<80;i++)animateInfantry(s,1/60);assert.equal(s.weaponPose,'aim');assert.ok(s.gun.position.y>carryY+.3);assert.ok(s.gun.userData.round.visible);s.secondary=4;animateInfantry(s,1/60);assert.equal(s.weaponPose,'reload');assert.equal(s.gun.userData.round.visible,false);const f=g.infantry.spawn(10,15,null,0,'flame');assert.equal(f.gun.name,'Flamethrower');g.world.free();});
test('flamethrower damages a nearby target but solid cover blocks its stream',()=>{const g=setup(),s=g.infantry.spawn(0,8,null,0,'flame');s.body.setTranslation({x:0,y:.8,z:8},true);s.root.position.set(0,.8,8);s.root.rotation.y=Math.PI;s.gun.position.set(.1,.75,.1);g.player.body.setTranslation({x:0,y:1,z:0},true);g.world.step();let reach=0;g.fx.flameStream=(p,d,length)=>{reach=length;};const before=g.player.hp;g.infantry.flameAttack(s,.1);assert.ok(g.player.hp<before);assert.ok(reach<9);g.world.createCollider(RAPIER.ColliderDesc.cuboid(3,2,.2).setTranslation(0,1,4));g.world.step();const protectedHp=g.player.hp;s.flameEmission=0;g.infantry.flameAttack(s,.1);assert.equal(g.player.hp,protectedHp);assert.ok(reach<4);g.world.free();});

test('flamethrower death detonates once and launches dismembered parts upward',()=>{const g=setup(),s=g.infantry.spawn(15,15,null,0,'flame');let blasts=0;g.blast=(p,size,kind,variant)=>{blasts++;assert.equal(variant,'fuel');assert.ok(size>1);};g.infantry.kill(s);assert.equal(blasts,1);assert.ok(g.ragdolls.items.length>=6&&g.ragdolls.items.length<=8);assert.ok(g.ragdolls.items.every(r=>r.limb&&r.parts.every(p=>p.body.linvel().y>10)));g.infantry.kill(s);assert.equal(blasts,1);assert.equal(g.smears,1);g.world.free();});

test('partial track contact severs a leg and leaves a crawling survivor that can later be crushed',()=>{const g=setup(),s=g.infantry.spawn(0,15),p=s.body.translation();g.player.body.setTranslation({x:p.x-1.4,y:p.y,z:p.z},true);g.player.grounded=6;g.player.speed=5;g.infantry.sync();assert.ok(s.wounded&&!s.dead);assert.equal(s.woundType,'leg');assert.equal(s.crew.parts.length,9);assert.equal(s.locomotion,'crawl');g.infantry.sync();assert.equal(s.dead,false,'grace prevents same pass immediately killing edge-hit survivor');g.player.body.setTranslation({x:30,y:1,z:30},true);const start=new THREE.Vector3().copy(s.body.translation());for(let i=0;i<180;i++){g.infantry.update(1/60);g.world.step();g.infantry.sync();}assert.ok(!s.dead&&new THREE.Vector3().copy(s.body.translation()).distanceTo(start)>.3);assert.ok(g.smears>3);const now=s.body.translation();g.player.body.setTranslation({x:now.x,y:now.y+.6,z:now.z},true);g.infantry.sync();assert.ok(s.dead);g.world.free();});
test('lower-body separation leaves a brief crawl before expiring safely',()=>{const g=setup(),s=g.infantry.spawn(0,15);g.infantry.wound(s,'lower');assert.equal(s.crew.parts.length,6);assert.equal(g.ragdolls.items[0].parts.length,5);assert.ok(!s.dead);for(let i=0;i<180;i++){g.infantry.update(1/60);g.world.step();}assert.ok(!s.dead);for(let i=0;i<210;i++){g.infantry.update(1/60);g.world.step();g.ragdolls.update(1/60,null);}assert.ok(s.dead);assert.equal(g.entities.has(s.collider.handle),false);assert.ok(g.ragdolls.items.every(r=>r.parts.every(p=>Number.isFinite(p.body.translation().x))));g.world.free();});
test('successive dismemberments vary connected parts and scattering while retaining every body part',()=>{const g=setup(),patterns=new Set(),velocities=new Set();for(let i=0;i<8;i++){const s=g.infantry.spawn(20+i,15),start=g.ragdolls.items.length;g.infantry.kill(s,new THREE.Vector3(0,4,0),false,true);const fragments=g.ragdolls.items.filter(r=>r.age===0);patterns.add(g.ragdolls.lastPattern);for(const f of fragments){const v=f.parts[0].body.linvel();velocities.add(`${v.x.toFixed(2)},${v.z.toFixed(2)}`);}assert.ok(g.ragdolls.items.length<=g.ragdolls.max);while(g.ragdolls.items.length)g.ragdolls.remove(g.ragdolls.items[0]);}assert.ok(patterns.size>=3);assert.ok(velocities.size>20);g.world.free();});

test('hidden pose culling preserves weapon readiness and reconstructs the current gait',()=>{
 const g=setup();try{
  const visible=g.infantry.spawn(-10,15,null,0,'rpg'),hidden=g.infantry.spawn(10,15,null,0,'rpg');
  for(const s of [visible,hidden]){s.ai.sees=true;s.secondary=0;s.speed=3.8;}
  for(let i=0;i<100;i++){animateInfantry(visible,1/60);animateInfantry(hidden,1/60,false);}
  assert.equal(hidden.poseDirty,true);assert.equal(hidden.weaponRaise,visible.weaponRaise);assert.equal(hidden.weaponPose,visible.weaponPose);
  assert.equal(hidden.gait.phase,visible.gait.phase);
  g.infantry.pose(hidden);assert.equal(hidden.poseDirty,false);
  for(let i=0;i<visible.crew.parts.length;i++){
   const a=visible.crew.parts[i].mesh,b=hidden.crew.parts[i].mesh;
   assert.ok(a.position.distanceTo(b.position)<1e-10);
   assert.ok(a.quaternion.angleTo(b.quaternion)<1e-6);
  }
  assert.ok(visible.gun.position.distanceTo(hidden.gun.position)<1e-10);
 }finally{g.world.free();}
});

test('distant investigators defer cover searches until interaction detail is needed',()=>{
 const g=setup();try{
  const s=g.infantry.spawn(30,30);s.ai.engaged=true;s.ai.sees=false;s.ai.state='investigate';s.movementState={tier:2};
  g.infantry.decide(s,new THREE.Vector3().copy(s.body.translation()));assert.equal(g.infantry.coverJobs.has(s),false);
  s.movementState.tier=0;g.infantry.decide(s,new THREE.Vector3().copy(s.body.translation()));assert.equal(g.infantry.coverJobs.has(s),true);
  s.movementState.tier=2;g.infantry.plan();assert.equal(g.infantry.coverJobs.has(s),false);
 }finally{g.world.free();}
});

test('engaged decisions stagger at 20 Hz while movement and weapon timing stay at 60 Hz',()=>{
 const g=setup();try{
  const soldiers=[0,1,2].map(i=>g.infantry.spawn(i*5,40,null,i));
  for(const s of soldiers){s.ai.state='pursue';s.ai.sees=true;s.ai.engaged=true;s.ai.lastKnown.copy(s.body.translation()).add(new THREE.Vector3(0,0,20));s.yaw=0;}
  const decisions=new Map(),moves=new Map(),shots=[];
  g.infantry.decide=s=>{const ticks=decisions.get(s)||[];ticks.push(g.infantry.tick);decisions.set(s,ticks);return new THREE.Vector3();};
  const move=g.infantry.movement.move.bind(g.infantry.movement);
  g.infantry.movement.move=(s,...args)=>{moves.set(s,(moves.get(s)||0)+1);return move(s,...args);};
  g.fire=s=>{shots.push({s,tick:g.infantry.tick});s.secondary=.11;};
  g.infantry.update(1/60);g.world.step();decisions.clear();moves.clear();
  for(let i=0;i<120;i++){g.time+=1/60;g.infantry.update(1/60);g.world.step();}
  for(const s of soldiers){assert.equal(decisions.get(s).length,40);assert.equal(moves.get(s),120);}
  assert.equal(new Set(soldiers.map(s=>decisions.get(s)[0])).size,3,'soldiers use different decision phases');
  assert.ok(shots.some(({s,tick})=>!decisions.get(s).includes(tick)),'firing is not limited to decision ticks');
 }finally{g.world.free();}
});

test('engaged decision throttling wakes for sight, state, damage, destroyed cover and new hazards',()=>{
 for(const event of ['sight','state','damage','cover','hazard']){
  const g=setup();try{
   const s=g.infantry.spawn(0,40);s.ai.sees=true;s.ai.state='pursue';s.secondary=10;
   let decisions=0;g.infantry.decide=()=>{decisions++;return new THREE.Vector3();};
   g.infantry.update(1/60);g.world.step();assert.equal(decisions,1);
   if(event==='sight')s.ai.sees=false;
   if(event==='state')s.ai.state='investigate';
   if(event==='damage')g.hurt(s,.1,g.player);
   if(event==='cover')s.cover={prop:{destroyed:true}};
   if(event==='hazard'){const p=s.body.translation();g.shells=[{body:{translation:()=>({x:p.x+20,y:p.y,z:p.z}),linvel:()=>({x:-100,y:0,z:0})}}];}
   g.infantry.update(1/60);assert.equal(decisions,2,event+' must wake on unscheduled tick 2');
  }finally{g.world.free();}
 }
});

test('wounded soldiers choose independent crawl headings and phases rather than tracking the player',async()=>{
 const {seededRandom}=await import('../src/config.js'),g=setup();
 try{
  const soldiers=[g.infantry.spawn(-30,25),g.infantry.spawn(-34,25),g.infantry.spawn(-38,25)];g.rand=seededRandom(871);
  for(const s of soldiers)g.infantry.wound(s,'leg','L');
  assert.equal(new Set(soldiers.map(s=>s.crawlHeading)).size,3);assert.equal(new Set(soldiers.map(s=>s.crawlPhase)).size,3);assert.equal(new Set(soldiers.map(s=>s.crawlRate)).size,3);
  const headings=soldiers.map(s=>s.crawlHeading);g.player.body.setTranslation({x:80,y:1,z:-80},true);
  for(const s of soldiers){const phase=s.crawlPhase;g.infantry.updateWounded(s,1/60);assert.ok(Math.abs(s.crawlPhase-phase-s.crawlRate/60)<1e-8);assert.equal(s.root.rotation.x,0);assert.equal(s.root.rotation.z,0);}
  assert.deepEqual(soldiers.map(s=>s.crawlHeading),headings);
 }finally{g.visibility.dispose();g.world.free();}
});
