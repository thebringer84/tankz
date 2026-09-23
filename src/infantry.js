import {skinCrew,restoreCrew} from './infantry-skin.js';
import {PATROL_SITES} from './world-layout.js';
import {equipSpecialist} from './infantry-weapons.js';
import {offCameraSpawn} from './spawning.js';
import * as THREE from 'three';
import {animateInfantry} from './infantry-animation.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {createCrew,box,cylinder,batchStaticMeshes} from './models.js';
import {createPatrol} from './ai.js';
import {Navigation} from './navigation.js';
import {InfantryMovement} from './infantry-movement.js';
import {InfantryDecisions} from './infantry-decisions.js';
import {InfantryRoutes} from './infantry-routes.js';
import {InfantryCrowd} from './infantry-crowd.js';
import {terrainHeight,ballisticElevation,approachAngle,MAP_SIZE,MAP_HALF,INFANTRY_COUNT,FRAG_GRENADE} from './config.js';
const vec=p=>new THREE.Vector3().copy(p);
const flatDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Infantry {
 constructor(game){this.game=game;this.crowd=new InfantryCrowd(game);this.decisions=new InfantryDecisions();this.movement=new InfantryMovement(game);this.navigation=new Navigation(game,.55);this.sharedRoutes=new InfantryRoutes(this.navigation);this.squads=[];this.coverJobs=new Map();this.routeJobs=new Map();this.neighbors=new Map();this.controller=game.world.createCharacterController(.025);this.controller.enableAutostep(.35,.25,false);this.controller.enableSnapToGround(.4);this.controller.setMaxSlopeClimbAngle(.65);}
 spawn(x,z,squad=null,index=0,weapon='mg'){const g=this.game,nav=this.navigation;nav.refresh();const cell=nav.freeNear(nav.index({x,z}));if(cell<0)return null;let position=nav.point(cell);if(!offCameraSpawn(g,position.x,position.z,2)){let found=null;for(let r=12;r<=MAP_SIZE&&!found;r+=12)for(let j=0;j<16;j++){const a=j*Math.PI/8,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;if(Math.abs(xx)>MAP_HALF-14||Math.abs(zz)>MAP_HALF-14)continue;const n=nav.freeNear(nav.index({x:xx,z:zz}));if(n<0)continue;const candidate=nav.point(n);if(offCameraSpawn(g,candidate.x,candidate.z,2)){found=candidate;break;}}if(!found)return null;position=found;}// Navigation can snap several requested positions to one free cell; reserve
  // separate capsule centers before creating their physical bodies.
  const occupied=p=>g.soldiers.some(other=>!other.dead&&flatDistance(p,other.body.translation())<.8);
  if(occupied(position)){let free=null;for(let ring=1;ring<=8&&!free;ring++)for(let dz=-ring;dz<=ring&&!free;dz++)for(let dx=-ring;dx<=ring;dx++){const cell=nav.index({x:position.x+dx*2,z:position.z+dz*2});if(nav.blocked[cell])continue;const candidate=nav.point(cell);if(!occupied(candidate)&&offCameraSpawn(g,candidate.x,candidate.z,2)){free=candidate;break;}}if(!free)return null;position=free;}
  position.y=terrainHeight(position.x,position.z)+.8;
  const root=new THREE.Group(),crew=createCrew(g.materials);crew.root.position.y=-.42;root.add(crew.root);
  const gun=new THREE.Group();gun.position.set(.1,.72,.18);crew.root.add(gun);box(gun,g.materials.dark,0,0,.13,.12,.13,.43);cylinder(gun,g.materials.steel,0,0,.51,.027,.4,'z');box(gun,g.materials.canvas,-.1,-.07,.08,.13,.2,.15);const muzzlePoint=new THREE.Object3D();muzzlePoint.position.z=.74;gun.add(muzzlePoint);
  if(weapon==='rpg'||weapon==='flame'||weapon==='grenadier')equipSpecialist(crew,gun,muzzlePoint,g.materials,weapon);
  batchStaticMeshes(gun);
  const backpack=box(crew.root,g.materials.canvas,0,.73,-.18,.3,.35,.16);crew.parts[0].mesh.attach(backpack);
  const body=g.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x,position.y,position.z));const collider=g.world.createCollider(RAPIER.ColliderDesc.capsule(.4,.3).setMass(70).setFriction(.7).setSolverGroups(0x0010fffd),body);
  const s={id:`soldier-${g.nextId++}`,infantry:true,weapon,aimTime:0,enemy:true,body,collider,root,crew,gun,muzzlePoint,hp:32,cfg:{hp:32,damage:weapon==='rpg'?1:.65,reload:.14,scale:1},dead:false,yaw:0,turretYaw:0,aiPhase:g.rand()*Math.PI*2,shots:0,secondary:0,reload:0,speed:0,squad,index,cover:null,coverTimer:0,path:[],replan:0,walk:0};s.ai=createPatrol(s);root.position.copy(position);g.root.add(root);skinCrew(crew,g.textures?.armor);g.soldiers.push(s);g.entities.set(collider.handle,s);if(squad)squad.members.push(s);return s;
 }
 deploy(){
  for(const [x,z] of PATROL_SITES){const squad={members:[],goal:new THREE.Vector3(x,0,z),phase:this.game.rand()*6,waypoint:0};this.squads.push(squad);
   for(let i=0;i<10&&this.game.soldiers.length<INFANTRY_COUNT;i++)this.spawn(x+(i%4-1.5)*2.5,z+Math.floor(i/4)*2.5,squad,i,i===9?'rpg':i===8?'flame':i===7?'grenadier':'mg');
  }
  // Placement can be rejected by the initial camera; retry other sectors while
  // preserving the requested population instead of silently spawning fewer.
  for(let attempt=0;this.game.soldiers.length<INFANTRY_COUNT&&attempt<INFANTRY_COUNT*4;attempt++){const squad=this.squads[attempt%this.squads.length],i=squad.members.length;this.spawn(squad.goal.x+(i%4-1.5)*3,squad.goal.z+Math.floor(i/4)*3,squad,i);}
 }

 blockedFrom(threat,point,s){const from=vec(threat).add(new THREE.Vector3(0,.8,0)),to=vec(point).add(new THREE.Vector3(0,.4,0)),delta=to.sub(from),length=delta.length();const hit=this.game.world.castRay(new RAPIER.Ray(from,delta.normalize()),length-.2,true,undefined,undefined,undefined,s.body,c=>{const e=this.game.entities.get(c.handle);return !e?.projectile&&!e?.infantry&&e!==this.game.player;});return !!hit;}
 findCover(s){const search=this.coverSearch(s);let result;do{result=search.next();}while(!result.done);return result.value;}
 *coverSearch(s){const g=this.game,p=s.body.translation(),threat=s.ai.lastKnown.clone(),nav=this.navigation;nav.refresh();let best=null,score=Infinity;
  const props=(g.props||[]).filter(o=>!o.destroyed&&!o.dynamic&&flatDistance(o.body.translation(),p)<24).sort((a,b)=>flatDistance(a.body.translation(),p)-flatDistance(b.body.translation(),p)).slice(0,14);
  for(const prop of props){const center=vec(prop.body.translation());if(!prop.mesh.geometry.boundingBox)prop.mesh.geometry.computeBoundingBox();const size=prop.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(prop.mesh.scale);if(size.y<1)continue;const away=center.clone().sub(threat);away.y=0;away.normalize();const side=new THREE.Vector3(away.z,0,-away.x),radius=Math.hypot(size.x,size.z)*.5;
   for(const sign of [-1,1]){yield; if(prop.destroyed)continue;const desired=center.clone().addScaledVector(away,radius+1.5).addScaledVector(side,sign*.8),cell=nav.freeNear(nav.index(desired));if(cell<0)continue;const point=nav.point(cell);point.y=terrainHeight(point.x,point.z)+.8;if(!this.blockedFrom(threat,point,s))continue;const cost=flatDistance(p,point)+g.soldiers.filter(other=>other!==s&&!other.dead&&other.cover&&flatDistance(other.cover.point,point)<2.5).length*8;if(cost>=score)continue;const route=nav.route(p,point);if(!route.length)continue;let peek=point.clone();for(const step of [2.5,4.5,7,10]){const candidate=point.clone().addScaledVector(side,sign*step),peekCell=nav.freeNear(nav.index(candidate));if(peekCell<0)continue;candidate.copy(nav.point(peekCell));if(!this.blockedFrom(threat,candidate,s)&&nav.route(point,candidate).length){peek=candidate;break;}}best={point,peek,prop};score=cost;}
  }return best;
 }
 // FIFO jobs keep a newly alerted horde from doing all its planning in one tick.
 // Existing paths, movement, perception and weapons continue while plans wait.
 beginFrame(){this.frameBudget={routes:4,routeRequests:32,cover:32,ms:2};this.decisions?.beginFrame();}
 endFrame(){this.frameBudget=null;this.decisions?.endFrame();}
 plan(){
  const budget=this.frameBudget||{routes:4,routeRequests:32,cover:32,ms:2};
  for(const [s,goal] of this.routeJobs){
   if(budget.routeRequests<=0||(!this.sharedRoutes&&budget.routes<=0))break;
   budget.routeRequests--;
   if(s.dead||s.wounded){this.routeJobs.delete(s);continue;}
   const searches=this.sharedRoutes?.searches||0;
   const path=this.sharedRoutes?this.sharedRoutes.route(s.body.translation(),goal,budget.routes>0):this.navigation.route(s.body.translation(),goal);
   if(path===null)continue;
   this.routeJobs.delete(s);s.path=path;s.replan=.8+s.index*.07;
   budget.routes-=this.sharedRoutes?this.sharedRoutes.searches-searches:1;
  }
  const start=performance.now(),deadline=start+budget.ms;
  while(budget.cover>0&&this.coverJobs.size&&performance.now()<deadline){
   budget.cover--;
   const [s,search]=this.coverJobs.entries().next().value;this.coverJobs.delete(s);
   if(s.dead||s.wounded||!s.ai.engaged||(s.movementState?.tier===2&&!s.ai.sees))continue;
   const result=search.next();
   if(result.done){s.cover=result.value?.prop.destroyed?null:result.value;s.coverTimer=3+s.index*.15;s.replan=0;}
   else this.coverJobs.set(s,search);
  }
  budget.ms=Math.max(0,budget.ms-(performance.now()-start));
 }
 rebuildNeighbors(){
  const free=this.neighborBuckets??=[];for(const bucket of this.neighbors.values()){bucket.length=0;free.push(bucket);}this.neighbors.clear();
  for(const s of this.game.soldiers){if(s.dead)continue;const p=s.body.translation(),x=Math.floor(p.x/1.1),z=Math.floor(p.z/1.1),key=(x+32768)*65536+z+32768;let bucket=this.neighbors.get(key);if(!bucket)this.neighbors.set(key,bucket=free.pop()||[]);const entry=s.neighborEntry??={s,x:0,z:0};entry.x=p.x;entry.z=p.z;bucket.push(entry);}
 }
 separate(s,p,motion){
  const x=Math.floor(p.x/1.1),z=Math.floor(p.z/1.1);let checked=0;
  // Nine cells, at most four entries each. Rotate samples over time instead of
  // always favouring the first occupants of a packed bucket.
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   const bucket=this.neighbors.get((x+dx+32768)*65536+z+dz+32768);if(!bucket)continue;
   const count=Math.min(4,bucket.length),start=((this.tick||0)+(s.index||0))%bucket.length;
   let fx=0,fz=0;
   for(let i=0;i<count;i++){
    const other=bucket[(start+i)%bucket.length];checked++;if(other.s===s)continue;
    let ox=p.x-other.x,oz=p.z-other.z,d2=ox*ox+oz*oz;
    if(d2===0){const sign=(s.id||'')<(other.s.id||'')?-1:1;ox=.01*sign;oz=0;d2=.0001;}
    if(d2<1.21){const d=Math.sqrt(d2),scale=(1.1-d)*2/d;fx+=ox*scale;fz+=oz*scale;}
   }
   // Approximate pressure from unsampled occupants, with a bounded magnitude.
   const density=Math.min(3,bucket.length/count);motion.x+=fx*density;motion.z+=fz*density;
  }
  const speed=Math.hypot(motion.x,motion.z);if(speed>5.5){motion.x*=5.5/speed;motion.z*=5.5/speed;}
  this.lastSeparationChecks=checked;
 }

 update(frameDt){const g=this.game,playerPosition=g.player?.body.translation();this.movement.prepare();this.rebuildNeighbors();this.tick=(this.tick||0)+1;
  for(const squad of this.squads){const alive=squad.members.filter(s=>!s.dead);if(!alive.length)continue;const leader=alive[0];if(!squad.waypoint||flatDistance(leader.body.translation(),squad.goal)<4){squad.waypoint++;const angle=squad.phase+squad.waypoint*1.8;const desired=leader.ai.home.clone().add(new THREE.Vector3(Math.sin(angle)*32,0,Math.cos(angle)*32));this.navigation.refresh();const cell=this.navigation.freeNear(this.navigation.index(desired));if(cell>=0)squad.goal.copy(this.navigation.point(cell));}}
  for(const [phase,s] of g.soldiers.entries()){if(s.dead)continue;
   const dt=frameDt;
   if(s.wounded)continue;const p=(s.updatePosition??=new THREE.Vector3()).copy(s.body.translation()),a=s.ai;
   const tier=this.movement.tier(s,p,dt);s.secondary=Math.max(0,s.secondary-dt);s.coverTimer-=dt;s.replan-=dt;
   s.decisionElapsed=(s.decisionElapsed||0)+dt;
   const interval=a.sees||tier===0?3:tier===1?6:12;
   const hazard=s.movementState.collisionQuiet===0,damage=s.recentDamageUntil||0;
   const changed=s.decisionState!==a.state||s.decisionSight!==!!a.sees||s.cover?.prop.destroyed||
    (hazard&&!s.decisionHazard)||(damage>g.time&&damage!==s.decisionDamage);
   const near=playerPosition&&flatDistance(p,playerPosition)<24;
   const urgent=(damage>g.time&&damage!==s.decisionDamage)||(hazard&&!s.decisionHazard)||s.cover?.prop.destroyed;
   if(!s.motion||changed||this.decisions.pending.has(s)||(this.tick+phase)%interval===0||s.decisionElapsed>=.2){
    this.decisions.request(s,urgent||(near&&changed)?0:near||(a.sees&&s.weapon!=='mg')?1:2);
   }
   // A destroyed cover point must never suppress firing while its replan waits.
   if(s.cover?.prop.destroyed){s.cover=null;s.takingCover=false;s.coverTimer=0;s.replan=0;}
  }
  this.decisions.run(s=>{
   const a=s.ai;s.motion=this.decide(s,s.updatePosition);s.decisionElapsed=0;
   s.decisionState=a.state;s.decisionSight=!!a.sees;s.decisionDamage=s.recentDamageUntil||0;
   s.decisionHazard=s.movementState.collisionQuiet===0;
  });
  for(const s of g.soldiers){if(s.dead)continue;
   const dt=frameDt;
   if(s.wounded){this.updateWounded(s,dt);continue;}
   const p=s.updatePosition,a=s.ai;
   const motion=s.motion??(s.motion=new THREE.Vector3());
   this.movement.move(s,p,motion,dt,this.controller,this.navigation);
   const aim=a.sees?a.lastKnown.clone().sub(p):motion;const desired=Math.atan2(aim.x,aim.z);if(aim.lengthSq()>.01)s.yaw=approachAngle(s.yaw,desired,5*dt);s.turretYaw=s.yaw;s.root.rotation.set(0,s.yaw,0);
   s.gun.rotation.x=a.sees?-ballisticElevation(Math.hypot(aim.x,aim.z),aim.y,s.weapon==='rpg'?48:95):0;
   if(s.weapon==='flame')s.gun.rotation.x=a.sees?-Math.atan2(aim.y,Math.hypot(aim.x,aim.z)):0;s.aimElevation=s.gun.rotation.x;
   animateInfantry(s,dt,!this.crowd.eligible(s)&&(s.visibleToPlayer!==false||s.visibilityOpacity>.005||a.sees));
   const ready=a.state==='pursue'&&a.sees&&s.secondary===0&&!s.takingCover&&Math.abs(Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw)))<.15;if(s.weapon==='grenadier'){const range=flatDistance(p,a.lastKnown);s.aimTime=ready&&range>=FRAG_GRENADE.minRange&&range<=FRAG_GRENADE.range?s.aimTime+dt:0;if(s.aimTime>=FRAG_GRENADE.windup)g.fire(s,false);}else if(s.weapon==='rpg'){s.aimTime=ready?s.aimTime+dt:0;if(s.aimTime>=1.15&&(s.weaponRaise||0)>.95){g.fire(s,false);s.aimTime=0;}}else if(s.weapon==='flame'){s.flameFiring=false;if(ready&&flatDistance(p,a.lastKnown)<11){s.aimTime+=dt;if(s.aimTime>.45&&(s.weaponRaise||0)>.9){s.flameFiring=true;this.flameAttack(s,dt);s.flameTime=(s.flameTime||0)+dt;if(s.flameTime>=2.2){s.secondary=2.6;s.flameTime=0;s.aimTime=0;}}}else{s.aimTime=0;s.flameTime=0;}}else if(ready&&(g.time+s.index*.27)%1.8<.65)g.fire(s,true);
  }
  this.plan();
 }
 decide(s,p){const g=this.game,a=s.ai;
   let goal=s.squad?s.squad.goal.clone().add(new THREE.Vector3((s.index%3-1)*1.8,0,Math.floor(s.index/3)*1.8)):a.goal.clone();
   if(a.engaged){if(s.coverTimer<=0||s.cover?.prop.destroyed){if(s.cover?.prop.destroyed)s.cover=null;if((s.movementState?.tier!==2||a.sees)&&!this.coverJobs.has(s))this.coverJobs.set(s,this.coverSearch(s));}if(s.cover){const peek=(g.time+s.index*.63)%4>(s.weapon==='rpg'?1.4:2.8);goal.copy(peek?s.cover.peek:s.cover.point);s.takingCover=!peek;}else {goal.copy(a.lastKnown);s.takingCover=false;}}
   else {s.takingCover=false;if(a.state==='investigate'||a.state==='suspicious')goal.copy(a.lastKnown);}
   if(s.weapon==='grenadier'&&a.sees){const distance=flatDistance(p,a.lastKnown);goal.copy(a.lastKnown);if(distance<FRAG_GRENADE.minRange+2){goal.copy(p).sub(a.lastKnown).setY(0).normalize().multiplyScalar(8).add(p);}else if(distance<=FRAG_GRENADE.range-2)goal.copy(p);s.takingCover=false;}
   if(s.weapon==='flame'&&a.sees){goal.copy(a.lastKnown);if(flatDistance(p,goal)<8)goal.copy(p);s.takingCover=false;}
   if(s.replan<=0){this.routeJobs.set(s,goal);}
   while(s.path.length&&flatDistance(p,s.path[0])<.65)s.path.shift();let waypoint=s.path[0];for(let i=1;i<Math.min(s.path.length,6);i++){if(!this.navigation.clearGrid(p,s.path[i]))break;waypoint=s.path[i];}
   const motion=waypoint?waypoint.clone().sub(p):new THREE.Vector3();motion.y=0;if(flatDistance(p,goal)<.7)motion.set(0,0,0);motion.normalize().multiplyScalar(a.engaged?3.8:2.2);
   // Local separation keeps squad members from piling into the same cover point.
   this.separate(s,p,motion);
   if((s.weapon==='grenadier'&&flatDistance(p,a.lastKnown)>=FRAG_GRENADE.minRange&&flatDistance(p,a.lastKnown)<=FRAG_GRENADE.range||s.weapon==='rpg'||(s.weapon==='flame'&&flatDistance(p,a.lastKnown)<9))&&a.sees&&!s.takingCover&&s.secondary===0)motion.set(0,0,0);
   return motion;
 }
 pose(s){s.root.position.copy(s.body.translation());animateInfantry(s,0);}
 wound(s,severity='leg',side='L'){
  if(s.dead||s.wounded)return;this.crowd.restore(s);this.pose(s);restoreCrew(s.crew);const g=this.game;g.visibility?.release?.(s);s.wounded=true;s.crawlHeading=g.rand()*Math.PI*2;s.crawlPhase=g.rand()*Math.PI*2;s.crawlRate=3.4+g.rand()*2.2;s.crawlPace=.75+g.rand()*.5;s.crawlTurnIn=1.5+g.rand()*2.5;s.woundGrace=.7;s.woundType=severity;s.woundLife=severity==='lower'?4+g.rand()*2:18+g.rand()*8;s.bleedTimer=0;s.hp=Math.min(s.hp,severity==='lower'?5:14);s.gun.visible=false;s.flameFiring=false;s.aimTime=0;s.cover=null;
  const names=severity==='lower'?['pelvis','thighL','shinL','thighR','shinR']:['thigh'+side,'shin'+side],parts=s.crew.parts.filter(p=>names.includes(p.name)),links=s.crew.links.filter(l=>names.includes(l[0])&&names.includes(l[1]));
  s.root.updateWorldMatrix(true,true);const detached=new THREE.Group();g.root.add(detached);for(const part of parts)detached.attach(part.mesh);const velocity=vec(g.player.body.linvel()).multiplyScalar(.12);velocity.y=1.5;
  const fragment=g.ragdolls.eject({root:detached,parts,links:links.map(([a,b,point])=>[a,b,s.crew.root.localToWorld(new THREE.Vector3(...point)).toArray()])},velocity);fragment.limb=true;fragment.bleedTimer=0;fragment.bleedDuration=.8;fragment.landed=false;detached.removeFromParent();
  s.crew.parts=s.crew.parts.filter(p=>!names.includes(p.name));s.crew.byName=null;s.crew.links=s.crew.links.filter(l=>!names.includes(l[0])&&!names.includes(l[1]));s.collider.setShape(new RAPIER.Cuboid(.24,.22,.65));const p=vec(s.body.translation());s.body.setTranslation({x:p.x,y:terrainHeight(p.x,p.z)+.30,z:p.z},true);s.root.position.copy(s.body.translation());g.fx.bloodBurst?.(p,velocity,1.2);animateInfantry(s,0);
 }
 updateWounded(s,dt){const g=this.game,p=vec(s.body.translation());s.woundLife-=dt;s.woundGrace=Math.max(0,s.woundGrace-dt);if(s.woundLife<=0){g.fx.bloodLanding?.(p,.6);this.kill(s,new THREE.Vector3(0,-.2,0));return;}
  // Keep a chosen heading between occasional gentle random turns. Every
  // casualty has its own cadence and phase, independent of the player's bearing.
  s.crawlTurnIn-=dt;if(s.crawlTurnIn<=0){s.crawlHeading+=(g.rand()-.5)*1.4;s.crawlTurnIn=1.5+g.rand()*2.5;}
  const desired=s.crawlHeading;s.yaw=approachAngle(s.yaw,desired,dt*1.5);s.root.rotation.set(0,s.yaw,0);const speed=(s.woundType==='lower'?.28:.6)*(s.crawlPace??1)*(.45+.55*Math.max(0,Math.sin(s.crawlPhase||0)));const motion={x:Math.sin(s.yaw)*speed*dt,y:-4*dt,z:Math.cos(s.yaw)*speed*dt};this.controller.computeColliderMovement(s.collider,motion,undefined,undefined,c=>!g.entities.get(c.handle)?.projectile&&g.entities.get(c.handle)!==g.player);const move=this.controller.computedMovement();s.body.setNextKinematicTranslation(p.clone().add(move));s.body.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),s.yaw));s.speed=Math.hypot(move.x,move.z)/dt;animateInfantry(s,dt);s.bleedTimer-=dt;if(s.bleedTimer<=0){s.bleedTimer=.25;g.fx.bloodTrail?.(p,new THREE.Vector3());g.fx.smear(p,s.yaw,s.woundType==='lower'?.22:.13);}
 }
 flameAttack(s,dt){const g=this.game,{p,dir}=g.muzzle(s),range=11;const hit=g.world.castRay(new RAPIER.Ray(p,dir),range,true,undefined,undefined,undefined,s.body,c=>!g.entities.get(c.handle)?.projectile);const length=hit?hit.timeOfImpact:range;if(hit){const target=g.entities.get(hit.collider.handle);if(target&&target!==s)g.hurt(target,22*dt,s);}s.flameEmission=(s.flameEmission||0)-dt;if(s.flameEmission<=0){s.flameEmission+=.04;if(s.visibleToPlayer!==false){const prior=g.fx.enemyFire;g.fx.enemyFire=true;try{g.fx.flameStream?.(p,dir,length);}finally{g.fx.enemyFire=prior;}}}}
 sync(){const g=this.game,tank=g.player;for(const s of g.soldiers){if(s.dead)continue;s.root.position.copy(s.body.translation());if(!tank||tank.dead||!tank.grounded||Math.abs(tank.speed)<.65)continue;const sp=s.body.translation(),tp=tank.body.translation(),radius2=(1.65**2+2.15**2+1.5**2)*tank.cfg.scale**2;if((sp.x-tp.x)**2+(sp.y-tp.y)**2+(sp.z-tp.z)**2>radius2)continue;const local=vec(sp).sub(tp).applyQuaternion(new THREE.Quaternion().copy(tank.body.rotation()).invert());if(Math.abs(local.x)<1.65*tank.cfg.scale&&Math.abs(local.z)<2.15*tank.cfg.scale&&Math.abs(local.y)<1.5*tank.cfg.scale){if(s.wounded&&s.woundGrace>0)continue;if(!s.wounded&&s.weapon!=='flame'&&Math.abs(local.x)>1.05*tank.cfg.scale)this.wound(s,Math.abs(tank.speed)>8&&g.rand()<.35?'lower':'leg',local.x>0?'L':'R');else this.kill(s,new THREE.Vector3(),true);}}}
 kill(s,impulse=new THREE.Vector3(0,2,0),crushed=false,dismember=false){if(s.dead)return;this.crowd.restore(s);this.pose(s);s.dead=true;const g=this.game;g.visibility?.release?.(s);const detonate=s.weapon==='flame',center=vec(s.body.translation());g.entities.delete(s.collider.handle);g.world.removeRigidBody(s.body);restoreCrew(s.crew);s.root.updateWorldMatrix(true,true);s.crew.parts.find(part=>part.name==='forearmR').mesh.attach(s.gun);
  const runOver=crushed?{yaw:g.player.yaw,scale:g.player.cfg.scale}:null;
  if(crushed){impulse=vec(g.player.body.linvel()).multiplyScalar(.2);impulse.y=-3;}
  if(detonate){impulse=impulse.clone().multiplyScalar(.3);impulse.y=10;dismember=true;}
  const ragdoll=g.ragdolls.eject(s.crew,impulse,detonate?null:runOver);if(dismember)g.ragdolls.dismember(ragdoll,s.yaw,.85,impulse);s.root.removeFromParent();g.infantryKills=(g.infantryKills||0)+1;
  if(detonate){g.fx.blood?.(center,new THREE.Vector3(0,1,0),2.2);g.blast(center,1.45,'metal','fuel');for(const target of [...g.tanks,...g.props]){if(target.dead||target.destroyed)continue;const distance=vec(target.body.translation()).distanceTo(center);if(distance<5.5)g.hurt(target,75*(1-distance/5.5),s);}}
 }

 blast(point,radius,power){for(const s of this.game.soldiers){if(s.dead)continue;const direction=vec(s.body.translation()).sub(point),distance=direction.length();if(distance>=radius)continue;const strength=1-distance/radius;s.hp-=power*strength;s.recentDamageUntil=(this.game.time||0)+1;if(s.hp<=0)this.kill(s,direction.normalize().multiplyScalar(4+strength*8).add(new THREE.Vector3(0,4+strength*5,0)));else{s.ai.engaged=true;s.ai.state='investigate';s.ai.lastKnown.copy(point);s.coverTimer=0;}}}
}
