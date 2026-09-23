import {MAP_SIZE,MAP_HALF,JUMP_RIDGES,seededRandom,inBuildingLot} from './config.js';

export function inJumpLane(x,z,padding=6){return JUMP_RIDGES.some((r,i)=>{const dx=x-r.x,dz=z-r.z,across=dx*Math.cos(r.yaw)-dz*Math.sin(r.yaw),along=dx*Math.sin(r.yaw)+dz*Math.cos(r.yaw);return (Math.abs(across)<r.width+padding||(i%3===0&&Math.abs(across-22)<4+padding))&&along>-r.run-30-padding&&along<r.drop+35+padding;});}

export const RUIN_SITES=[[-17,-13],[15,-29],[38,29],[-37,30],[1,52],[-58,-49],[59,-57]].map(([x,z])=>[x*2.3,z*2.3]).filter(([x,z])=>!inJumpLane(x,z,12));
for(const [x,z] of [[-220,-210],[-210,205],[210,-215],[215,200],[-225,0],[225,15],[0,-220],[0,225]])if(!inJumpLane(x,z,12))RUIN_SITES.push([x,z]);

// Deterministic spaced placements: the seed changes detail, not navigable lanes.
export const ROCK_SITES=[];
const random=seededRandom(6729);
for(let tries=0;tries<5000&&ROCK_SITES.length<100;tries++){
 const x=(random()-.5)*(MAP_SIZE-42),z=(random()-.5)*(MAP_SIZE-42);
 if(Math.hypot(x,z-19)<30||inJumpLane(x,z)||inBuildingLot(x,z,6)||RUIN_SITES.some(([rx,rz])=>Math.hypot(x-rx,z-rz)<23)||ROCK_SITES.some(([rx,rz])=>Math.hypot(x-rx,z-rz)<18))continue;
 ROCK_SITES.push([x,z]);
}

// Each of the 25 sectors gets jeep patrols and an infantry squad. Nearby deployment
// is excluded; individual spawners still check cover, occupancy and camera bounds.
export const PATROL_SITES=[];
for(let z=0;z<5;z++)for(let x=0;x<5;x++){
 let px=-MAP_HALF+54+x*(MAP_SIZE-108)/4,pz=-MAP_HALF+54+z*(MAP_SIZE-108)/4;
 if(x===2&&z===2){px=48;pz=48;}
 PATROL_SITES.push([px,pz]);
}
