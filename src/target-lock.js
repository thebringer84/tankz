import {angleDelta} from './config.js';
export function turretAligned(t,target){
 const solution=t.aimAlignment;
 return !!target&&!target.dead&&target.visibleToPlayer!==false&&solution?.target===target&&solution.reachable&&
  Math.abs(angleDelta(t.localYaw,solution.yaw))<.012&&Math.abs(t.elevation-solution.elevation)<.01;
}
