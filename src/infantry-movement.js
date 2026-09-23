import RAPIER from '@dimforge/rapier3d-compat';

const CELL=16, HORIZON=.2, DOWN={x:0,y:-1,z:0};
// Conservative swept hazard cells, rebuilt once per physics tick. Full movement
// remains mandatory wherever a moving body or projectile could reach a soldier.
export class InfantryMovement {
 constructor(game){this.game=game;this.hazards=new Map();}
 prepare(){
  const g=this.game;this.hazards.clear();
  const add=(body,radius)=>{
   if(!body)return;const p=body.translation(),v=body.linvel();
   const x=p.x+v.x*HORIZON,z=p.z+v.z*HORIZON,hazard={x:p.x,z:p.z,dx:x-p.x,dz:z-p.z,radius};
   for(let iz=Math.floor((Math.min(p.z,z)-radius)/CELL);iz<=Math.floor((Math.max(p.z,z)+radius)/CELL);iz++)
    for(let ix=Math.floor((Math.min(p.x,x)-radius)/CELL);ix<=Math.floor((Math.max(p.x,x)+radius)/CELL);ix++){const key=ix+','+iz;let bucket=this.hazards.get(key);if(!bucket)this.hazards.set(key,bucket=[]);bucket.push(hazard);}
  };
  for(const t of g.tanks||[])add(t.body,t===g.player?16:7);
  for(const p of g.props||[])if(p.dynamic&&(!p.destroyed||p.crushed))add(p.body,6);
  for(const d of g.debris||[])add(d.body,3);
  for(const grenade of g.smokeGrenades?.items||[])add(grenade.body,3);
  for(const shell of g.shells||[])if(!shell.dead)add(shell.body,4);
 }
 physicalUrgent(s,p){
  if(s.wounded||(s.recentDamageUntil||0)>(this.game.time||0))return true;
  const bucket=this.hazards.get(Math.floor(p.x/CELL)+','+Math.floor(p.z/CELL));
  if(!bucket)return false;
  return bucket.some(h=>{const length=h.dx*h.dx+h.dz*h.dz,u=length?Math.max(0,Math.min(1,((p.x-h.x)*h.dx+(p.z-h.z)*h.dz)/length)):0;return (p.x-h.x-u*h.dx)**2+(p.z-h.z-u*h.dz)**2<h.radius*h.radius;});
 }
 urgent(s,p){return !!s.ai?.sees||this.physicalUrgent(s,p);}
 tier(s,p,dt){
  const physical=this.physicalUrgent(s,p);
  const wanted=s.ai?.sees||physical?0:(s.visibleToPlayer!==false||s.visibleToDrone||s.visibilityOpacity>.005)?1:2;
  const state=s.movementState??={tier:wanted,quiet:0,segment:null,grounded:false};
  state.collisionQuiet=physical?0:Math.min(.5,(state.collisionQuiet??.5)+dt);
  if(wanted<state.tier){state.tier=wanted;state.quiet=0;state.segment=null;}
  else if(wanted>state.tier){state.quiet+=dt;if(state.quiet>=.5){state.tier=wanted;state.quiet=0;state.segment=null;}}
  else state.quiet=0;
  return state.tier;
 }
 move(s,p,motion,dt,controller,nav){
  const state=s.movementState,g=this.game;
  const filter=c=>{const e=g.entities.get(c.handle);return !e?.projectile&&!e?.infantry&&(!g.player||e!==g.player);};
  state.retry=Math.max(0,(state.retry||0)-dt);
  // Seeing a target requires responsive combat, not repeated stair/slide solving
  // while standing still. Recheck real support every tick and periodically run
  // the full controller. Physical hazards and any steering wake it immediately.
  const safe=state.collisionQuiet>=.5;
  if(state.tier===0&&state.grounded&&motion.x===0&&motion.z===0&&safe){
   const hold=state.hold;
   if(hold&&hold.left>=dt-1e-6&&p.distanceToSquared(hold.position)<1e-8){
    const hit=g.world.castRayAndGetNormal(new RAPIER.Ray({x:p.x,y:p.y+.5,z:p.z},DOWN),1.6,true,undefined,undefined,s.collider,s.body,filter);
    if(hit&&hit.normal.y>=.94&&(!hit.collider.parent()||hit.collider.parent().isFixed())&&Math.abs(.5-hit.timeOfImpact+.4+.3/hit.normal.y+.025)<.01){
     hold.left-=dt;state.segment=null;s.body.setNextKinematicTranslation(p);s.speed=0;return;
    }
   }
  }
  const wasHolding=!!state.hold;state.hold=null;
  if(safe&&!wasHolding&&(state.tier!==0||motion.x!==0||motion.z!==0)&&state.grounded&&state.retry===0){
   let segment=state.segment;
   if(segment&&(segment.left<dt-1e-6||Math.hypot(motion.x-segment.motion.x,motion.z-segment.motion.z)>.01||p.distanceToSquared(segment.expected)>.0025))segment=null;
   if(!segment){segment=this.validate(s,p,motion,state.tier===2?HORIZON:.1,nav,filter);state.segment=segment;if(!segment)state.retry=.15;}
   if(segment){
    const next=p.clone().addScaledVector(segment.velocity,dt);s.body.setNextKinematicTranslation(next);
    segment.expected.copy(next);segment.left-=dt;s.speed=Math.hypot(segment.velocity.x,segment.velocity.z);return;
   }
  }
  state.segment=null;
  controller.computeColliderMovement(s.collider,{x:motion.x*dt,y:-9*dt,z:motion.z*dt},undefined,undefined,filter);
  const move=controller.computedMovement();s.body.setNextKinematicTranslation(p.clone().add(move));
  state.grounded=controller.computedGrounded();s.speed=Math.hypot(move.x,move.z)/dt;
  if(state.tier===0&&state.grounded&&motion.x===0&&motion.z===0&&safe)state.hold={position:p.clone().add(move),left:.1};
 }
 validate(s,p,motion,duration,nav,filter){
  const g=this.game,to=p.clone().addScaledVector(motion,duration);
  if(!nav||nav.blocked[nav.index(p)]||!nav.clearGrid(p,to))return null;
  const ground=(x,z)=>g.world.castRayAndGetNormal(new RAPIER.Ray({x,y:p.y+.5,z},DOWN),1.6,true,undefined,undefined,s.collider,s.body,filter);
  const hit=ground(to.x,to.z);
  if(!hit||hit.normal.y<.94||hit.collider.parent()&&!hit.collider.parent().isFixed())return null;
  // Capsule: .4 half-height + .3 radius, with slope support and a small gap.
  to.y=p.y+.5-hit.timeOfImpact+.4+.3/hit.normal.y+.025;
  const length=Math.hypot(to.x-p.x,to.z-p.z);
  if(Math.abs(to.y-p.y)>.06+length*.35)return null;
  const mid=ground((p.x+to.x)*.5,(p.z+to.z)*.5);
  if(!mid||mid.normal.y<.94||mid.collider.parent()&&!mid.collider.parent().isFixed())return null;
  const supported=p.y+.5-mid.timeOfImpact+.4+.3/mid.normal.y+.025;
  if(Math.abs((p.y+to.y)*.5-supported)>.04)return null;
  const delta=to.sub(p);
  // Validate the entire capsule corridor once; never interpolate around a
  // controller's final slide endpoint, which could cut through a corner.
  if(g.world.castShape(p,s.body.rotation(),delta,s.collider.shape,.005,1,true,undefined,undefined,s.collider,s.body,filter))return null;
  return {motion:{x:motion.x,z:motion.z},velocity:delta.divideScalar(duration),expected:p.clone(),left:duration};
 }
}
