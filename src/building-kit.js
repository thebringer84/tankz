import * as THREE from 'three';
import {MeshWriter,fracturePolygon,rectPolygon} from './building-geometry.js';
import {seededRandom} from './config.js';

// Modular building kit. A Blueprint collects breakable modules (wall bays, slab
// tiles, columns, parapets, dome rings, minaret drums...) made of convex cells in
// the building's local frame: +x right, +y up from pad level, +z out of the front.
export const FLOOR=3.2,SLAB=.3;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),UP=V(0,1,0);
// Structural rules: `need` is the share of original support that must survive,
// `fail` is the cell integrity below which the module breaks apart by itself, and
// `lateral` is how many vertically-supported neighbours can bridge a lost support.
const RULES={wall:{need:.5,fail:.42,lateral:2},slab:{need:.34,fail:.36,lateral:2},column:{need:.6,fail:.5,lateral:99},parapet:{need:.5,fail:.4,lateral:99},shell:{need:.45,fail:.4,lateral:99},fixture:{need:.4,fail:.3,lateral:99},canopy:{need:.5,fail:.35,lateral:99}};
// 4x4 facade atlas cells: [column,row] from the top-left.
export const ATLAS={grille:[0,0],shutters:[1,0],arch:[2,0],broken:[3,0],steelDoor:[0,1],woodDoor:[1,1],shutter:[2,1],openShop:[3,1],signRed:[0,2],signGreen:[1,2],ac:[2,2],mashrabiya:[3,2],tileBand:[0,3],frieze:[1,3],posters:[2,3],garage:[3,3]};
export function atlasUV(key,inset=.035){const [c,r]=ATLAS[key];const u0=(c+inset)/4,u1=(c+1-inset)/4,v0=1-(r+1-inset)/4,v1=1-(r+inset)/4;return [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];}

export class Blueprint {
 constructor(type,seed,palette={}){
  this.type=type;this.random=seededRandom(seed);this.writer=new MeshWriter();this.fixed=new MeshWriter();this.modules=[];
  this.palette={plaster:0xe8dcc0,inner:0xbfcab4,brick:0xd4c8b4,concrete:0xd2cbbd,roof:0xd6ccba,core:0xd9ccb4,tile:0xffffff,metal:0xd0d0d0,wood:0x8f6f4f,paint:0x7d8580,steel:0x585c57,atlas:0xffffff,trim:0xd9d0bd,dark:0x2e2c29,...palette};
 }
 rand(a=0,b=1){return a+(b-a)*this.random();}
 pick(list){return list[Math.floor(this.random()*list.length)];}
 // Linear vertex tint with ground grime and a small per-cell variation.
 tint(key,y=2,jitter=.07){const c=new THREE.Color(typeof key==='number'?key:(this.palette[key]??0xffffff));const grime=.74+.26*THREE.MathUtils.smoothstep(y,-.2,1.8),r=grime*(1+(this.random()-.5)*jitter);return [c.r*r,c.g*r,c.b*r];}
 module(kind,opts={}){const rule=RULES[kind]||RULES.fixture;const m={id:this.modules.length,kind,cells:[],groups:[],box:new THREE.Box3(),need:opts.need??rule.need,fail:opts.fail??rule.fail,lateral:opts.lateral??rule.lateral,rigid:opts.rigid||null,explicit:opts.supports||null,tag:opts.tag||kind,ground:opts.ground??null};this.modules.push(m);return m;}
 group(m,shape=null){const g={shape,cells:[]};m.groups.push(g);return g;}
 cell(m,g,draw,{decor=false,solid=!decor,anchor=0,glass=false}={}){
  this.writer.begin();draw(this.writer);const {ranges,hull}=this.writer.end();if(!ranges.length)return null;
  const box=new THREE.Box3();for(let i=0;i<hull.length;i+=3)box.expandByPoint(V(hull[i],hull[i+1],hull[i+2]));const center=box.getCenter(V()),size=box.getSize(V());
  const c={module:m,group:g,ranges,hull,center,radius:size.length()/2,volume:Math.max(.002,Math.max(.05,size.x)*Math.max(.05,size.y)*Math.max(.05,size.z)),decor,solid,anchor,glass,alive:true,index:m.cells.length};
  m.cells.push(c);if(g)g.cells.push(c);if(!decor)m.box.union(box);return c;
 }
 // Frame for a planar part: panel x along u, panel y along v, thickness along n=u×v.
 frame(o,u,v=UP){return {o,u:u.clone().normalize(),v:v.clone().normalize(),n:V().crossVectors(u,v).normalize()};}
 at(f,x,y,d=0){return V().copy(f.o).addScaledVector(f.u,x).addScaledVector(f.v,y).addScaledVector(f.n,d);}
 // Fractures rectangles/convex polygons of a panel into cells. Each part keeps one
 // intact cuboid collider until its first cell breaks.
 panel(m,f,parts,t,{front='plaster',back='plaster',frontTint='plaster',backTint='inner',edgeTint=frontTint,cell=1.05,edge=front}={}){
  for(const part of parts){
   const poly=part.poly||rectPolygon(part.x0,part.y0,part.x1,part.y1,part.labels);let shape=null;
   if(!part.poly){const cx=(part.x0+part.x1)/2,cy=(part.y0+part.y1)/2;shape={center:this.at(f,cx,cy),half:[(part.x1-part.x0)/2,(part.y1-part.y0)/2,t/2],basis:[f.u,f.v,f.n]};}
   const g=this.group(m,shape),baseY=f.o.y;
   for(const piece of fracturePolygon(poly,part.cell||cell,this.random)){let cy=0;for(const p of piece)cy+=p.y;cy=baseY+cy/piece.length*f.v.y;
    this.cell(m,g,w=>w.prism(f,piece,-t/2,t/2,{front,back,edge,cut:'core',top:part.top||edge},{front:this.tint(frontTint,cy),back:this.tint(backTint,cy),edge:this.tint(edgeTint,cy),top:this.tint(edgeTint,cy),cut:this.tint('core',cy)}));}
  }
 }
 // One wall bay with an optional opening. `opening`: {kind:'window'|'door'|'shop'|'arch'|'hole', w, h, sill}.
 wallBay(f,W,H,t,opening=null,style={},moduleOpts={}){
  const m=this.module(moduleOpts.kind||'wall',moduleOpts),parts=[];
  // Exposed wall ends (building corners, freestanding walls) keep their surface finish.
  const top=style.topEdge?'top':'cut',[endL,endR]=(style.ends||[false,false]).map(e=>e?'edge':'cut');
  if(!opening){parts.push({x0:0,y0:0,x1:W,y1:H,labels:['cut',endR,top,endL]});}
  else{
   const ow=Math.min(opening.w,W-.5),oh=Math.min(opening.h,H-(opening.sill||0)-.25),ox0=(W-ow)/2+(opening.offset||0),ox1=ox0+ow,oy0=opening.sill||0,oy1=oy0+oh,arch=opening.kind==='arch';
   parts.push({x0:0,y0:0,x1:ox0,y1:H,labels:['cut','edge',top,endL]},{x0:ox1,y0:0,x1:W,y1:H,labels:['cut',endR,top,'edge']});
   if(oy0>.05)parts.push({x0:ox0,y0:0,x1:ox1,y1:oy0,labels:['cut','cut','edge','cut']});
   if(arch){const r=ow/2,ys=oy1-r,cx=(ox0+ox1)/2,K=6,top=H;
    const hit=a=>{const c=Math.cos(a),s=Math.sin(a);let d=Infinity;if(c>1e-6)d=Math.min(d,(ox1-cx)/c);if(c<-1e-6)d=Math.min(d,(ox0-cx)/c);if(s>1e-6)d=Math.min(d,(top-ys)/s);return {x:cx+c*d,y:ys+s*d};};
    const corners=[[Math.atan2(top-ys,ox1-cx),{x:ox1,y:top}],[Math.atan2(top-ys,ox0-cx),{x:ox0,y:top}]];
    for(let k=0;k<K;k++){const a0=Math.PI*k/K,a1=Math.PI*(k+1)/K,poly=[{x:cx+Math.cos(a0)*r,y:ys+Math.sin(a0)*r,label:'cut'},{...hit(a0),label:'cut'}];for(const [ca,p] of corners)if(ca>a0&&ca<a1)poly.push({...p,label:'cut'});poly.push({...hit(a1),label:'cut'},{x:cx+Math.cos(a1)*r,y:ys+Math.sin(a1)*r,label:'edge'});parts.push({poly,cell:9});}
   }else if(H-oy1>.05)parts.push({x0:ox0,y0:oy1,x1:ox1,y1:H,labels:['edge','cut',style.topEdge?'top':'cut','cut']});
   m.opening={...opening,x0:ox0,x1:ox1,y0:oy0,y1:oy1};
  }
  this.panel(m,f,parts,t,style);if(opening)this.openingDecor(m,f,m.opening,t,style);return m;
 }
 atlasQuad(m,f,x0,y0,x1,y1,depth,key,opts={}){const p=[this.at(f,x0,y0,depth),this.at(f,x1,y0,depth),this.at(f,x1,y1,depth),this.at(f,x0,y1,depth)];return this.cell(m,null,w=>w.quad('atlas',p[0],p[1],p[2],p[3],this.tint(opts.tint||'atlas',y0+f.o.y,.1),atlasUV(key)),{decor:true,solid:false,anchor:opts.anchor??1.4,glass:opts.glass});}
 fixtureBox(m,f,x,y,d,half,mat,tint,opts={}){return this.cell(m,null,w=>{w.box(mat,this.at(f,x,y,d),half,[f.u,f.v,f.n],this.tint(tint,y+f.o.y,.05),opts.faces||{});
  // Optional atlas face (AC grilles, condensers) laid just proud of the box front.
  if(opts.atlasFront){const z=d+half[2]+.004,p=[this.at(f,x-half[0],y-half[1],z),this.at(f,x+half[0],y-half[1],z),this.at(f,x+half[0],y+half[1],z),this.at(f,x-half[0],y+half[1],z)];w.quad('atlas',p[0],p[1],p[2],p[3],this.tint('atlas',y+f.o.y,.05),atlasUV(opts.atlasFront));}},{decor:true,solid:opts.solid??false,anchor:opts.anchor??1.2});}
 openingDecor(m,f,o,t,style){
  const inset=-t*.12,w=o.x1-o.x0,cx=(o.x0+o.x1)/2;
  if(o.kind==='hole')return;
  if(o.kind==='window'||o.kind==='arch'){
   const key=o.atlas||this.pick(['grille','grille','shutters','broken']);const top=o.kind==='arch'?o.y1-w/2:o.y1;
   this.atlasQuad(m,f,o.x0,o.y0,o.x1,o.kind==='arch'?o.y1:top,inset,o.kind==='arch'?'arch':key,{glass:true});
   if(!o.noSill)this.fixtureBox(m,f,cx,o.y0-.05,t/2+.06,[w/2+.12,.06,.1],'concrete','trim');
   if(o.ac&&this.random()<o.ac)this.fixtureBox(m,f,cx+w*.25,o.y0-.42,t/2+.28,[.36,.24,.26],'paint',0xc9c3b3,{atlasFront:'ac',solid:true});
  }
  if(o.kind==='door')this.atlasQuad(m,f,o.x0,o.y0,o.x1,o.y1,inset,o.atlas||this.pick(['steelDoor','woodDoor']));
  if(o.kind==='shop'){this.atlasQuad(m,f,o.x0,o.y0,o.x1,o.y1,inset,o.atlas||this.pick(['shutter','openShop','shutter','garage']));
   if(o.sign)this.atlasQuad(m,f,o.x0-.1,o.y1+.04,o.x1+.1,o.y1+.04+Math.min(.62,w*.3),t/2+.05,o.sign,{anchor:2});
   if(o.awning){const a0=this.at(f,o.x0-.15,o.y1-.02,t/2),a1=this.at(f,o.x1+.15,o.y1-.02,t/2),b1=this.at(f,o.x1+.15,o.y1-.5,t/2+1.1),b0=this.at(f,o.x0-.15,o.y1-.5,t/2+1.1),c=this.tint(o.awning,3,.05);this.cell(m,null,wr=>{wr.quad('metal',a0,a1,b1,b0,c);wr.quad('metal',a1,a0,b0,b1,c);},{decor:true,solid:false,anchor:1.8});}
  }
 }
 // Horizontal slab tile, y..y+t; `edges` labels for [south(-z),east,north(+z),west].
 slab(x0,z0,x1,z1,y,t=SLAB,opts={}){
  const m=this.module(opts.kind||'slab',opts),f=this.frame(V(0,y+t/2,0),V(1,0,0),V(0,0,-1));
  // Panel coordinates are (x,-z); rectangle edges run south, east, north, west.
  const e=opts.edges||['cut','cut','cut','cut'];
  this.panel(m,f,[{x0,y0:-z1,x1,y1:-z0,labels:[e[2],e[1],e[0],e[3]],cell:opts.cell||1.6}],t,{front:opts.top||'roof',back:opts.bottom||'plaster',frontTint:opts.topTint||'roof',backTint:opts.bottomTint||'inner',edge:opts.edge||'concrete',edgeTint:opts.edgeTint||'trim'});
  return m;
 }
 column(x,z,y0,h,w=.4,opts={}){const m=this.module('column',opts),f=this.frame(V(x-w/2,y0,z),V(1,0,0));this.panel(m,f,[{x0:0,y0:0,x1:w,y1:h,labels:['cut','edge','cut','edge'],cell:opts.cell||1.1}],w,{front:opts.mat||'concrete',back:opts.mat||'concrete',frontTint:opts.tint||'concrete',backTint:opts.tint||'concrete',edge:opts.mat||'concrete'});return m;}
 // Frame for a bay on one side of a rectangular footprint, starting `along` metres from that side's start.
 sideFrame(fp,side,along,y0,t){const {x0,z0,x1,z1}=fp;
  if(side==='front')return this.frame(V(x0+along,y0,z1-t/2),V(1,0,0));
  if(side==='back')return this.frame(V(x1-along,y0,z0+t/2),V(-1,0,0));
  if(side==='right')return this.frame(V(x1-t/2,y0,z1-t-along),V(0,0,-1));
  return this.frame(V(x0+t/2,y0,z0+t+along),V(0,0,1));}
 sideLength(fp,side,t){return side==='front'||side==='back'?fp.x1-fp.x0:fp.z1-fp.z0-2*t;}
 // Rectangular storey shell. openingFor(side,floor,bay,bays,W) returns an opening spec or null.
 storey(fp,y0,H,t,openingFor,style={},bay=3.8,moduleOpts={}){
  const bays=[];for(const side of ['front','back','left','right']){const L=this.sideLength(fp,side,t),n=Math.max(1,Math.round(L/bay)),W=L/n;for(let i=0;i<n;i++){const f=this.sideFrame(fp,side,i*W,y0,t),full=side==='front'||side==='back';bays.push(this.wallBay(f,W,H,t,openingFor(side,i,n,W),{...style,ends:full?[i===0,i===n-1]:null},moduleOpts));}}return bays;}
 // Slab tiles over a footprint with overhang; interior tile edges are breakable cuts.
 floorSlab(fp,y,overhang=.15,tile=4,opts={}){const x0=fp.x0-overhang,x1=fp.x1+overhang,z0=fp.z0-overhang,z1=fp.z1+overhang,nx=Math.max(1,Math.round((x1-x0)/tile)),nz=Math.max(1,Math.round((z1-z0)/tile)),tiles=[];
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=x0+(x1-x0)*i/nx,b=x0+(x1-x0)*(i+1)/nx,c=z0+(z1-z0)*j/nz,d=z0+(z1-z0)*(j+1)/nz;tiles.push(this.slab(a,c,b,d,y,opts.t||SLAB,{...opts,edges:[j===0?'edge':'cut',i===nx-1?'edge':'cut',j===nz-1?'edge':'cut',i===0?'edge':'cut']}));}
  return tiles;}
 interiorColumns(fp,y0,h,spacing=4.2,w=.36,opts={}){const nx=Math.round((fp.x1-fp.x0)/spacing),nz=Math.round((fp.z1-fp.z0)/spacing),cols=[];for(let i=1;i<nx;i++)for(let j=1;j<nz;j++)cols.push(this.column(fp.x0+(fp.x1-fp.x0)*i/nx,fp.z0+(fp.z1-fp.z0)*j/nz,y0,h,w,opts));return cols;}
 parapet(fp,y0,h=.9,t=.2,style={},bay=3){const m=[];for(const side of ['front','back','left','right']){const L=this.sideLength(fp,side,t),n=Math.max(1,Math.round(L/bay)),W=L/n;const full=side==='front'||side==='back';for(let i=0;i<n;i++)m.push(this.wallBay(this.sideFrame(fp,side,i*W,y0,t),W,h,t,null,{...style,topEdge:true,cell:.9,ends:full?[i===0,i===n-1]:null},{kind:'parapet'}));}return m;}
 // Static, indestructible foundation plinth and ground-floor slab.
 foundation(fp,depth=.7,lip=.18,mat='concrete',tint='concrete'){const w=this.fixed,cx=(fp.x0+fp.x1)/2,cz=(fp.z0+fp.z1)/2,hx=(fp.x1-fp.x0)/2+lip,hz=(fp.z1-fp.z0)/2+lip;w.box(mat,V(cx,-depth/2+.06,cz),[hx,depth/2,hz],null,this.tint(tint,0),{top:'roof'});}
 // Roof clutter: water tanks on stands, satellite dishes and AC condensers.
 waterTank(m,x,y,z,r=.55,h=1.1,color=this.pick([0x2b2b2a,0x3d4a55,0xb8b4a8,0x4f6b4a])){for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])this.cell(m,null,w=>w.box('steel',V(x+dx*r*.7,y+.35,z+dz*r*.7),[.04,.35,.04],null,this.tint('steel',3)),{decor:true});return this.cell(m,null,w=>{w.cylinder('paint',V(x,y+.7,z),r,r,h,10,this.tint(color,3,.04));w.cylinder('paint',V(x,y+.7+h,z),r*.3,r*.3,.1,6,this.tint(color,3,.04));},{decor:true,solid:true,anchor:1.5});}
 dish(m,x,y,z,yaw=this.rand(0,6.28)){const dir=V(Math.sin(yaw),.55,Math.cos(yaw)).normalize(),c=V(x,y+.9,z);return this.cell(m,null,w=>{w.box('steel',V(x,y+.45,z),[.03,.45,.03],null,this.tint('steel',3));const rim=[],N=10;for(let i=0;i<N;i++){const a=i/N*Math.PI*2,side=V().crossVectors(dir,UP).normalize(),up=V().crossVectors(side,dir).normalize();rim.push(V().copy(c).addScaledVector(side,Math.cos(a)*.42).addScaledVector(up,Math.sin(a)*.42));}const back=V().copy(c).addScaledVector(dir,-.16),col=this.tint(0xd8d8d2,3,.03);for(let i=0;i<N;i++){w.tri('paint',back,rim[(i+1)%N],rim[i],col);w.tri('paint',back,rim[i],rim[(i+1)%N],col);}},{decor:true,anchor:1.2});}
 condenser(m,x,y,z,yaw=0){const f=this.frame(V(x,y,z),V(Math.cos(yaw),0,-Math.sin(yaw)));return this.fixtureBox(m,f,0,.35,0,[.45,.35,.3],'paint',0xc9c3b3,{atlasFront:'ac',solid:true});}
 // Hemispherical dome ring modules; each ring is split into segment cells.
 dome(cx,y0,cz,R,rings=4,segs=12,t=.28,opts={}){
  const out=[];let below=opts.supports||null;
  for(let r=0;r<rings;r++){const m=this.module('shell',{supports:below,rigid:null,tag:'dome'}),p0=Math.PI/2*r/rings,p1=Math.PI/2*(r+1)/rings,last=r===rings-1;
   for(let s=0;s<(last?1:segs);s++){const a0=Math.PI*2*s/segs,a1=Math.PI*2*(s+1)/segs;
    this.cell(m,this.group(m),w=>{const steps=last?segs:1;for(let k=0;k<steps;k++){const b0=last?Math.PI*2*k/segs:a0,b1=last?Math.PI*2*(k+1)/segs:a1;
      const P=(phi,th,rad)=>V(cx+Math.cos(th)*Math.cos(phi)*rad,y0+Math.sin(phi)*rad,cz+Math.sin(th)*Math.cos(phi)*rad),o=[P(p0,b0,R),P(p0,b1,R),P(p1,b1,R),P(p1,b0,R)],i=[P(p0,b0,R-t),P(p0,b1,R-t),P(p1,b1,R-t),P(p1,b0,R-t)];
      const tileC=this.tint(opts.tint||'tile',6,.05),inC=this.tint('inner',6),coreC=this.tint('core',6),N=q=>V().copy(q).sub(V(cx,y0,cz)).normalize();
      const scale=1.6,uv=q=>{const d=N(q);return [Math.atan2(d.z,d.x)*R/scale,Math.asin(Math.min(1,d.y))*R/scale];};
      if(last){w.tri(opts.mat||'tile',o[0],P(Math.PI/2,0,R),o[1],tileC,[uv(o[0]),uv(P(Math.PI/2,0,R)),uv(o[1])],[N(o[0]),UP,N(o[1])]);w.tri('plaster',i[0],i[1],P(Math.PI/2,0,R-t),inC);}
      else{w.tri(opts.mat||'tile',o[0],o[2],o[1],tileC,[uv(o[0]),uv(o[2]),uv(o[1])],[N(o[0]),N(o[2]),N(o[1])]);w.tri(opts.mat||'tile',o[0],o[3],o[2],tileC,[uv(o[0]),uv(o[3]),uv(o[2])],[N(o[0]),N(o[3]),N(o[2])]);w.quad('plaster',i[0],i[1],i[2],i[3],inC);
       w.quad('core',i[0],o[0],o[1],i[1],coreC);w.quad('core',o[3],i[3],i[2],o[2],coreC);if(!last&&s>=0){w.quad('core',i[1],o[1],o[2],i[2],coreC);w.quad('core',o[0],i[0],i[3],o[3],coreC);}}}},{});}
   out.push(m);below=[m];}
  return out;}
 // Cylindrical drum segment split into wedge cells (minarets, round towers).
 drum(cx,y0,cz,r,h,wedges=4,opts={}){const m=this.module(opts.kind||'shell',opts);for(let k=0;k<wedges;k++){const a0=Math.PI*2*k/wedges,a1=Math.PI*2*(k+1)/wedges;this.cell(m,this.group(m),w=>w.cylinder(opts.mat||'brick',V(cx,y0,cz),r,opts.r1??r,h,Math.max(2,Math.round(12/wedges)),this.tint(opts.tint||'brick',y0),'core',a0,a1));}return m;}
}
