import * as THREE from 'three';

// Breakable building geometry. Every visible piece is a "cell": a small convex solid
// whose triangles live in a per-material batch, so a whole building renders in a
// handful of draw calls while any cell can still be hidden and thrown as debris.

export const MATERIAL_SCALE={plaster:4.2,brick:1.1,concrete:3.2,roof:4,core:1.4,tile:1.6,metal:2.2,wood:1.4,paint:1,steel:1,atlas:1};

// Keep points where nx*x+ny*y <= d. Vertex labels describe the edge that leaves the
// vertex, so new edges along the clip line are marked as fresh 'cut' faces.
export function clipPolygon(poly,nx,ny,d,label='cut'){
 const out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=nx*a.x+ny*a.y-d,db=nx*b.x+ny*b.y-d;
  if(da<=0){out.push({x:a.x,y:a.y,label:a.label});if(db>0){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,label});}}
  else if(db<=0){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,label:a.label});}
 }
 return out.filter((p,i)=>{const q=out[(i+1)%out.length];return out.length<2||Math.hypot(p.x-q.x,p.y-q.y)>1e-5;});
}
export function polygonArea(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y;}return a/2;}
export function rectPolygon(x0,y0,x1,y1,labels=['edge','edge','edge','edge']){return [{x:x0,y:y0,label:labels[0]},{x:x1,y:y0,label:labels[1]},{x:x1,y:y1,label:labels[2]},{x:x0,y:y1,label:labels[3]}];}

// Voronoi fracture of a convex polygon with jittered-grid seeds sized near `cell`.
export function fracturePolygon(poly,cell,random=Math.random){
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of poly){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
 const w=x1-x0,h=y1-y0,nx=Math.max(1,Math.round(w/cell)),ny=Math.max(1,Math.round(h/cell));
 if(nx*ny===1)return [poly];
 const seeds=[];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)seeds.push({x:x0+(i+.5+(random()-.5)*.7)*w/nx,y:y0+(j+.5+(random()-.5)*.7)*h/ny});
 const cells=[];
 for(const s of seeds){let c=poly;for(const o of seeds){if(o===s)continue;c=clipPolygon(c,o.x-s.x,o.y-s.y,(o.x*o.x+o.y*o.y-s.x*s.x-s.y*s.y)/2);if(c.length<3)break;}if(c.length>=3&&polygonArea(c)>1e-3)cells.push(c);}
 return cells;
}

const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_c=new THREE.Vector3(),_n=new THREE.Vector3();
export function boxUV(p,n,scale){const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);if(ay>=ax&&ay>=az)return [p.x/scale,p.z/scale];if(ax>=az)return [p.z/scale,p.y/scale];return [p.x/scale,p.y/scale];}

// Accumulates non-indexed triangles per material; begin/end brackets one cell.
export class MeshWriter {
 constructor(){this.data=new Map();this.cell=null;}
 buffer(mat){let b=this.data.get(mat);if(!b){b={p:[],n:[],uv:[],c:[]};this.data.set(mat,b);}return b;}
 begin(){this.cell={start:new Map(),hull:[]};for(const [mat,b] of this.data)this.cell.start.set(mat,b.p.length/3);return this;}
 end(){const ranges=[];for(const [mat,b] of this.data){const start=this.cell.start.get(mat)||0,count=b.p.length/3-start;if(count>0)ranges.push({mat,start,count});}const seen=new Set(),hull=[],h=this.cell.hull;for(let i=0;i<h.length;i+=3){const key=`${Math.round(h[i]*200)},${Math.round(h[i+1]*200)},${Math.round(h[i+2]*200)}`;if(seen.has(key))continue;seen.add(key);hull.push(h[i],h[i+1],h[i+2]);}this.cell=null;return {ranges,hull:new Float32Array(hull)};}
 // Triangle with a flat normal and box-projected or explicit UVs.
 tri(mat,a,b,c,color,uvs=null,normals=null){
  const buf=this.buffer(mat),scale=MATERIAL_SCALE[mat]||1,n=normals?null:_n.subVectors(b,a).cross(_c.subVectors(c,a)).normalize();
  const pts=[a,b,c];for(let i=0;i<3;i++){const p=pts[i],nn=normals?normals[i]:n;buf.p.push(p.x,p.y,p.z);buf.n.push(nn.x,nn.y,nn.z);const uv=uvs?uvs[i]:boxUV(p,nn,scale);buf.uv.push(uv[0],uv[1]);buf.c.push(color[0],color[1],color[2]);if(this.cell)this.cell.hull.push(p.x,p.y,p.z);}
 }
 quad(mat,a,b,c,d,color,uvs=null){this.tri(mat,a,b,c,color,uvs&&[uvs[0],uvs[1],uvs[2]]);this.tri(mat,a,c,d,color,uvs&&[uvs[0],uvs[2],uvs[3]]);}
 // Convex polygon prism in a (u,v,n) frame. faces: {front,back,edge,cut} material keys.
 prism(frame,poly,t0,t1,faces,colors){
  if(polygonArea(poly)<0){poly=[...poly].reverse();const labels=poly.map(p=>p.label);poly=poly.map((p,i)=>({x:p.x,y:p.y,label:labels[(i+1)%poly.length]}));}
  const {o,u,v,n}=frame,P=(p,t)=>new THREE.Vector3().copy(o).addScaledVector(u,p.x).addScaledVector(v,p.y).addScaledVector(n,t);
  const front=poly.map(p=>P(p,t1)),back=poly.map(p=>P(p,t0));
  for(let i=1;i<poly.length-1;i++){this.tri(faces.front,front[0],front[i],front[i+1],colors.front);this.tri(faces.back,back[0],back[i+1],back[i],colors.back);}
  for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length,cut=poly[i].label==='cut';this.quad(cut?faces.cut:(faces[poly[i].label]||faces.edge),back[i],back[j],front[j],front[i],cut?colors.cut:(colors[poly[i].label]||colors.edge));}
 }
 // Oriented box from centre, half extents and basis; faces default to one material.
 box(mat,center,half,basis=null,color,faces={}){
  const [ux,uy,uz]=basis||[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
  const corner=(sx,sy,sz)=>new THREE.Vector3().copy(center).addScaledVector(ux,sx*half[0]).addScaledVector(uy,sy*half[1]).addScaledVector(uz,sz*half[2]);
  const c=[corner(-1,-1,-1),corner(1,-1,-1),corner(1,1,-1),corner(-1,1,-1),corner(-1,-1,1),corner(1,-1,1),corner(1,1,1),corner(-1,1,1)];
  const q=(key,a,b,cc,d)=>this.quad(faces[key]||mat,c[a],c[b],c[cc],c[d],color);
  q('back',1,0,3,2);q('front',4,5,6,7);q('left',0,4,7,3);q('right',5,1,2,6);q('top',3,7,6,2);q('bottom',0,1,5,4);
 }
 // Capped cylinder/cone frustum along +Y from a base centre.
 cylinder(mat,base,r0,r1,h,segments,color,capMat=mat,a0=0,a1=Math.PI*2){
  const full=Math.abs(a1-a0-Math.PI*2)<1e-6,pts=[];for(let i=0;i<=segments;i++){const a=a0+(a1-a0)*i/segments;pts.push([Math.cos(a),Math.sin(a)]);}
  const top=new THREE.Vector3(base.x,base.y+h,base.z),slope=(r0-r1)/h;
  for(let i=0;i<segments;i++){const [c0,s0]=pts[i],[c1,s1]=pts[i+1],b0=new THREE.Vector3(base.x+c0*r0,base.y,base.z+s0*r0),b1=new THREE.Vector3(base.x+c1*r0,base.y,base.z+s1*r0),t0=new THREE.Vector3(top.x+c0*r1,top.y,top.z+s0*r1),t1=new THREE.Vector3(top.x+c1*r1,top.y,top.z+s1*r1);
   const n0=new THREE.Vector3(c0,slope,s0).normalize(),n1=new THREE.Vector3(c1,slope,s1).normalize(),u0=(a0+(a1-a0)*i/segments)*r0/(MATERIAL_SCALE[mat]||1),u1=(a0+(a1-a0)*(i+1)/segments)*r0/(MATERIAL_SCALE[mat]||1),vs=h/(MATERIAL_SCALE[mat]||1),vb=base.y/(MATERIAL_SCALE[mat]||1);
   this.tri(mat,b0,t1,b1,color,[[u0,vb],[u1,vb+vs],[u1,vb]],[n0,n1,n1]);this.tri(mat,b0,t0,t1,color,[[u0,vb],[u0,vb+vs],[u1,vb+vs]],[n0,n0,n1]);
   if(r1>1e-4)this.tri(capMat,top,t1,t0,color);if(r0>1e-4)this.tri(capMat,base,b0,b1,color);}
  if(!full)for(const k of [0,segments]){const [c,s]=pts[k],b=new THREE.Vector3(base.x+c*r0,base.y,base.z+s*r0),t=new THREE.Vector3(top.x+c*r1,top.y,top.z+s*r1);if(k===0)this.quad(capMat,base,top,t,b,color);else this.quad(capMat,base,b,t,top,color);}
 }
 build(){const out=new Map();for(const [mat,b] of this.data){if(!b.p.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));g.computeBoundingSphere();g.computeBoundingBox();out.set(mat,g);}return out;}
}

// Copies cell triangles out of batched geometries into one local-space geometry
// with material groups, centred on `center` (for a thrown or falling body).
export function extractCells(geometries,cells,center,materials){
 const byMat=new Map();for(const cell of cells)cell.ranges.forEach((r,i)=>{if(!byMat.has(r.mat))byMat.set(r.mat,[]);byMat.get(r.mat).push({...r,saved:cell.saved?.[i]});});
 let total=0;for(const ranges of byMat.values())for(const r of ranges)total+=r.count;
 const p=new Float32Array(total*3),n=new Float32Array(total*3),uv=new Float32Array(total*2),c=new Float32Array(total*3),geometry=new THREE.BufferGeometry(),mats=[];let o=0;
 for(const [mat,ranges] of byMat){const g=geometries.get(mat),start=o;for(const r of ranges){const sp=g.attributes.position.array,sn=g.attributes.normal.array,su=g.attributes.uv.array,sc=g.attributes.color.array;
   for(let i=0;i<r.count;i++){const s=r.start+i,d=o+i,src=r.saved||sp,k=r.saved?i:s;p[d*3]=src[k*3]-center.x;p[d*3+1]=src[k*3+1]-center.y;p[d*3+2]=src[k*3+2]-center.z;n[d*3]=sn[s*3];n[d*3+1]=sn[s*3+1];n[d*3+2]=sn[s*3+2];uv[d*2]=su[s*2];uv[d*2+1]=su[s*2+1];c[d*3]=sc[s*3];c[d*3+1]=sc[s*3+1];c[d*3+2]=sc[s*3+2];}o+=r.count;}
  geometry.addGroup(start,o-start,mats.length);mats.push(materials[mat]);}
 geometry.setAttribute('position',new THREE.BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.BufferAttribute(n,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.BufferAttribute(c,3));geometry.computeBoundingSphere();
 return {geometry,materials:mats};
}
// Collapses a cell's triangles to a point so the batch no longer draws it.
export function hideCell(geometries,cell){if(cell.saved)return;cell.saved=[];for(const r of cell.ranges){const attr=geometries.get(r.mat).attributes.position,a=attr.array,s=r.start*3;cell.saved.push(a.slice(s,s+r.count*3));const x=a[s],y=a[s+1],z=a[s+2];for(let i=1;i<r.count;i++){a[s+i*3]=x;a[s+i*3+1]=y;a[s+i*3+2]=z;}attr.addUpdateRange(s,r.count*3);attr.needsUpdate=true;}}
// Reduces a hull point cloud to at most `max` extreme points for convex colliders.
export function compactHull(points,max=48){if(points.length/3<=max)return points;const out=[],step=points.length/3/max;for(let i=0;i<max;i++){const k=Math.floor(i*step)*3;out.push(points[k],points[k+1],points[k+2]);}
 // Always keep the axis extremes so the collider bounds match the visible cell.
 for(let axis=0;axis<3;axis++){let lo=0,hi=0;for(let i=0;i<points.length;i+=3){if(points[i+axis]<points[lo+axis])lo=i;if(points[i+axis]>points[hi+axis])hi=i;}out.push(points[lo],points[lo+1],points[lo+2],points[hi],points[hi+1],points[hi+2]);}
 return new Float32Array(out);}
