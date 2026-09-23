import * as THREE from 'three';
import {Navigation} from './navigation.js';
import {angleDelta,clamp,terrainHeight,MAP_HALF} from './config.js';
export function createPatrol(t){const p=new THREE.Vector3().copy(t.body.translation());return {state:'patrol',home:p.clone(),goal:p.clone(),lastKnown:p.clone(),waypoint:0,noticed:0,lost:0,engaged:false,radioAt:Infinity,radioSent:false,search:0};}
export class EnemyDirector {
 constructor(game){this.game=game;this.messages=[];this.transmissions=0;this.navigation=new Navigation(game);}
 update(dt){
  const g=this.game;
  for(let i=this.messages.length-1;i>=0;i--){const m=this.messages[i];m.delay-=dt;if(m.delay>0)continue;this.messages.splice(i,1);if(m.recipient.dead)continue;const a=m.recipient.ai;if(a.state!=='pursue'){a.state='investigate';a.lastKnown.copy(m.position);a.search=0;}}
  for(const t of [...g.tanks,...(g.soldiers||[])]){if(!t.enemy||t.dead)continue;const a=t.ai;
   t.aiDt=dt;t.steeringElapsed=(t.steeringElapsed||0)+dt;
   const sees=g.visibility.canSee(t,g.player);a.sees=sees;
   if(sees){a.lastKnown.copy(g.player.body.translation());a.lost=0;a.noticed+=dt;
    if(a.noticed>=.75){a.state='pursue';if(!a.engaged){a.engaged=true;a.radioAt=g.time+3;}}else if(a.state==='patrol')a.state='suspicious';
   }else {a.noticed=0;a.lost+=dt;if(a.state==='suspicious')a.state='patrol';if(a.state==='pursue')a.state='investigate';}
   if(a.engaged&&!a.radioSent&&g.time>=a.radioAt){a.radioSent=true;this.transmissions++;let delay=1.25;const position=new THREE.Vector3().copy(t.body.translation());const nearby=[...g.tanks,...(g.soldiers||[])].filter(other=>other.enemy&&!other.dead&&other!==t&&new THREE.Vector3().copy(other.body.translation()).distanceTo(position)<52).sort((u,v)=>new THREE.Vector3().copy(u.body.translation()).distanceTo(position)-new THREE.Vector3().copy(v.body.translation()).distanceTo(position));for(const recipient of nearby){this.messages.push({recipient,position:a.lastKnown.clone(),delay});delay+=2;}if(nearby.length)g.onEvent('toast','Enemy radio traffic · nearby patrols responding');}
   if(a.state==='investigate'){if(new THREE.Vector3().copy(t.body.translation()).distanceTo(a.lastKnown)<8||a.lost>18)a.search+=dt;if(a.search>6){a.state='patrol';a.engaged=false;a.radioSent=false;a.radioAt=Infinity;a.search=0;}}
  }
 }
 command(t){const g=this.game,a=t.ai,p=new THREE.Vector3().copy(t.body.translation());
  if(a.state==='patrol'&&(p.distanceTo(a.goal)<6||!a.waypoint||a.needsWaypoint)){a.needsWaypoint=false;a.waypoint++;const angle=t.aiPhase+a.waypoint*1.7;a.goal.set(clamp(a.home.x+Math.sin(angle)*36,-MAP_HALF+16,MAP_HALF-16),0,clamp(a.home.z+Math.cos(angle)*36,-MAP_HALF+16,MAP_HALF-16));a.goal.y=terrainHeight(a.goal.x,a.goal.z)+1;this.navigation.refresh();const free=this.navigation.freeNear(this.navigation.index(a.goal));if(free>=0)a.goal.copy(this.navigation.point(free));}
  const target=a.state==='patrol'?a.goal:a.lastKnown,delta=target.clone().sub(p);
  const tick=Math.round(g.time*60),phase=Math.floor(t.aiPhase*100)%3;
  const urgent=!t.steeringCommand||t.steeringState!==a.state||t.steeringSees!==a.sees||t.steeringDamage!==t.recentDamageUntil;
  if(urgent||((tick+phase)%3===0&&(!g.inFrame||g.frameTick===0))||t.steeringElapsed>=.1){
   t.steeringCommand=this.navigation.steer(t,target,t.steeringElapsed||t.aiDt||1/60,a.state==='patrol'?.55:.8);t.steeringElapsed=0;t.steeringState=a.state;t.steeringSees=a.sees;t.steeringDamage=t.recentDamageUntil;
  }
  const movement=t.steeringCommand;
  if(a.state==='patrol'&&!t.navigation.path.length&&t.navigation.recovery<=0)a.needsWaypoint=true;
  t.aimTarget.copy(target);if(a.sees){t.aimTarget.x+=Math.sin(g.time*.8+t.aiPhase)*2.5;t.aimTarget.z+=Math.cos(g.time*.63+t.aiPhase)*2;}
  return {...movement,aim:t.aimTarget,fire:a.state==='pursue'&&a.sees&&Math.abs(angleDelta(t.turretYaw,Math.atan2(delta.x,delta.z)))<.12,secondary:false};
 }
}
