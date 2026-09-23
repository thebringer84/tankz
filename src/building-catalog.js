import * as THREE from 'three';
import {Blueprint,FLOOR,SLAB} from './building-kit.js';
import {terrainHeight} from './config.js';

// Ten Baghdad-style buildings assembled programmatically from the modular kit.
// Each returns a Blueprint in its lot's local frame (front of the building = +z).
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const PLASTERS=[0xe2dccf,0xd6ccb6,0xdccdc2,0xcdd1cb,0xdbcfb2,0xd3d5ca];
const INTERIORS=[0xb9cdb4,0xa9c0cc,0xd8cbb0,0xc9b7cf,0xc3d2c0];
const fp=(w,d,cx=0,cz=0)=>({x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2});
const win=(o={})=>({kind:'window',w:1.2,h:1.35,sill:.95,ac:.3,...o});

// Storeys of perimeter walls, slabs and interior columns, crowned with a parapet.
function shell(bp,f,floors,{t=.3,openings,style={},bay=3.8,colSpacing=4.4,parapet=.9,parapetStyle=style,floorH=FLOOR,y0=0,slabOpts={}}={}){
 const levels=[];
 for(let k=0;k<floors;k++){const y=y0+k*floorH,H=floorH-SLAB;const walls=bp.storey(f,y,H,t,(side,i,n,W)=>openings(k,side,i,n,W),style,bay);const cols=bp.interiorColumns(f,y,H,colSpacing);const slab=bp.floorSlab(f,y+H,.15,4,{...slabOpts,top:k===floors-1?'roof':'concrete',topTint:k===floors-1?'roof':'concrete'});levels.push({walls,cols,slab});}
 const top=y0+floors*floorH,para=parapet?bp.parapet(f,top,parapet,.22,parapetStyle):[];return {levels,top,parapet:para,roof:levels.at(-1).slab};
}
function roofClutter(bp,f,roof,top,{tanks=2,dishes=1,condensers=1}={}){
 const tiles=roof.filter(m=>m.box.max.y>top-.05);const spot=()=>{const m=bp.pick(tiles),b=m.box;return {m,x:bp.rand(b.min.x+.7,b.max.x-.7),z:bp.rand(b.min.z+.7,b.max.z-.7)};};
 for(let i=0;i<tanks;i++){const s=spot();bp.waterTank(s.m,s.x,top,s.z,bp.rand(.45,.65),bp.rand(.9,1.3));}
 for(let i=0;i<dishes;i++){const s=spot();bp.dish(s.m,s.x,top,s.z);}
 for(let i=0;i<condensers;i++){const s=spot();bp.condenser(s.m,s.x,top,s.z,bp.pick([0,Math.PI/2,Math.PI]));}
}
// Small rooftop stair house: walls and slab built from the same breakable parts.
function stairHouse(bp,x,z,top,w=2.6,d=2.4){const f=fp(w,d,x,z);bp.storey(f,top,2.3,.2,(side,i)=>side==='front'&&i===0?{kind:'door',w:.9,h:1.9,atlas:'steelDoor'}:null,{frontTint:'plaster',backTint:'inner'},3);bp.floorSlab(f,top+2.3,.1,3,{t:.2});}

function unfinished(seed){
 // Poured-concrete skeleton with rebar starts; the top floor was never completed.
 const bp=new Blueprint('unfinished',seed,{concrete:0xc9c4b8,inner:0xc9c4b8,roof:0xc8c1b3});const f=fp(12,12),n=4,sp=12/3;bp.foundation(f,.7,.25);
 for(let k=0;k<3;k++){const y=k*FLOOR,H=FLOOR-SLAB;
  for(let i=0;i<=3;i++)for(let j=0;j<=3;j++){const x=f.x0+.25+i*(sp-.5/3),z=f.z0+.25+j*(sp-.5/3);if(k===2&&i===3&&j<2)continue;const c=bp.column(x,z,y,H,.45);if(k===2&&bp.random()<.7)for(const dx of [-.12,.12])bp.cell(c,null,w=>w.box('steel',V(x+dx,y+H+.5,z+dx*.5),[.02,.5,.02],null,bp.tint(0x6b4a33,5)),{decor:true});}
  // Cinder-block infill on the ground floor and part of the first floor only.
  if(k<2)for(const side of ['back','left']){const L=bp.sideLength(f,side,.25),m=3,W=L/m;for(let i=0;i<m;i++){if(k===1&&i===2)continue;bp.wallBay(bp.sideFrame(f,side,i*W,y,.25),W,H-.02,.22,k===0&&i===1?{kind:'hole',w:1.4,h:1.2,sill:.9}:null,{front:'concrete',back:'concrete',frontTint:0xbab4a8,backTint:0xbab4a8,edge:'concrete'});}}
  const tiles=bp.floorSlab(f,y+H,.1,4,{top:'concrete',topTint:'concrete',bottom:'concrete',bottomTint:'concrete',edge:'concrete'});
  if(k===2)for(const t of tiles)if(t.box.max.x>2&&t.box.max.z<2)t.removed=true;
 }
 // Sand heap and a stack of blocks left on site.
 const heap=bp.module('fixture',{ground:true});bp.cell(heap,bp.group(heap),w=>w.cylinder('core',V(7.2,0,4.5),1.6,.2,1.1,9,bp.tint(0xcdb68e,0)),{});
 for(let i=0;i<4;i++)bp.cell(heap,bp.group(heap),w=>w.box('concrete',V(-7.3,.2+i*.4,-3+i*.1),[.6,.2,.3],null,bp.tint(0xb4ae9f,.3)),{});
 return bp;
}
function market(seed){
 // Two-storey shop row: rolling shutters, signboards and awnings under flats.
 const plaster=0xdcd2bc,bp=new Blueprint('market',seed,{plaster,inner:0xc7cdb6});const f=fp(20,8);bp.foundation(f);
 const signs=['signRed','signGreen','signRed','signGreen','signRed'],awnings=[0x6e8c7a,0xa3593f,0x5d7394,0xc2a25a,0x87604a];
 const s=shell(bp,f,2,{bay:4,openings:(k,side,i,n,W)=>{
  if(k===0&&side==='front')return {kind:'shop',w:W-1,h:2.6,sign:signs[i%5],atlas:['shutter','openShop','garage','openShop','shutter'][i%5],awning:bp.random()<.75?awnings[(i+seed)%5]:null};
  if(k===0&&side==='back')return i%2?{kind:'door',w:1,h:2.1}:win({w:.9,h:.9,sill:1.4,atlas:'grille'});
  if(side==='front'||side==='back')return win({atlas:bp.pick(['shutters','grille','shutters','broken']),ac:.45});
  return k===1?win({w:.9}):null;},style:{frontTint:'plaster',backTint:'inner'}});
 roofClutter(bp,f,s.roof,s.top,{tanks:3,dishes:3,condensers:2});return bp;
}
function apartment(seed){
 // Four-storey block with cantilevered balconies and exposed floor bands.
 const bp=new Blueprint('apartment',seed,{plaster:0xd3cab8,inner:bp0(seed)});const f=fp(16,10);bp.foundation(f);
 const s=shell(bp,f,4,{bay:4,openings:(k,side,i,n)=>{
  if(k===0&&side==='front'&&i===1)return {kind:'door',w:1.4,h:2.3,atlas:'steelDoor'};
  if(k>0&&side==='front'&&i%2===1)return {kind:'door',w:1.1,h:2.2,atlas:bp.pick(['shutters','woodDoor','broken'])};
  if(side==='left'||side==='right')return k%2?win({w:.8,h:1.1}):null;
  return win({w:1.5,ac:.45,atlas:bp.pick(['grille','shutters','shutters','broken'])});},style:{frontTint:'plaster',backTint:'inner'}});
 // Balconies hang off the floor slab in front of the balcony doors.
 for(let k=1;k<4;k++){const y=k*FLOOR-SLAB,slab=s.levels[k-1].slab,walls=s.levels[k].walls.filter(w=>w.opening?.kind==='door');
  for(const wall of walls){const x0=wall.box.min.x,x1=wall.box.max.x,z=f.z1+.15,host=slab.filter(t=>t.box.max.z>=f.z1&&t.box.max.x>x0+.1&&t.box.min.x<x1-.1);
   const b=bp.slab(x0+.2,z,x1-.2,z+1.2,y,.22,{supports:[...host],lateral:99,edges:['cut','edge','edge','edge'],top:'concrete',topTint:0xbfb8a9,edgeTint:'plaster'});
   for(let i=0;i<=6;i++){const x=x0+.3+(x1-x0-.6)*i/6;bp.cell(b,null,w=>w.box('steel',V(x,y+.22+.5,z+1.12),[.025,.5,.025],null,bp.tint(0x3f4a46,5)),{decor:true});}
   bp.cell(b,null,w=>w.box('steel',V((x0+x1)/2,y+1.24,z+1.12),[(x1-x0)/2-.25,.03,.04],null,bp.tint(0x3f4a46,5)),{decor:true});
   if(bp.random()<.6)bp.cell(b,null,w=>w.box('paint',V((x0+x1)/2,y+1.05,z+.6),[(x1-x0)/2-.3,.35,.01],null,bp.tint(bp.pick([0xc84f3f,0x3f6fa8,0xe0d8c0,0x6d9a58]),5,.1)),{decor:true});}}
 roofClutter(bp,f,s.roof,s.top,{tanks:4,dishes:5,condensers:2});stairHouse(bp,-4.5,-2,s.top);return bp;
}
function bp0(seed){return INTERIORS[seed%INTERIORS.length];}
function shanasheel(seed){
 // Old Baghdad yellow-brick house with projecting wooden mashrabiya bays.
 const bp=new Blueprint('shanasheel',seed,{brick:0xc4c0ba,inner:0xd8cbb0});const f=fp(10,10);bp.foundation(f,.7,.2,'brick','brick');
 const style={front:'brick',back:'plaster',frontTint:'brick',backTint:'inner',edge:'brick',edgeTint:'brick'};
 const s=shell(bp,f,3,{bay:3.3,style,parapet:1.1,openings:(k,side,i,n)=>{
  if(k===0)return side==='front'&&i===1?{kind:'arch',w:1.4,h:2.6,atlas:'woodDoor'}:(side==='front'||side==='back')&&i!==1?{kind:'window',w:.7,h:.9,sill:1.6,atlas:'grille',noSill:true}:null;
  if(side==='front')return i===1?{kind:'hole',w:2,h:2.2,sill:.25}:{kind:'arch',w:1,h:1.9,sill:.9,atlas:'arch'};
  return side==='back'||k===2?{kind:'arch',w:.9,h:1.7,sill:1}:null;}});
 // Shanasheel: projecting timber box with lattice screens on three sides.
 for(let k=1;k<3;k++){const wall=s.levels[k].walls.find(w=>w.opening?.kind==='hole'),slab=s.levels[k-1].slab,y=k*FLOOR,x0=wall.box.min.x+.15,x1=wall.box.max.x-.15,z=f.z1,d=.95;
  const m=bp.module('fixture',{supports:[...slab.filter(t=>t.box.max.z>=f.z1&&t.box.max.x>x0&&t.box.min.x<x1),wall],lateral:99}),g=bp.group(m,{center:V((x0+x1)/2,y+1.25,z+d/2),half:[(x1-x0)/2,1.25,d/2],basis:null});
  bp.cell(m,g,w=>{w.box('wood',V((x0+x1)/2,y+.1,z+d/2),[(x1-x0)/2+.1,.14,d/2+.05],null,bp.tint('wood',3));w.box('wood',V((x0+x1)/2,y+2.45,z+d/2),[(x1-x0)/2+.15,.1,d/2+.12],null,bp.tint('wood',3));for(const x of [x0,x1])for(const dz of [0,d])w.box('wood',V(x,y+1.25,z+dz),[.06,1.2,.06],null,bp.tint('wood',3));});
  const f2=bp.frame(V(x0,y+.25,z+d),V(1,0,0));bp.atlasQuad(m,f2,0,0,x1-x0,2.1,0,'mashrabiya',{anchor:2});
  for(const [x,u] of [[x0,V(0,0,1)],[x1,V(0,0,-1)]]){const fs=bp.frame(V(x,y+.25,u.z>0?z:z+d),u);bp.atlasQuad(m,fs,0,0,d,2.1,0,'mashrabiya',{anchor:2});}}
 // Crenellated brick parapet merlons.
 for(const p of s.parapet)for(let i=0;i<3;i++){const b=p.box,cx=b.min.x+(b.max.x-b.min.x)*(i+.5)/3,cz=b.min.z+(b.max.z-b.min.z)*(i+.5)/3;bp.cell(p,null,w=>w.box('brick',V(cx,b.max.y+.2,cz),[Math.min(.3,(b.max.x-b.min.x)/2),.2,Math.min(.3,(b.max.z-b.min.z)/2)],null,bp.tint('brick',9)),{decor:true});}
 roofClutter(bp,f,s.roof,s.top,{tanks:2,dishes:1,condensers:0});return bp;
}
function hotel(seed){
 // Seven-storey concrete hotel: ribbon windows, lobby glazing and a rooftop sign.
 const bp=new Blueprint('hotel',seed,{plaster:0xd8d2c2,inner:0xcfc6b0});const f=fp(12,12);bp.foundation(f,.8,.3);
 const s=shell(bp,f,7,{bay:4,colSpacing:4,parapet:1,openings:(k,side,i)=>{
  if(k===0)return side==='front'?{kind:'shop',w:2.8,h:2.5,atlas:i===1?'openShop':'garage'}:win({w:1.8});
  return win({w:2.4,h:1.45,sill:.9,ac:.35,atlas:bp.pick(['grille','grille','shutters','broken','broken'])});},style:{frontTint:'plaster',backTint:'inner'}});
 // Painted floor bands on every slab edge give the tower its horizontal read.
 roofClutter(bp,f,s.roof,s.top,{tanks:4,dishes:3,condensers:3});stairHouse(bp,3.5,-3.5,s.top,2.8,2.6);
 const sign=s.parapet.find(p=>p.box.min.z>f.z1-.5);const fr=bp.frame(V(-3,s.top+1,f.z1-.1),V(1,0,0));for(const x of [.4,5.6])bp.cell(sign,null,w=>w.box('steel',bp.at(fr,x,.4,0),[.05,.6,.05],null,bp.tint('steel',9)),{decor:true});bp.atlasQuad(sign,fr,0,.7,6,2.2,0,'signGreen',{anchor:3});
 const back=bp.frame(V(3,s.top+1,f.z1-.1),V(-1,0,0));bp.atlasQuad(sign,back,0,.7,6,2.2,0,'posters',{anchor:3});
 return bp;
}
function government(seed){
 // Ministry office: tall arched ground floor, columned portico and blast walls.
 const bp=new Blueprint('government',seed,{plaster:0xd8ccb0,inner:0xcfc4a8,trim:0xe6dcc4});const f=fp(20,11,0,-1.5);bp.foundation(f,.9,.35);
 const s=shell(bp,f,2,{bay:4,floorH:3.8,openings:(k,side,i,n)=>{
  if(k===0&&side==='front'&&i===2)return {kind:'arch',w:2,h:3,atlas:'woodDoor'};
  if(k===0)return {kind:'arch',w:1.3,h:2.3,sill:.6};return win({w:1.4,h:1.6,atlas:bp.pick(['shutters','grille','broken'])});},style:{frontTint:'plaster',backTint:'inner'},parapet:1.1});
 // Frieze band across the parapet.
 for(const p of s.parapet){if(p.box.max.z<f.z1-.3)continue;const fr=bp.frame(V(p.box.min.x,p.box.min.y+.15,f.z1+.01),V(1,0,0));bp.atlasQuad(p,fr,0,0,p.box.max.x-p.box.min.x,.7,0,'frieze',{anchor:1.5});}
 // Portico: round columns carrying an entablature slab.
 const px0=-6,px1=6,pz=f.z1+2.8,cols=[];for(let i=0;i<6;i++){const x=px0+i*(px1-px0)/5;for(let d=0;d<3;d++)cols.push(bp.drum(x,d*1.45,pz,.32,1.45,3,{kind:'column',mat:'plaster',tint:'trim',need:.8}));}
 const tops=cols.filter(c=>c.box.max.y>4);bp.slab(px0-.6,f.z1,px1+.6,pz+.6,4.35,.4,{supports:tops,lateral:99,edges:['cut','edge','edge','edge'],top:'roof',edgeTint:'trim'});
 // Concrete T-walls (Baghdad blast walls) screen the frontage.
 for(let i=0;i<8;i++){const x=-9.2+i*1.55;if(i===3||i===4)continue;const m=bp.module('wall',{ground:true}),fr=bp.frame(V(x-.72,0,f.z1+5.2),V(1,0,0));bp.panel(m,fr,[{x0:0,y0:.45,x1:1.44,y1:3.4,labels:['cut','edge','edge','edge'],cell:1}],.22,{front:'concrete',back:'concrete',frontTint:0xbdb6a6,backTint:0xbdb6a6,edge:'concrete'});bp.panel(m,bp.frame(V(x-.72,0,f.z1+5.2),V(1,0,0)),[{x0:0,y0:0,x1:1.44,y1:.45,labels:['edge','edge','cut','edge'],cell:2}],.9,{front:'concrete',back:'concrete',frontTint:0xb0aa9b,backTint:0xb0aa9b,edge:'concrete'});if(i%2)bp.atlasQuad(m,bp.frame(V(x-.6,0,f.z1+5.32),V(1,0,0)),0,1.2,1.2,2.4,0,'posters',{anchor:.8});}
 // Flagpole.
 const pole=s.parapet.find(p=>p.box.min.z>f.z1-.5);bp.cell(pole,null,w=>{w.cylinder('steel',V(0,s.top,f.z1-.3),.05,.04,4.5,6,bp.tint('steel',9));w.box('paint',V(.6,s.top+3.9,f.z1-.3),[.55,.35,.01],null,bp.tint(0x2f6f4f,9));},{decor:true,anchor:1.5});
 roofClutter(bp,f,s.roof,s.top,{tanks:2,dishes:2,condensers:4});return bp;
}
function warehouse(seed){
 // Brick warehouse: roller doors, steel trusses and a corrugated gable roof.
 const bp=new Blueprint('warehouse',seed,{brick:0xb4afa6,inner:0xbdb3a0,metal:0xd8d4cc});const f=fp(18,12);bp.foundation(f,.6,.2);
 const H=5.2,t=.3,style={front:'brick',back:'brick',frontTint:'brick',backTint:'inner',edge:'brick',edgeTint:'brick'};
 const walls=bp.storey(f,0,H,t,(side,i,n)=>side==='front'&&(i===1||i===3)?{kind:'shop',w:3.2,h:3.6,atlas:'garage'}:side==='back'&&i===2?{kind:'door',w:1.1,h:2.2,atlas:'steelDoor'}:side==='front'||side==='back'?win({w:1.6,h:.8,sill:3.6,atlas:'grille',noSill:true,ac:0}):null,style,3.6);
 // Gable triangles on the side walls.
 const rise=1.6;for(const side of ['left','right']){const L=bp.sideLength(f,side,t)+2*t,fr=bp.sideFrame(f,side,-t,H,t),m=bp.module('wall',{});bp.panel(m,fr,[{poly:[{x:0,y:0,label:'cut'},{x:L,y:0,label:'edge'},{x:L/2,y:rise,label:'edge'}],cell:1.3}],t,style);}
 // Trusses every 3.6 m carry the roof sheets.
 const trusses=[];for(let i=0;i<=5;i++){const x=f.x0+.2+i*(18-.4)/5,m=bp.module('column',{supports:walls.filter(w=>w.box.max.y>H-.1&&Math.abs((w.box.min.x+w.box.max.x)/2-x)<2.4),lateral:99,need:.4});
  bp.cell(m,bp.group(m),w=>{w.box('steel',V(x,H+.05,0),[.08,.08,6],null,bp.tint('steel',6));for(const s of [-1,1]){const a=Math.atan2(rise,6),len=Math.hypot(6,rise)/2;w.box('steel',V(x,H+rise/2,s*3),[.07,.07,len],[V(1,0,0),V(0,Math.cos(a),s*Math.sin(a)),V(0,-s*Math.sin(a),Math.cos(a))],bp.tint('steel',6));}w.box('steel',V(x,H+rise/2,0),[.05,rise/2,.05],null,bp.tint('steel',6));});trusses.push(m);}
 for(let i=0;i<5;i++)for(const s of [1,-1]){const x0=f.x0-.3+i*(18.6/5),len=Math.hypot(6.6,rise),u=V(s,0,0),v=V(0,rise,-s*6.6).normalize(),o=V(s>0?x0:x0+18.6/5,H-.08,s*(f.z1+.6)),fr=bp.frame(o,u,v);
  const sup=[...trusses.filter(tr=>{const cx=(tr.box.min.x+tr.box.max.x)/2;return cx>=x0-.3&&cx<=x0+18.6/5+.3;}),...walls.filter(w=>(s>0?w.box.min.z>f.z1-1:w.box.max.z<f.z0+1)&&w.box.max.x>x0&&w.box.min.x<x0+18.6/5)];
  const m=bp.module('canopy',{supports:sup,lateral:99,need:.3});bp.panel(m,fr,[{x0:0,y0:0,x1:18.6/5,y1:len,labels:['edge','cut','edge','cut'],cell:1.6}],.07,{front:'metal',back:'metal',frontTint:'metal',backTint:0x9a9a94,edge:'metal',edgeTint:'metal'});}
 // Yard clutter: pallets and an oil drum rack.
 const yard=bp.module('fixture',{ground:true});for(let i=0;i<3;i++)bp.cell(yard,bp.group(yard),w=>w.box('wood',V(-6+i*1.4,.35+(i%2)*.1,f.z1+2.2),[.6,.35+(i%2)*.1,.5],null,bp.tint('wood',.5)),{});
 return bp;
}
function mosque(seed){
 // Neighbourhood mosque: arcaded prayer hall, tiled dome on a drum, and a minaret.
 const bp=new Blueprint('mosque',seed,{plaster:0xe6e0d4,inner:0xe0d6c0,brick:0xc6c0b6,tile:0xffffff,trim:0xe3d8bf});const f=fp(14,12,0,-3.5);bp.foundation(f,.8,.3);
 const H=5.6,s=shell(bp,f,1,{bay:3.5,floorH:H+SLAB,colSpacing:4.7,parapet:.8,openings:(k,side,i,n)=>side==='front'&&i===1?{kind:'arch',w:1.8,h:3.4,atlas:'woodDoor'}:{kind:'arch',w:1.2,h:2.8,sill:1.4,atlas:'arch'},style:{frontTint:'plaster',backTint:'inner'}});
 for(const p of s.parapet){const b=p.box,alongX=b.max.x-b.min.x>b.max.z-b.min.z,y=b.min.y-.78;let o,u,len;
  if(alongX){len=b.max.x-b.min.x;if((b.min.z+b.max.z)/2>-3.5){o=V(b.min.x,y,b.max.z+.16);u=V(1,0,0);}else{o=V(b.max.x,y,b.min.z-.16);u=V(-1,0,0);}}
  else{len=b.max.z-b.min.z;if((b.min.x+b.max.x)/2>0){o=V(b.max.x+.16,y,b.max.z);u=V(0,0,-1);}else{o=V(b.min.x-.16,y,b.min.z);u=V(0,0,1);}}
  bp.atlasQuad(p,bp.frame(o,u),0,0,len,.62,0,'tileBand',{anchor:1.2});}
 // Drum and dome over the centre of the roof.
 const top=s.top,centre=V(0,top,-3.5),roofTiles=s.roof.filter(t=>t.box.min.x<2.5&&t.box.max.x>-2.5&&t.box.min.z<-1&&t.box.max.z>-6);
 const drum=[];for(let k=0;k<12;k++){const m=bp.module('shell',{supports:roofTiles,tag:'drum'}),a0=k/12*Math.PI*2,a1=(k+1)/12*Math.PI*2;bp.cell(m,bp.group(m),w=>w.cylinder('plaster',V(centre.x,top,centre.z),3.3,3.3,1.5,2,bp.tint('plaster',top),'core',a0,a1));if(k%3===0){const a=(a0+a1)/2,fr=bp.frame(V(centre.x+Math.cos(a)*3.31-Math.sin(a)*.4,top+.35,centre.z+Math.sin(a)*3.31+Math.cos(a)*.4),V(Math.sin(a),0,-Math.cos(a)));bp.atlasQuad(m,fr,0,0,.8,.9,0,'arch',{anchor:1});}drum.push(m);}
 const rings=bp.dome(centre.x,top+1.5,centre.z,3.4,4,12,.3,{supports:drum});
 bp.cell(rings.at(-1),null,w=>{w.cylinder('steel',V(centre.x,top+4.85,centre.z),.08,.02,1.2,6,bp.tint(0xc9a64a,9));},{decor:true,anchor:4});
 // Arcaded portico across the front.
 const pz=f.z1+3,ports=[];for(let i=0;i<4;i++){const x0=f.x0+i*3.5;ports.push(bp.wallBay(bp.frame(V(x0,0,pz),V(1,0,0)),3.5,4,.45,{kind:'arch',w:2.4,h:3.3},{frontTint:'plaster',backTint:'plaster'},{}));}
 bp.slab(f.x0-.2,f.z1,f.x1+.2,pz+.35,4,.35,{supports:ports,lateral:99,edges:['cut','edge','edge','edge'],edgeTint:'trim'});
 // Minaret: square base, brick shaft, gallery and tiled cap. Topples as one piece.
 const mx=f.x1+2.2,mz=f.z1+3.2,rigid='minaret';let below=null;const parts=[];
 const base=bp.module('wall',{rigid,ground:true});bp.panel(base,bp.frame(V(mx-1.3,0,mz),V(1,0,0)),[{x0:0,y0:0,x1:2.6,y1:4.5,labels:['cut','edge','cut','edge'],cell:1.2}],2.6,{front:'plaster',back:'plaster',frontTint:'trim',backTint:'trim',edge:'plaster'});below=[base];parts.push(base);
 for(let k=0;k<6;k++){const m=bp.drum(mx,4.5+k*2,mz,1.05-k*.03,2,4,{mat:'brick',tint:'brick',supports:below,rigid});below=[m];parts.push(m);}
 const gy=16.5,gallery=bp.module('shell',{supports:below,rigid});bp.cell(gallery,bp.group(gallery),w=>{w.cylinder('plaster',V(mx,gy,mz),1.2,1.65,.5,12,bp.tint('trim',gy));w.cylinder('plaster',V(mx,gy+.5,mz),1.65,1.65,.2,12,bp.tint('trim',gy));for(let i=0;i<12;i++){const a=i/12*Math.PI*2;w.box('plaster',V(mx+Math.cos(a)*1.55,gy+1.1,mz+Math.sin(a)*1.55),[.06,.45,.06],null,bp.tint('trim',gy));}w.cylinder('plaster',V(mx,gy+1.55,mz),1.62,1.62,.12,12,bp.tint('trim',gy));});
 const upper=bp.drum(mx,gy+.7,mz,.75,2.4,3,{mat:'tile',tint:'tile',supports:[gallery],rigid});const cap=bp.drum(mx,gy+3.1,mz,.95,1.9,3,{mat:'tile',tint:0xd9f0ee,supports:[upper],rigid,r1:.02});
 bp.cell(cap,null,w=>w.cylinder('steel',V(mx,gy+5,mz),.05,.02,.9,5,bp.tint(0xc9a64a,20)),{decor:true});
 // Courtyard wall with a gate, wrapping the forecourt.
 for(const [x0,x1] of [[f.x0-1,-2],[2,f.x1-.5]]){const m=bp.wallBay(bp.frame(V(x0,0,f.z1+7.4),V(1,0,0)),x1-x0,2.4,.3,null,{frontTint:'plaster',backTint:'plaster',topEdge:true,ends:[true,true]});}
 return bp;
}
function courtyard(seed){
 // Two-storey family house behind a walled forecourt with a date palm.
 const bp=new Blueprint('courtyard',seed,{plaster:PLASTERS[seed%PLASTERS.length],inner:0xb5c8c0});const f=fp(13,8,0,-3);bp.foundation(f);
 const s=shell(bp,f,2,{bay:3.3,openings:(k,side,i,n)=>{
  if(k===0&&side==='front'&&i===1)return {kind:'door',w:1.1,h:2.2,atlas:'woodDoor'};
  if(side==='left'||side==='right')return i===0?win({w:.9}):null;return win({atlas:bp.pick(['shutters','grille','shutters']),ac:.5});},style:{frontTint:'plaster',backTint:'inner'}});
 roofClutter(bp,f,s.roof,s.top,{tanks:2,dishes:2,condensers:1});stairHouse(bp,-4,-5,s.top,2.4,2.2);
 // Laundry line strung between two posts on the roof.
 const tile=s.roof.find(t=>t.box.min.x<.5&&t.box.max.x>.5&&t.box.min.z<-1.5&&t.box.max.z>-1.5)||s.roof[0];bp.cell(tile,null,w=>{for(const x of [-1.5,2.5])w.box('steel',V(x,s.top+.8,-1.5),[.03,.8,.03],null,bp.tint('steel',9));w.box('steel',V(.5,s.top+1.55,-1.5),[2,.01,.01],null,bp.tint(0x222222,9));for(let i=0;i<4;i++)w.box('paint',V(-1+i*.9,s.top+1.25,-1.5),[.3,.3,.01],null,bp.tint(bp.pick([0xd24a3a,0x3d67a8,0xe8e2d2,0x5f9a57,0xd8b04a]),9,.1));},{decor:true});
 // Forecourt wall with a steel gate.
 const cz=f.z1+5.5,wallStyle={frontTint:'plaster',backTint:'plaster',topEdge:true,ends:[true,true]};
 bp.wallBay(bp.frame(V(-6.5,0,cz),V(1,0,0)),13,2.4,.28,{kind:'door',w:2.4,h:2.1,atlas:'garage'},wallStyle);
 for(const [x,u] of [[6.5-.14,V(0,0,-1)],[-6.5+.14,V(0,0,1)]])bp.wallBay(bp.frame(V(x,0,u.z<0?cz-.14:f.z1),u),5.5-.14,2.4,.28,null,wallStyle);
 datePalm(bp,3.8,f.z1+2.6,0);
 return bp;
}
// Date palm: segmented trunk and a crown of creased, drooping fronds. Falls as one piece.
function datePalm(bp,px,pz,y0,height=6.6){
 const palm=bp.module('fixture',{ground:true,rigid:`palm-${bp.modules.length}`}),lean=bp.rand(-.25,.25),seg=height/6;bp.cell(palm,bp.group(palm),w=>{for(let i=0;i<6;i++)w.cylinder('wood',V(px+i*lean*.12,y0+i*seg,pz),.26-i*.015,.24-i*.015,seg,7,bp.tint(0x7a6448,2));});
 bp.cell(palm,null,w=>{const top=V(px+lean*.72,y0+height,pz);for(let i=0;i<13;i++){const a=i/13*Math.PI*2+bp.rand(-.2,.2),dir=V(Math.cos(a),0,Math.sin(a)),side=V(-dir.z,0,dir.x),rise=bp.rand(.1,.6),col=bp.tint(bp.pick([0x5f7440,0x6b7d45,0x7a8150,0x8a8452]),7,.1);
   const pts=[0,.35,.7,1].map(t=>V().copy(top).addScaledVector(dir,t*2.7).add(V(0,rise*Math.sin(t*2.2)*1.4-t*t*1.6,0))),widths=[.08,.42,.34,.02];
   for(let k=0;k<3;k++){const p0=pts[k],p1=pts[k+1],c0=V().copy(p0).add(V(0,.06,0)),c1=V().copy(p1).add(V(0,.06,0));
    for(const s of [-1,1]){const e0=V().copy(p0).addScaledVector(side,s*widths[k]).add(V(0,-.08,0)),e1=V().copy(p1).addScaledVector(side,s*widths[k+1]).add(V(0,-.08,0));w.quad('paint',c0,e0,e1,c1,col);w.quad('paint',c0,c1,e1,e0,col);}}}},{decor:true,anchor:3});
 return palm;
}
// Street dressing for the district: asphalt, utility poles and wires, palms,
// a sandbag checkpoint, HESCO barriers and burnt-out cars. World coordinates.
function street(seed){
 const bp=new Blueprint('street',seed,{paint:0x6d6a63});const H=(x,z)=>terrainHeight(x,z);
 // Asphalt strip following the ground along the main street and the petrol road.
 const road=(x0,z0,x1,z1,width)=>{const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/2),dx=(x1-x0)/n,dz=(z1-z0)/n,len=Math.hypot(dx,dz),sx=-dz/len*width/2,sz=dx/len*width/2;for(let i=0;i<n;i++){const ax=x0+dx*i,az=z0+dz*i,bx=ax+dx,bz=az+dz,p=[V(ax-sx,0,az-sz),V(bx-sx,0,bz-sz),V(bx+sx,0,bz+sz),V(ax+sx,0,az+sz)];for(const q of p)q.y=H(q.x,q.z)+.045;bp.fixed.quad('roof',p[0],p[3],p[2],p[1],bp.tint(0x77736c,2,.1));}};
 road(-24,-30,62,-30,9);road(-20,-26,-28,-6,6.5);
 // Utility poles every 14 m on the north kerb; wires sag between them.
 const poles=[];for(let i=0;i<6;i++){const x=-12+i*14,z=-25.4,y=H(x,z)-.3,rigid=`pole-${i}`;let below=null,top;
  for(let k=0;k<3;k++){const m=bp.drum(x,y+k*3,z,.15-k*.02,3,2,{mat:'wood',tint:0x5c4a38,supports:below,ground:k===0,rigid,r1:.13-k*.02});below=[m];top=m;}
  bp.cell(top,null,w=>{w.box('wood',V(x,y+8.6,z),[.9,.07,.07],null,bp.tint(0x5c4a38,9));for(const dx of [-.8,0,.8])w.cylinder('paint',V(x+dx,y+8.67,z),.04,.03,.18,5,bp.tint(0xd8d4c8,9));if(i%2===0)w.box('paint',V(x,y+7.2,z+.3),[.28,.4,.22],null,bp.tint(0x7c817b,9));},{decor:true,anchor:2});
  poles.push({m:top,x,y:y+8.85,z});}
 for(let i=0;i<poles.length-1;i++){const a=poles[i],b=poles[i+1];bp.cell(a.m,null,w=>{for(const dx of [-.8,0,.8]){const p0=V(a.x+dx,a.y,a.z),p2=V(b.x+dx,b.y,b.z),mid=V().lerpVectors(p0,p2,.5).add(V(0,-.7,0));for(const [q0,q1] of [[p0,mid],[mid,p2]]){const c=V().lerpVectors(q0,q1,.5),d=V().subVectors(q1,q0),len=d.length(),u=d.normalize(),side=V(0,0,1),up=V().crossVectors(side,u);w.box('steel',c,[.012,.012,len/2],[side,up,u],bp.tint(0x1c1c1c,9));}}},{decor:true,anchor:0});}
 // Date palms along the kerbs.
 for(const [x,z] of [[9,-25.2],[25,-25.2],[-5,-34.8],[43,-34.9],[-22,-19]])datePalm(bp,x,z,H(x,z)-.2,bp.rand(5.8,7.4));
 // Sandbag checkpoint at the ministry gap in the blast walls.
 const bags=bp.module('fixture',{ground:true});for(let row=0;row<3;row++)for(let i=0;i<9;i++){const a=Math.PI*(.15+i/8*.7),x=25+Math.cos(a)*2.2,z=-31.2+Math.sin(a)*1.6,y=H(x,z)+.13+row*.24;if(i%3===0)bp.group(bags);bp.cell(bags,bags.groups.at(-1),w=>w.box('paint',V(x,y,z),[.33,.12,.2],[V(-Math.sin(a),0,Math.cos(a)),V(0,1,0),V(Math.cos(a),0,Math.sin(a))],bp.tint(bp.pick([0xb6a37c,0xa89570,0xc0ae88]),3,.08)));}
 // HESCO barriers shielding the hotel entrance.
 for(let i=0;i<5;i++){const x=1.2+i*1.1,z=-33.6,y=H(x,z),m=bp.module('fixture',{ground:true});bp.cell(m,bp.group(m),w=>{w.box('paint',V(x,y+.6,z),[.52,.6,.52],null,bp.tint(0xb3a078,3,.08),{top:'core'});for(const dy of [.25,.6,.95])w.box('steel',V(x,y+dy,z+.53),[.53,.012,.012],null,bp.tint(0x3a3a36,3));});}
 // Burnt-out cars: charred shells on their rims.
 for(const [x,z,yaw] of [[14,-28.5,.2],[37,-31.5,2.8],[-16,-31,1.4]]){const y=H(x,z),m=bp.module('fixture',{ground:true}),f=bp.frame(V(x,y,z),V(Math.cos(yaw),0,-Math.sin(yaw))),g=bp.group(m);
  bp.cell(m,g,w=>{const B=(cx,cy,cz,h,mat='paint',tint=0x2d2a27)=>w.box(mat,bp.at(f,cx,cy,cz),h,[f.u,f.v,f.n],bp.tint(tint,3,.1));B(0,.42,0,[.9,.22,2]);B(0,.8,-.15,[.8,.22,.95],'paint',0x24211f);B(0,.62,1.45,[.88,.1,.5],'steel',0x4a3a2c);B(0,.6,-1.7,[.88,.12,.3],'steel',0x4a3a2c);for(const sx of [-.8,.8])for(const sz of [-1.2,1.2])w.cylinder('steel',bp.at(f,sx,0,sz),.26,.26,.12,8,bp.tint(0x3b332c,3));});}
 return bp;
}
function petrol(seed){
 // Petrol station: canopy on four columns, fuel islands, kiosk and price pylon.
 const bp=new Blueprint('petrol',seed,{plaster:0xe8e2d4,inner:0xd3cdbd});
 const cols=[];for(const x of [-4.5,4.5])for(const z of [-2.2,2.2])cols.push(bp.column(x,z,0,4.4,.45,{mat:'plaster',tint:0xe8e2d4}));
 const canopy=bp.slab(-6.5,-3.6,6.5,3.6,4.4,.55,{supports:cols,lateral:99,edges:['edge','edge','edge','edge'],top:'metal',topTint:0xcfcac0,bottom:'plaster',bottomTint:0xf0ece2,edge:'paint',edgeTint:0x2f7d5a,cell:2.2,kind:'canopy'});
 // Fuel islands: concrete kerb with two dispensers each. Dispensers explode.
 for(const x of [-2.4,2.4]){const island=bp.module('fixture',{ground:true});bp.cell(island,bp.group(island),w=>w.box('concrete',V(x,.12,0),[.6,.12,2.4],null,bp.tint('concrete',.1)));
  for(const z of [-1.1,1.1]){const pump=bp.cell(island,bp.group(island),w=>{w.box('paint',V(x,.9,z),[.35,.66,.28],null,bp.tint(0xc9473a,1));w.box('paint',V(x,1.62,z),[.37,.08,.3],null,bp.tint(0xe8e2d4,1));w.box('steel',V(x+.37,1,z),[.02,.35,.12],null,bp.tint(0x2b2b2b,1));});pump.explosive=true;}}
 // Kiosk with a shop front.
 const kf=fp(6,4,0,-7.6);bp.foundation(kf,.5,.15);const kiosk=shell(bp,kf,1,{bay:3,parapet:.6,openings:(k,side,i)=>side==='front'?(i===0?{kind:'shop',w:2.2,h:2.3,atlas:'openShop',sign:'signGreen'}:win({w:1.4,atlas:'grille',ac:.8})):side==='back'&&i===1?{kind:'door',w:.9,h:2}:null,style:{frontTint:'plaster',backTint:'inner'}});
 roofClutter(bp,kf,kiosk.roof,kiosk.top,{tanks:1,dishes:0,condensers:1});
 // Price pylon.
 const pylon=bp.column(7.8,5.2,0,3.2,.35,{mat:'plaster',tint:0xe8e2d4});bp.cell(pylon,null,w=>w.box('paint',V(7.8,3.8,5.2),[.9,.8,.12],null,bp.tint(0x2f7d5a,5)),{decor:true,anchor:2});bp.atlasQuad(pylon,bp.frame(V(7.1,3.25,5.33),V(1,0,0)),0,0,1.4,1.1,0,'signRed',{anchor:2});
 return bp;
}
export const BUILDING_TYPES={unfinished,market,apartment,shanasheel,hotel,government,warehouse,mosque,courtyard,petrol};
export const DRESSING_TYPES={street};
export function createBlueprint(type,seed=1){const make=BUILDING_TYPES[type]||DRESSING_TYPES[type];if(!make)throw new RangeError(`Unknown building type: ${type}`);return make(seed);}
