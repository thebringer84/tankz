export const FIXED_DT = 1 / 60;
export const GRAVITY = -18;
// 500% more area: six original battlefields, preserving vehicle/world scale.
export const MAP_SIZE = 220 * Math.sqrt(6);
export const MAP_HALF = MAP_SIZE / 2;
export const TERRAIN_SEGMENTS = 432;
export const INFANTRY_COUNT = 500;
export const JEEP_COUNT = 15;
export const MATCH_DURATION = 900;
export const JUMP_RIDGES = [];
for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
 if(row===0&&col===0)continue;
 JUMP_RIDGES.push({x:col*92+(row%2)*13,z:row*92+(col%2)*11,yaw:(row+col)*.7,width:11,run:18,drop:5,height:3.8+((row-col+4)%3)*.45});
}
export const TANKS = {
  scout: { name:'KESTREL', role:'LIGHT RECON', number:'06', hp:650, mass:1000, speed:23, power:15500, traverse:2.8, elevation:1.1, reload:1.05, damage:0.7, scale:0.86, color:0x92916a, desc:'Fast feet. Faster reactions. Circle the heavy armor and make every shot count.', stats:[96,42,95,45] },
  medium:{ name:'VANGUARD', role:'MAIN BATTLE TANK', number:'23', hp:1000, mass:1550, speed:18, power:20500, traverse:1.6, elevation:0.65, reload:1.65, damage:1, scale:1, color:0x858976, desc:'A dependable balance of mobility, firepower and protection. Built for the thick of it.', stats:[73,72,72,72] },
  heavy:{ name:'MARAUDER', role:'HEAVY ASSAULT', number:'07', hp:1550, mass:2400, speed:13, power:24000, traverse:0.8, elevation:0.36, reload:2.45, damage:1.5, scale:1.16, hull:[1.66,2.4], color:0x747e6c, desc:'Thick armor. A very large gun. Hold your ground and make the battlefield come to you.', stats:[45,98,40,98] }
};
export const AMMO = {
  ap:{name:'AP', label:'ARMOR PIERCING', speed:68, damage:230, radius:1.5, price:0, pack:0, color:0xffe4a0, desc:'High velocity. Concentrated damage. Unlimited standard rounds.'},
  he:{name:'HE', label:'HIGH EXPLOSIVE', speed:47, damage:155, radius:7.5, price:150, pack:8, color:0xff8b37, desc:'Large blast radius. Clears rubble, cover and clustered enemies.'},
  canister:{name:'CAN', label:'ANTI-PERSONNEL CANISTER', speed:240, damage:48, radius:0, range:38, pellets:48, spread:Math.PI/18, price:180, pack:8, color:0xffdd99, desc:'48 pellets in a wide cone. Deadly to nearby infantry; weak against armor. 38 m maximum range, no blast.'}
};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function approachAngle(a,b,step){return a+clamp(angleDelta(a,b),-step,step);}
export function ballisticElevation(distance,height,speed,gravity=-GRAVITY){
  const d=Math.max(.001,distance), q=speed**4-gravity*(gravity*d*d+2*height*speed*speed);
  return q<0 ? Math.PI/4 : Math.atan((speed*speed-Math.sqrt(q))/(gravity*d));
}
export function terrainHeight(x,z){
  // Rolling lanes with distinct dunes to launch from. Exact same samples feed the collider.
  let height=.65*Math.sin(x*.058)*Math.cos(z*.047)+.35*Math.sin(x*.15+z*.11)
    +5.8*Math.exp(-((x-23)**2/180+(z-8)**2/360))
    +4.7*Math.exp(-((x+34)**2/240+(z+29)**2/180))
    +3.8*Math.exp(-((x-5)**2/320+(z+52)**2/140))
    +4*Math.exp(-((x+48)**2/230+(z-49)**2/240))
    +2.7*Math.exp(-((x+12)**2/50+(z-3)**2/20));
  for(const r of JUMP_RIDGES){const dx=x-r.x,dz=z-r.z;if(Math.abs(dx)>35||Math.abs(dz)>35)continue;const across=dx*Math.cos(r.yaw)-dz*Math.sin(r.yaw),along=dx*Math.sin(r.yaw)+dz*Math.cos(r.yaw);if(Math.abs(across)>r.width||along < -r.run||along>r.drop)continue;const edge=clamp((Math.abs(across)-r.width*.45)/(r.width*.55),0,1),side=1-edge*edge*(3-2*edge),ramp=along<0?Math.pow((along+r.run)/r.run,1.3):1-along/r.drop;height+=r.height*ramp*side;}
  return height;
}
export function seededRandom(seed=8173){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

// Prototype opposition: one cannon hit kills a jeep; sustained MG fire chips armor.
export const JEEP = {name:'PATROL JEEP',role:'LIGHT PATROL',hp:100,mass:580,speed:12,power:6200,traverse:2.4,elevation:1.4,reload:.12,damage:1,scale:1,wheelX:.9,wheelZ:1.2,suspensionRest:.88,suspensionReach:1.12,spring:22};
export const JEEP_AMMO = {speed:95,damage:1.2,radius:0,color:0xffd29a};
export const FRAG_GRENADE = {range:18,minRange:5,windup:.3,reload:1.4,fuse:1.6,damage:60,radius:3.2,color:0x71804a};
