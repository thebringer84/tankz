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
  he:{name:'HE', label:'HIGH EXPLOSIVE', speed:47, damage:155, radius:7.5, price:0, pack:0, color:0xff8b37, desc:'Large blast radius. Clears rubble, cover and clustered enemies.'},
};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function approachAngle(a,b,step){return a+clamp(angleDelta(a,b),-step,step);}
export function ballisticElevation(distance,height,speed,gravity=-GRAVITY){
  const d=Math.max(.001,distance), q=speed**4-gravity*(gravity*d*d+2*height*speed*speed);
  return q<0 ? Math.PI/4 : Math.atan((speed*speed-Math.sqrt(q))/(gravity*d));
}
// Dev Map district: ten destructible buildings on flattened building pads.
// hw/hd are pad half-extents in the lot's yawed frame; the pad blends out over LOT_FALLOFF.
export const LOT_FALLOFF=6;
export const BUILDING_LOTS=[
 {type:'unfinished',x:-3,z:-18,yaw:Math.PI,hw:7.5,hd:7.5},
 {type:'market',x:15,z:-20,yaw:Math.PI,hw:11,hd:5.5},
 {type:'apartment',x:36,z:-19,yaw:Math.PI,hw:9,hd:6},
 {type:'shanasheel',x:-8,z:-42,yaw:0,hw:6,hd:6},
 {type:'hotel',x:6,z:-42,yaw:0,hw:7,hd:7},
 {type:'government',x:26,z:-43,yaw:0,hw:11,hd:8},
 {type:'warehouse',x:48,z:-42,yaw:0,hw:10,hd:7},
 {type:'mosque',x:8,z:-67,yaw:0,hw:11,hd:12},
 {type:'courtyard',x:40,z:0,yaw:-Math.PI/2,hw:7.5,hd:7.5},
 {type:'petrol',x:-30,z:-2,yaw:Math.PI/2,hw:10,hd:8}
];
export function inBuildingLot(x,z,padding=0){return BUILDING_LOTS.some(l=>{const dx=x-l.x,dz=z-l.z,c=Math.cos(l.yaw),s=Math.sin(l.yaw),lx=dx*c-dz*s,lz=dx*s+dz*c;return Math.abs(lx)<l.hw+padding&&Math.abs(lz)<l.hd+padding;});}
export function terrainHeight(x,z){
 let height=null,blends=0;
 // Inside a pad the ground is exactly flat; around it, blend back to the dunes.
 for(const l of BUILDING_LOTS){const dx=x-l.x,dz=z-l.z,reach=l.hw+l.hd+LOT_FALLOFF;if(Math.abs(dx)>reach||Math.abs(dz)>reach)continue;const c=Math.cos(l.yaw),s=Math.sin(l.yaw),ex=Math.max(0,Math.abs(dx*c-dz*s)-l.hw),ez=Math.max(0,Math.abs(dx*s+dz*c)-l.hd),d=Math.hypot(ex,ez);if(d>=LOT_FALLOFF)continue;if(d===0)return lotHeight(l);
  height??=rawTerrainHeight(x,z);const t=1-d/LOT_FALLOFF;height+=(lotHeight(l)-height)*t*t*(3-2*t);blends++;}
 return blends?height:rawTerrainHeight(x,z);
}
function lotHeight(l){if(l.pad===undefined){let sum=0,n=0;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const lx=i/2*l.hw,lz=j/2*l.hd,c=Math.cos(l.yaw),s=Math.sin(l.yaw);sum+=rawTerrainHeight(l.x+lx*c+lz*s,l.z-lx*s+lz*c);n++;}l.pad=sum/n;}return l.pad;}
export function lotFrame(l){lotHeight(l);return l;}
function rawTerrainHeight(x,z){
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
