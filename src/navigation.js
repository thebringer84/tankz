import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {angleDelta,clamp,terrainHeight,MAP_HALF} from './config.js';
export const NAV_CELL=2,NAV_SIZE=Math.floor((MAP_HALF-9)*2/NAV_CELL);
const CELL=NAV_CELL,SIZE=NAV_SIZE,HALF=SIZE*CELL/2;
let terrainBlocked;
function staticTerrain(){if(terrainBlocked)return terrainBlocked;terrainBlocked=new Uint8Array(SIZE*SIZE);for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){const wx=(x+.5)*CELL-HALF,wz=(z+.5)*CELL-HALF;const slope=Math.hypot(terrainHeight(wx+1,wz)-terrainHeight(wx-1,wz),terrainHeight(wx,wz+1)-terrainHeight(wx,wz-1))/2;if(slope>.65||x===0||z===0||x===SIZE-1||z===SIZE-1)terrainBlocked[z*SIZE+x]=1;}return terrainBlocked;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Navigation {
 constructor(game,clearance=1.65){this.game=game;this.margin=clearance;this.terrainBlocked=staticTerrain();this.blocked=new Uint8Array(SIZE*SIZE);this.refreshAt=-Infinity;this.cost=new Float64Array(SIZE*SIZE);this.parent=new Int32Array(SIZE*SIZE);this.closed=new Uint8Array(SIZE*SIZE);this.heap=new Int32Array(SIZE*SIZE);this.heapIndex=new Int32Array(SIZE*SIZE);this.priority=new Float64Array(SIZE*SIZE);}
 index(p){return clamp(Math.floor((p.z+HALF)/CELL),0,SIZE-1)*SIZE+clamp(Math.floor((p.x+HALF)/CELL),0,SIZE-1);}
 point(i){const x=(i%SIZE+.5)*CELL-HALF,z=(Math.floor(i/SIZE)+.5)*CELL-HALF;return new THREE.Vector3(x,terrainHeight(x,z)+1,z);}
 refresh(){const g=this.game;if(g.time<this.refreshAt)return;this.refreshAt=g.time+1;this.revision=(this.revision||0)+1;this.blocked.set(this.terrainBlocked);
  // Inflate obstacle footprints by the jeep's half-width plus turning clearance.
  for(const prop of g.props||[]){if(prop.destroyed)continue;const mesh=prop.mesh;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const matrix=new THREE.Matrix4().compose(new THREE.Vector3().copy(prop.body.translation()),new THREE.Quaternion().copy(prop.body.rotation()),mesh.scale);const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix).expandByScalar(this.margin);const x0=clamp(Math.floor((box.min.x+HALF)/CELL),0,SIZE-1),x1=clamp(Math.floor((box.max.x+HALF)/CELL),0,SIZE-1),z0=clamp(Math.floor((box.min.z+HALF)/CELL),0,SIZE-1),z1=clamp(Math.floor((box.max.z+HALF)/CELL),0,SIZE-1);for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)this.blocked[z*SIZE+x]=1;}
  // Standing ground-floor building modules block routes until they are knocked down.
  g.buildings?.navBlocks(box=>{const x0=clamp(Math.floor((box.min.x-this.margin+HALF)/CELL),0,SIZE-1),x1=clamp(Math.floor((box.max.x+this.margin+HALF)/CELL),0,SIZE-1),z0=clamp(Math.floor((box.min.z-this.margin+HALF)/CELL),0,SIZE-1),z1=clamp(Math.floor((box.max.z+this.margin+HALF)/CELL),0,SIZE-1);for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)this.blocked[z*SIZE+x]=1;});

 }
 freeNear(i){if(!this.blocked[i])return i;const x=i%SIZE,z=Math.floor(i/SIZE);for(let r=1;r<14;r++){let best=-1,score=Infinity;for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const nx=x+dx,nz=z+dz;if(nx<1||nz<1||nx>=SIZE-1||nz>=SIZE-1)continue;const next=nz*SIZE+nx,d=dx*dx+dz*dz;if(!this.blocked[next]&&d<score){score=d;best=next;}}if(best>=0)return best;}return -1;}
 route(from,to){this.refresh();const start=this.freeNear(this.index(from)),goal=this.freeNear(this.index(to));if(start<0||goal<0)return [];
  // Reuse search storage and decrease keys in an indexed heap. Linear open-list
  // scans made a single obstructed route take an entire frame on the CPU.
  const cost=this.cost,parent=this.parent,closed=this.closed,heap=this.heap,indices=this.heapIndex,priority=this.priority;
  cost.fill(Infinity);parent.fill(-1);closed.fill(0);indices.fill(-1);let count=0;
  const gx=goal%SIZE,gz=Math.floor(goal/SIZE);
  const heuristic=i=>{const dx=Math.abs(i%SIZE-gx),dz=Math.abs(Math.floor(i/SIZE)-gz);return Math.max(dx,dz)+(Math.SQRT2-1)*Math.min(dx,dz);};
  const up=i=>{const cell=heap[i];while(i>0){const p=(i-1)>>1;if(priority[heap[p]]<=priority[cell])break;heap[i]=heap[p];indices[heap[i]]=i;i=p;}heap[i]=cell;indices[cell]=i;};
  cost[start]=0;priority[start]=heuristic(start);heap[count++]=start;indices[start]=0;
  while(count){const current=heap[0],last=heap[--count];indices[current]=-1;
   if(count){let i=0;while(i*2+1<count){let child=i*2+1;if(child+1<count&&priority[heap[child+1]]<priority[heap[child]])child++;if(priority[last]<=priority[heap[child]])break;heap[i]=heap[child];indices[heap[i]]=i;i=child;}heap[i]=last;indices[last]=i;}
   if(current===goal){const path=[];for(let i=goal;i!==start;i=parent[i])path.push(this.point(i));path.push(this.point(start));return path.reverse();}closed[current]=1;const x=current%SIZE,z=Math.floor(current/SIZE);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=SIZE||nz>=SIZE)continue;const next=nz*SIZE+nx;if(closed[next]||this.blocked[next]||(dx&&dz&&(this.blocked[z*SIZE+nx]||this.blocked[nz*SIZE+x])))continue;const value=cost[current]+(dx&&dz?Math.SQRT2:1);if(value<cost[next]){cost[next]=value;parent[next]=current;priority[next]=value+heuristic(next);let i=indices[next];if(i<0){i=count++;heap[i]=next;}up(i);}}
  }return [];
 }
 clearGrid(from,to){const d=distance(from,to),steps=Math.max(1,Math.ceil(d/.8));for(let i=1;i<=steps;i++){const u=i/steps;if(this.blocked[this.index({x:from.x+(to.x-from.x)*u,z:from.z+(to.z-from.z)*u})])return false;}return true;}
 clearance(t,heading,length){const g=this.game,p=t.body.translation(),dir=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));let free=length;for(const offset of [-1.15,0,1.15]){const origin={x:p.x+Math.cos(heading)*offset,y:p.y+.1,z:p.z-Math.sin(heading)*offset};const hit=g.world.castRay(new RAPIER.Ray(origin,dir),length,true,undefined,undefined,undefined,t.body,c=>!g.entities.get(c.handle)?.projectile);if(hit)free=Math.min(free,hit.timeOfImpact);}return free;}
 steer(t,target,dt,cruise){const g=this.game,p=t.body.translation();const n=t.navigation??={path:[],replan:0,goal:new THREE.Vector3(Infinity,0,Infinity),checkpoint:new THREE.Vector3().copy(p),elapsed:0,blockedTime:0,recovery:0,side:1,attempt:0};
  n.elapsed+=dt;if(n.elapsed>=.8){if(cruise>0&&distance(p,target)>5&&distance(p,n.checkpoint)<.65)n.blockedTime+=n.elapsed;else n.blockedTime=0;n.checkpoint.copy(p);n.elapsed=0;}
  if(n.recovery<=0&&n.blockedTime>1.5){n.recovery=2.3;n.blockedTime=0;n.side=this.clearance(t,t.yaw+.9,7)>=this.clearance(t,t.yaw-.9,7)?1:-1;if(n.attempt++%2)n.side*=-1;n.replan=0;n.path=[];}
  if(n.recovery>0){n.recovery-=dt;const reversing=n.recovery>.9;return {throttle:reversing&&this.clearance(t,t.yaw+Math.PI,4)>2?-.65:0,steer:n.side*.85,brake:false};}
  n.replan-=dt;if(n.replan<=0||distance(target,n.goal)>6){n.path=this.route(p,target);n.goal.copy(target);n.replan=1.4+Math.abs(t.aiPhase||0)%.35;}
  while(n.path.length>1&&distance(p,n.path[0])<2.5)n.path.shift();
  let waypoint=n.path[0];for(let i=1;i<Math.min(n.path.length,12);i++){if(!this.clearGrid(p,n.path[i]))break;waypoint=n.path[i];}
  if(!waypoint)return {throttle:0,steer:0,brake:true};
  const desired=Math.atan2(waypoint.x-p.x,waypoint.z-p.z),look=5+Math.abs(t.speed||0)*.55;let heading=desired,best=-Infinity,space=0;
  for(const offset of [0,.4,-.4,.8,-.8,1.2,-1.2]){const candidate=desired+offset,clear=this.clearance(t,candidate,look);const score=clear-Math.abs(offset)*2-Math.abs(angleDelta(t.yaw,candidate))*.65;if(score>best){best=score;heading=candidate;space=clear;}}
  const turn=angleDelta(t.yaw,heading),front=this.clearance(t,t.yaw,look);let throttle=cruise*clamp((front-1.8)/4,0,1)*clamp(1-Math.abs(turn)/1.5,0,1);if(space<2)throttle=0;
  if(distance(p,target)<4)throttle=0;
  return {throttle,steer:clamp(turn*1.8,-1,1),brake:Math.abs(t.speed||0)>2&&throttle<.1};
 }
}
