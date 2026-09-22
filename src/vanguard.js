import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {trackLoop,band,flatten,batch} from './tank-geometry.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),UP=V(0,1,0);
// Vanguard: the balanced medium tank "217" of concept-art/02-garage-loadout.png (supporting angles in
// 01-main-menu and 06-match-results). Welded slab hull with a steep glacis, bucket headlamps in bar
// guards, a lower nose carrying tow shackles, angled front mud guards and full-length track guards with
// stowage. Five big rubber-tyred road wheels, a raised front drive sprocket, a rear idler, return rollers
// and cast steel link track. Boxy bolted turret with faceted cheeks, a box mantlet with a round collar,
// a long 76 mm gun, commander cupola with a 12.7 mm HMG, smoke dischargers and a rear stowage bin.
// Both detail levels share every pivot, the muzzle and the exhausts; the showroom build adds the
// individual track links, lathe-turned wheels, weld beads, bolts, tools, cables and glass.
export function createVanguard(materials,enemy=false,detail='low'){
 const high=detail==='high',segments=high?32:10,root=new THREE.Group(),body=new THREE.Group(),turret=new THREE.Group(),gun=new THREE.Group(),wheels=[],exhausts=[];
 root.name='Vanguard';root.userData.detail=detail;root.add(body);body.position.y=-.2;
 const m=vanguardMaterials(materials,enemy,high),{armor}=m;
 const add=(parent,geo,mat,x=0,y=0,z=0)=>{if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(p,mat,x,y,z,w,h,d,r=.018)=>add(p,high&&r>0&&Math.min(w,h,d)>r*2.2?new RoundedBoxGeometry(w,h,d,1,r):new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const axisGeo=(geo,axis)=>{if(axis==='x')geo.rotateZ(-Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);return geo;};
 const cyl=(p,mat,x,y,z,r,h,axis='y',top=r,sides=segments)=>add(p,axisGeo(new THREE.CylinderGeometry(top,r,h,sides),axis),mat,x,y,z);
 const ring=(p,mat,x,y,z,r,t,axis='z',sides=segments)=>{const geo=new THREE.TorusGeometry(r,t,high?8:4,sides);if(axis==='x')geo.rotateY(Math.PI/2);if(axis==='y')geo.rotateX(Math.PI/2);return add(p,geo,mat,x,y,z);};
 // Lathe profiles are [radius, axial] pairs; the axial coordinate runs along +axis.
 const lathe=(p,mat,profile,axis,x,y,z,sides=segments)=>add(p,axisGeo(new THREE.LatheGeometry(profile.map(([r,a])=>new THREE.Vector2(r,a)),sides),axis),mat,x,y,z);
 const orient=(mesh,dir)=>{mesh.quaternion.setFromUnitVectors(UP,dir.clone().normalize());return mesh;};
 // Hollow tube open at b: outer wall and rim in mat, a dark bore of the given depth, so openings read as holes.
 const pipe=(p,mat,a,b,rOut,rIn,depth,sides=segments)=>{const from=V(...a),delta=V(...b).sub(from),L=delta.length(),d=Math.min(depth,L*.95);
  for(const mesh of [lathe(p,mat,[[0,0],[rOut,0],[rOut,L],[rIn,L]],'y',0,0,0,sides),lathe(p,m.bore,[[rIn,L],[rIn,L-d],[0,L-d]],'y',0,0,0,sides)]){mesh.position.copy(from);orient(mesh,delta);}};
 const rod=(p,mat,a,b,r=.02,sides=high?10:5)=>{const from=V(...a),to=V(...b),delta=to.clone().sub(from),mesh=add(p,new THREE.CylinderGeometry(r,r,delta.length(),sides),mat);mesh.position.copy(from).addScaledVector(delta,.5);return orient(mesh,delta);};
 const convex=(p,mat,points)=>add(p,new ConvexGeometry(points),mat);
 const mirror=points=>points.flatMap(([x,y,z])=>[V(x,y,z),V(-x,y,z)]);
 const tube=(p,mat,points,r,closed=false,steps=points.length*8)=>add(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(q=>V(...q)),closed),steps,r,high?8:4,closed),mat);
 // A frame on a facet: u reads left to right for a viewer facing it, v climbs the facet, n faces out.
 const frame=(center,normal,up=UP)=>{const n=normal.clone().normalize(),v=up.clone().addScaledVector(n,-up.dot(n)).normalize();return {c:center.clone(),u:new THREE.Vector3().crossVectors(v,n),v,n};};
 const at=(f,du,dv,dn=0)=>f.c.clone().addScaledVector(f.u,du).addScaledVector(f.v,dv).addScaledVector(f.n,dn);
 const place=(mesh,f)=>{mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.u,f.v,f.n));return mesh;};
 // Raised plate lying on a facet, its back face flush with the facet.
 const plate=(p,mat,f,du,dv,w,h,d=.03,r=.012)=>{const q=at(f,du,dv,d/2);return place(box(p,mat,q.x,q.y,q.z,w,h,d,r),f);};
 const boltGeo=high?new THREE.CylinderGeometry(.021,.024,.022,6):null;
 const bolt=(p,q,n,mat=m.bolt)=>{if(!high)return;const mesh=add(p,boltGeo.clone(),mat);mesh.position.copy(q).addScaledVector(n,.008);orient(mesh,n);mesh.rotateY(q.x*37+q.z*11);};
 const bolts=(p,f,a,b,count,dn=0)=>{if(!high)return;for(let i=0;i<count;i++){const t=count>1?i/(count-1):.5;bolt(p,at(f,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,dn),f.n);}};
 const frameBolts=(p,f,w,h,step=.16,dn=0,inset=.04)=>{const nx=Math.max(2,Math.round(w/step)+1),ny=Math.max(2,Math.round(h/step)+1),x=w/2-inset,y=h/2-inset;bolts(p,f,[-x,-y],[x,-y],nx,dn);bolts(p,f,[-x,y],[x,y],nx,dn);bolts(p,f,[-x,-y+h/(ny-1)],[-x,y-h/(ny-1)],ny-2,dn);bolts(p,f,[x,-y+h/(ny-1)],[x,y-h/(ny-1)],ny-2,dn);};
 // Weld beads: a rippled tube laid along a seam.
 const weld=(p,points,r=.014)=>{if(!high)return;const curve=new THREE.CatmullRomCurve3(points.map(q=>V(...q))),steps=Math.max(8,Math.round(curve.getLength()/.012)),geo=new THREE.TubeGeometry(curve,steps,r,5,false),pos=geo.attributes.position,centre=V(),q=V();
  for(let i=0;i<=steps;i++){curve.getPointAt(i/steps,centre);const ripple=.72+.28*Math.abs(Math.sin(i*1.7));for(let j=0;j<=5;j++){const k=i*6+j;q.fromBufferAttribute(pos,k).sub(centre).multiplyScalar(ripple).add(centre);pos.setXYZ(k,q.x,q.y,q.z);}}
  geo.computeVertexNormals();add(p,geo,m.weld);};
 // Headlamp: bucket housing, chrome reflector ring, emissive lens and, in the showroom, a bar guard.
 const lamp=(p,x,y,z,dir,r,lens,guard=true)=>{const g=new THREE.Group();g.position.set(x,y,z);g.lookAt(x+dir.x,y+dir.y,z+dir.z);p.add(g);
  lathe(g,m.lampBody,[[0,-r*1.35],[r*.55,-r*1.3],[r*.95,-r*.8],[r*1.08,-r*.1],[r*1.12,0],[r*1.12,r*.12]],'z',0,0,0);
  if(high){ring(g,m.chrome,0,0,r*.1,r*1.02,r*.1,'z');}
  const disc=add(g,new THREE.CircleGeometry(r*.92,segments),lens,0,0,r*.13);disc.castShadow=false;
  if(high&&guard){for(const a of [-.5,.5]){const bar=new THREE.CatmullRomCurve3([V(-r*1.35,a*r*1.3,-r*.4),V(-r*1.25,a*r*1.3,r*.9),V(0,a*r*1.3,r*1.25),V(r*1.25,a*r*1.3,r*.9),V(r*1.35,a*r*1.3,-r*.4)]);add(g,new THREE.TubeGeometry(bar,20,.011,6,false),m.fitting);}
   rod(g,m.fitting,[0,-r*1.3,r*1.25],[0,r*1.3,r*1.25],.011);}
  cyl(g,m.fitting,0,-r*1.2,-r*.55,r*.35,r*.7,'y',r*.3);flatten(g);};

 // ---------------------------------------------------------------- hull
 // Upper superstructure over the tracks and the narrower lower tub share one steep glacis plane.
 const D=.72,glacisAt=y=>1.18+(D-y)/.643,W=1.3;
 convex(body,armor,mirror([[W,.30,-1.97],[W,D-.06,-1.97],[W-.06,D,-1.91],[W-.06,D,1.18],[W,D-.06,glacisAt(D-.06)],[W,.30,glacisAt(.30)]]));
 convex(body,armor,mirror([[.97,.30,-1.94],[.97,-.08,-1.98],[.97,-.39,-1.78],[.93,-.45,-1.7],[.93,-.45,1.74],[.97,-.39,1.8],[.97,.08,2.02],[.97,.30,glacisAt(.30)]]));
 const glacis=frame(V(0,.4,glacisAt(.4)),V(0,1,.643));
 const nose=frame(V(0,-.155,1.91),V(0,-.47,1)),rearPlate=frame(V(0,.25,-1.975),V(0,0,-1));
 if(high){
  // Seam welds where the glacis meets the sponsons, the nose and the rear plate.
  for(const s of [-1,1]){weld(body,[[s*(W-.02),D-.02,1.2],[s*W,.3,glacisAt(.3)]]);weld(body,[[s*.97,.3,glacisAt(.3)],[s*.97,.08,2.02],[s*.97,-.39,1.8]]);weld(body,[[s*W,.3,-1.975],[s*W,D-.06,-1.975]]);}
  weld(body,[[-.96,.08,2.025],[.96,.08,2.025]]);weld(body,[[-W+.06,D+.005,1.18],[W-.06,D+.005,1.18]],.012);weld(body,[[-.96,-.1,-1.985],[.96,-.1,-1.985]]);
 }
 // Glacis furniture: driver's vision block, bolted inspection plate, lifting eyes and a stowed pry bar.
 const visor=frame(at(glacis,-.42,.22),glacis.n,glacis.v);
 plate(body,m.plate,visor,0,0,.46,.2,.1,.025);plate(body,m.plate,visor,0,.02,.38,.07,.13,.012);plate(body,m.glass,visor,0,.02,.3,.035,.137,0);
 plate(body,m.plate,glacis,.45,.2,.4,.3,.025,.01);frameBolts(body,frame(at(glacis,.45,.2),glacis.n,glacis.v),.4,.3,.12,.025);
 plate(body,m.plate,glacis,0,-.3,1.7,.05,.018,0);
 if(high){bolts(body,glacis,[-1.2,.5],[1.2,.5],13);bolts(body,glacis,[-.88,-.53],[.88,-.53],10);for(const s of [-1,1])bolts(body,glacis,[s*1.22,.02],[s*1.22,.42],4);for(const s of [-1,1]){const q=at(glacis,s*.95,.4,.03);ring(body,m.fitting,q.x,q.y,q.z,.045,.012,'x');}
  const barA=at(glacis,-.7,-.16,.04),barB=at(glacis,.7,-.16,.04);rod(body,m.tool,barA.toArray(),barB.toArray(),.018);for(const s of [-.5,.5]){plate(body,m.fitting,glacis,s,-.16,.05,.07,.05,0);}}
 // Headlamps in bar guards at the glacis corners, a blackout marker between them.
 for(const s of [-1,1]){const y=.5,z=glacisAt(y)+.04;cyl(body,m.fitting,s*1.02,y-.02,z-.03,.03,.14,'z');lamp(body,s*1.02,y+.05,z+.07,V(0,-.05,1),.095,m.lens);}
 lamp(body,.66,.34,glacisAt(.34)+.07,V(0,-.1,1),.04,m.marker,false);
 // Lower nose: reinforcing strap, tow brackets and U shackles (hanging chains in the showroom).
 plate(body,m.plate,nose,0,.12,1.9,.07,.025,.01);
 for(const s of [-1,1]){const q=at(nose,s*.62,.02,.05);plate(body,m.plate,frame(at(nose,s*.62,.02),nose.n),0,0,.2,.2,.08,.02);
  for(const dx of [-.07,.07])plate(body,m.fitting,frame(at(nose,s*.62+dx,-.02),nose.n),0,0,.035,.22,.16,0);
  const sh=new THREE.Group();sh.position.copy(q).addScaledVector(nose.n,.1).add(V(0,-.08,0));body.add(sh);
  const u=new THREE.TorusGeometry(.075,.02,high?8:4,high?16:6,Math.PI);u.rotateZ(Math.PI);add(sh,u,m.chain,0,-.05,0);rod(sh,m.chain,[-.075,-.05,0],[-.075,.07,0],.02);rod(sh,m.chain,[.075,-.05,0],[.075,.07,0],.02);rod(sh,m.chain,[-.12,.07,0],[.12,.07,0],.018);
  flatten(sh);
  if(high){bolts(body,frame(at(nose,s*.62,.02,.08),nose.n),[-.07,-.07],[.07,-.07],2);bolts(body,frame(at(nose,s*.62,.02,.08),nose.n),[-.07,.07],[.07,.07],2);}}
 if(high)frameBolts(body,nose,1.86,.5,.18);

 // Track guards, stepped front mud guards, rear flaps and the bolted sponson side panels.
 for(const s of [-1,1]){
  box(body,armor,s*1.33,.29,-.21,.66,.04,3.62,.01);box(body,m.plate,s*1.655,.265,-.21,.03,.09,3.62,.008);
  convex(body,armor,[V(s*1.0,.31,1.6),V(s*1.66,.31,1.6),V(s*1.0,.27,2.03),V(s*1.66,.27,2.03),V(s*1.0,.27,1.6),V(s*1.66,.27,1.6),V(s*1.0,.31,2.03),V(s*1.66,.31,2.03)]);
  const guardTop=V(s*1.33,.29,2.03),guardLow=V(s*1.33,-.02,2.3),mid=guardTop.clone().lerp(guardLow,.5),dir=guardLow.clone().sub(guardTop);
  const g=box(body,armor,mid.x,mid.y,mid.z,.66,dir.length()+.03,.04,.012);orient(g,dir);
  const lip=box(body,m.plate,s*1.655,mid.y+.04,mid.z-.03,.03,dir.length()*.8,.2,.008);orient(lip,dir);
  const flap=box(body,armor,s*1.33,.23,-2.1,.66,.13,.04,.01);flap.rotation.x=-.5;
  const side=frame(V(s*W,.515,-.2),V(s,0,0));
  for(const [dz,w] of [[-1.12,1.2],[.12,1.2],[.98,.52]]){const pf=frame(at(side,s*-dz,0),side.n);plate(body,m.plate,pf,0,0,w-.03,.31,.022,.008);frameBolts(body,pf,w-.03,.31,.14,.022);}
  if(high){weld(body,[[s*1.0,.31,-2.0],[s*1.0,.31,1.58]],.01);}
 }

 // Engine deck: louvred grilles, a bolted access hatch and the air intake behind the turret.
 const deck=frame(V(0,D,-1.42),UP,V(0,0,1));
 for(const s of [-1,1]){plate(body,m.plate,deck,s*.55,0,.74,.8,.03,.01);plate(body,m.dark,deck,s*.55,0,.62,.68,.035,0);
  const n=high?11:5;for(let i=0;i<n;i++){const q=at(deck,s*.55,-.3+i*.6/(n-1),.05),l=box(body,m.plate,q.x,q.y,q.z,.62,.012,.055,0);l.rotation.x=-.6;}
  if(high){frameBolts(body,frame(at(deck,s*.55,0),UP,V(0,0,1)),.74,.8,.12,.03);}}
 plate(body,m.plate,deck,0,.52,1.5,.2,.05,.012);if(high){for(const x of [-.5,-.17,.17,.5])plate(body,m.dark,deck,x,.52,.25,.06,.052,0);frameBolts(body,frame(at(deck,0,.52),UP,V(0,0,1)),1.5,.2,.18,.05);}
 // Rear plate: mufflers with heat shields and outlets, tail lamps, tow pintle, hooks and jerry cans.
 for(const s of [-1,1]){const x=s*.78,z=-2.1;lathe(body,m.soot,[[0,.12],[.1,.12],[.12,.15],[.12,.57],[.1,.6],[.05,.61],[0,.61]],'y',x,0,z);
  for(const y of [.22,.5]){ring(body,m.fitting,x,y,z,.123,.012,'y');box(body,m.fitting,x,y,z+.1,.05,.04,.06,0);}
  if(high){const shield=new THREE.CylinderGeometry(.14,.14,.34,24,1,true,Math.PI*.6,Math.PI*.8);add(body,shield,m.gear,x,.36,z).material.side=THREE.DoubleSide;for(let k=0;k<5;k++)for(let a=0;a<4;a++){const t=Math.PI*(.68+a*.2),hole=cyl(body,m.dark,x+Math.sin(t)*.141,.24+k*.06,z+Math.cos(t)*.141,.012,.004,'y');hole.quaternion.setFromUnitVectors(UP,V(Math.sin(t),0,Math.cos(t)));}}
  const top=V(x,.6,z),end=V(x+s*.05,.74,z-.08);pipe(body,m.soot,top.toArray(),end.toArray(),.045,.033,.12);
  const e=new THREE.Object3D();e.name='exhaust';e.position.copy(end).addScaledVector(end.clone().sub(top).normalize(),.03);body.add(e);exhausts.push(e);
  const tl=frame(V(s*1.1,.53,-1.975),V(0,0,-1));plate(body,m.fitting,tl,0,0,.12,.16,.06,.012);lamp(body,s*1.1,.54,-2.04,V(0,0,-1),.042,m.tail,false);if(high){rod(body,m.fitting,[s*1.03,.63,-2.05],[s*1.17,.63,-2.05],.01);}}
 plate(body,m.plate,rearPlate,0,.35,2.5,.06,.02,0);box(body,m.fitting,0,-.2,-1.96,.2,.14,.1,.02);ring(body,m.chain,0,-.24,-2.03,.06,.018,'x');
 for(const s of [-1,1]){box(body,m.fitting,s*.8,-.05,-2.02,.12,.1,.1,.02);ring(body,m.chain,s*.8,-.1,-2.08,.05,.016,'x');}
 if(high){bolts(body,rearPlate,[-1.22,.4],[1.22,.4],14);bolts(body,rearPlate,[-.9,-.27],[.9,-.27],9);}
 for(const [x,color] of [[-.52,m.can],[-.28,m.canRed]]){box(body,color,x,.63,-2.05,.21,.33,.13,.02);if(high){box(body,m.fitting,x,.82,-2.05,.12,.035,.035,0);for(const r of [-.55,.55]){const c=box(body,m.dark,x,.63,-2.117,.2,.018,.004,0);c.rotation.z=r;}}}box(body,m.fitting,-.4,.5,-2.01,.52,.03,.06,0);
 // Bolted rear access hatch between the mufflers.
 plate(body,m.plate,rearPlate,-.3,.02,.46,.34,.03,.015);if(high){frameBolts(body,frame(at(rearPlate,-.3,.02),rearPlate.n),.46,.34,.1,.03);box(body,m.fitting,.3,.3,-2.03,.16,.03,.03,0);}

 // Fender stowage: bins with lids and hasps, tools, tow cable, fire extinguisher and a spare link set.
 for(const s of [-1,1]){
  for(const z of [-1.62,-1.12,-.62]){box(body,m.bin,s*1.48,.48,z,.31,.34,.46,.02);box(body,m.plate,s*1.48,.665,z,.33,.03,.48,.01);
   if(high){for(const dz of [-.12,.12])box(body,m.fitting,s*1.638,.59,z+dz,.012,.07,.04,0);for(const dz of [-.2,.2])box(body,m.dark,s*1.48,.48,z+dz,.32,.3,.006,0);}}
  if(s>0){// Shovel and pick lashed on the left guard, clamps on the handles.
   rod(body,m.wood,[s*1.44,.34,.1],[s*1.44,.34,1.2],.02);const blade=box(body,m.tool,s*1.44,.33,1.36,.2,.02,.28,.008);
   rod(body,m.wood,[s*1.56,.35,-.3],[s*1.56,.35,.9],.022);box(body,m.tool,s*1.56,.35,.92,.06,.05,.42,.01);blade.rotation.y=0;
   if(high){for(const z of [.3,.9])for(const x of [1.44,1.56]){box(body,m.fitting,s*x,.345,z,.06,.04,.03,0);}}}
  else{// Right guard: tow cable coiled between its eyes, the extinguisher and a sledge.
   tube(body,m.cable,[[s*1.43,.34,1.35],[s*1.51,.34,1.1],[s*1.42,.34,.75],[s*1.51,.34,.45],[s*1.44,.34,.15]],.026);
   for(const z of [1.35,.15])ring(body,m.chain,s*1.47,.345,z+(z>1?.08:-.08),.05,.016,'y');
   cyl(body,m.canRed,s*1.5,.39,-.12,.07,.26,'z');if(high){cyl(body,m.fitting,s*1.5,.39,.03,.03,.05,'z');for(const z of [-.2,-.04])box(body,m.fitting,s*1.5,.33,z,.16,.03,.03,0);}
   rod(body,m.wood,[s*1.58,.345,.2],[s*1.58,.345,1.1],.018);box(body,m.tool,s*1.58,.345,1.15,.07,.07,.16,.01);}
 }

 // ---------------------------------------------------------------- running gear
 // Road wheels ride the ground run; the sprocket, idler and return rollers lift the upper run.
 const TX=1.3,roadZ=[1.3,.65,0,-.65,-1.3],road=roadZ.map(z=>[z,-.4,.33]),sprocket=[1.86,-.14,.28],idler=[-1.9,-.16,.26],rollers=[1.0,.33,-.33,-1.0].map(z=>[z,.06,.07]);
 const loop=trackLoop([...road,sprocket,idler,...rollers],high?96:40),thickness=.07;
 for(const s of [-1,1]){
  if(high){
   // Individual cast links: shoe, grouser, centre guide horn, end connectors and hinge pins.
   for(let i=0;i<loop.length;i++){const {p,n}=loop[i],basis=new THREE.Matrix4().makeBasis(V(1,0,0),V(0,n[1],n[0]),V(0,-n[0],n[1])),q=new THREE.Quaternion().setFromRotationMatrix(basis);
    const part=(geo,mat,x,out,along=0)=>{const mesh=add(body,geo,mat,s*TX+x,p[1]+n[1]*out-n[0]*along,p[0]+n[0]*out+n[1]*along);mesh.quaternion.copy(q);return mesh;};
    part(new RoundedBoxGeometry(.56,.04,.082,1,.012),m.link,0,.035);part(new THREE.BoxGeometry(.5,.022,.022),m.link,0,.066,.012);
    part(new THREE.BoxGeometry(.05,.07,.045),m.link,0,-.03);for(const x of [-.3,.3])part(new THREE.BoxGeometry(.045,.05,.05),m.pin,x,.035,.043);
    part(axisGeo(new THREE.CylinderGeometry(.011,.011,.64,6),'x'),m.pin,0,.035,.043);}
  }else{add(body,band(loop,.6,thickness),m.link,s*TX);
   for(let i=0;i<26;i++){const {p,n}=loop[Math.round(i*loop.length/26)%loop.length];const lug=add(body,new THREE.BoxGeometry(.56,.035,.1),m.link,s*TX,p[1]+n[1]*(thickness+.012),p[0]+n[0]*(thickness+.012));lug.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1,0,0),V(0,n[1],n[0]),V(0,-n[0],n[1])));}}
  // Rubber-tyred dual road wheels on trailing arms with bump stops.
  for(const [z,y,r] of road){const w=new THREE.Group();w.position.set(s*TX,y,z);body.add(w);wheels.push(w);
   for(const c of [-1,1]){const a=c*.155;
    if(high){lathe(w,m.rubber,[[r*.8,a-.1],[r*.93,a-.105],[r*.985,a-.09],[r,a-.06],[r,a+.06],[r*.985,a+.09],[r*.93,a+.105],[r*.8,a+.1]],'x',0,0,0);
     const o=a+c*.095;lathe(w,m.wheel,c>0?[[r*.81,a-.08],[r*.81,o],[r*.74,o+.012],[r*.46,o-.012],[r*.3,o+.01],[r*.22,o+.03],[r*.05,o+.04],[0,o+.04]]:[[0,o-.04],[r*.05,o-.04],[r*.22,o-.03],[r*.3,o-.01],[r*.46,o+.012],[r*.74,o-.012],[r*.81,o],[r*.81,a+.08]],'x',0,0,0);}
    else{cyl(w,m.rubber,a,0,0,r,.19,'x');cyl(w,m.wheel,a+c*.098,0,0,r*.72,.012,'x');}}
   cyl(w,m.wheel,s*.26,0,0,r*.2,.05,'x');cyl(w,m.fitting,s*.29,0,0,r*.1,.03,'x');
   if(high){for(let k=0;k<8;k++){const t=k/8*Math.PI*2;bolt(w,V(s*.265,Math.sin(t)*r*.26,Math.cos(t)*r*.26),V(s,0,0));}for(let k=0;k<6;k++){const t=k/6*Math.PI*2+.3;bolt(w,V(s*.2,Math.sin(t)*r*.55,Math.cos(t)*r*.55),V(s,0,0));}}
   batch(w);
   const arm=box(body,m.gear,s*.99,y+.12,z-.18,.1,.09,.46,.015);arm.rotation.x=.5;if(high){box(body,m.gear,s*1.02,.1,z-.12,.1,.1,.12,.02);cyl(body,m.gear,s*.99,y+.22,z-.36,.07,.1,'x');}}
  // Drive sprocket: twin 13-tooth rings on a six-spoke disc.
  const sp=new THREE.Group();sp.position.set(s*TX,sprocket[1],sprocket[0]);body.add(sp);wheels.push(sp);
  const teeth=13,pitch=Math.PI*2/teeth,gear=new THREE.Shape();for(let j=0;j<teeth;j++)for(const [f,rr] of [[0,.262],[.28,.262],[.42,.315],[.58,.315],[.72,.262]]){const t=(j+f)*pitch;j||f?gear.lineTo(Math.cos(t)*rr,Math.sin(t)*rr):gear.moveTo(Math.cos(t)*rr,Math.sin(t)*rr);}
  const hole=new THREE.Path();hole.absarc(0,0,.2,0,Math.PI*2,true);gear.holes.push(hole);
  for(const c of [-1,1]){const g=new THREE.ExtrudeGeometry(gear,{depth:.05,bevelEnabled:high,bevelSize:.006,bevelThickness:.006,bevelSegments:1,curveSegments:high?24:8});g.translate(0,0,-.025);g.rotateY(Math.PI/2);add(sp,g,m.gear,c*.13,0,0);}
  const spokes=new THREE.Shape();spokes.absarc(0,0,.215,0,Math.PI*2,false);for(let k=0;k<6;k++){const t=k/6*Math.PI*2,h=new THREE.Path();h.absarc(Math.cos(t)*.13,Math.sin(t)*.13,.045,0,Math.PI*2,true);spokes.holes.push(h);}
  for(const c of [-1,1]){const g=new THREE.ExtrudeGeometry(spokes,{depth:.025,bevelEnabled:false,curveSegments:high?16:6});g.translate(0,0,-.0125);g.rotateY(Math.PI/2);add(sp,g,m.wheel,c*.14,0,0);}
  cyl(sp,m.gear,0,0,0,.08,.36,'x');lathe(sp,m.fitting,[[.1,.15],[.09,.19],[.07,.22],[0,.225]],'x',0,0,0).rotation.y=s>0?0:Math.PI;
  if(high){for(let k=0;k<6;k++){const t=k/6*Math.PI*2;bolt(sp,V(s*.2,Math.sin(t)*.06,Math.cos(t)*.06),V(s,0,0));}}
  batch(sp);box(body,m.gear,s*1.02,sprocket[1],sprocket[0],.14,.26,.26,.03);
  // Rear idler: dual spoked discs with a tensioner.
  const id=new THREE.Group();id.position.set(s*TX,idler[1],idler[0]);body.add(id);wheels.push(id);
  const idShape=new THREE.Shape();idShape.absarc(0,0,idler[2],0,Math.PI*2,false);for(let k=0;k<5;k++){const t=k/5*Math.PI*2,h=new THREE.Path();h.absarc(Math.cos(t)*.15,Math.sin(t)*.15,.055,0,Math.PI*2,true);idShape.holes.push(h);}
  for(const c of [-1,1]){const g=new THREE.ExtrudeGeometry(idShape,{depth:.16,bevelEnabled:high,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:high?28:8});g.translate(0,0,-.08);g.rotateY(Math.PI/2);add(id,g,m.wheel,c*.16,0,0);}
  cyl(id,m.gear,0,0,0,.07,.6,'x');cyl(id,m.fitting,s*.3,0,0,.05,.04,'x');batch(id);
  box(body,m.gear,s*1.02,idler[1]+.02,idler[0]+.18,.12,.14,.4,.02);
  // Return rollers on stub axles.
  for(const [z,y,r] of rollers){cyl(body,m.rubber,s*TX,y,z,r,.46,'x');cyl(body,m.wheel,s*(TX+.235),y,z,r*.7,.02,'x');cyl(body,m.gear,s*1.08,y,z,.03,.2,'x');}
 }

 // ---------------------------------------------------------------- turret
 // Slab-sided turret: plan outline with faceted cheeks, walls leaning in above a bevelled skirt.
 turret.position.set(0,D,.1);body.add(turret);
 cyl(turret,m.gear,0,.03,0,.98,.06,'y',.98,high?64:16);cyl(turret,m.plate,0,.075,0,.93,.05,'y',.9,high?64:16);
 const plan=[[.6,1.02],[.99,.5],[1.0,-.62],[.9,-1.02]],levels=[[.07,.9],[.22,1],[.82,.92],[.9,.86]];
 const shellPoints=[];for(const [y,k] of levels)for(const [x,z] of plan)shellPoints.push(V(x*k,y,z*k),V(-x*k,y,z*k));
 convex(turret,armor,shellPoints);
 const facet=(a,b,lo=1,hi=2,sideSign=1)=>{const [la,lb]=[levels[lo],levels[hi]],P=(i,l)=>V(sideSign*plan[i][0]*l[1],l[0],plan[i][1]*l[1]);
  const c=P(a,la).add(P(b,la)).add(P(a,lb)).add(P(b,lb)).multiplyScalar(.25),n=new THREE.Vector3().subVectors(P(b,la),P(a,la)).cross(new THREE.Vector3().subVectors(P(a,lb),P(a,la))).normalize();if(n.dot(V(c.x,0,c.z))<0)n.negate();return frame(c,n);};
 for(const s of [-1,1]){
  const flank=facet(1,2,1,2,s),cheek=facet(0,1,1,2,s),back=facet(2,3,1,2,s);
  // Two bolted plates per flank (the concept's vertical seam), a bolted cheek plate and grab rails.
  for(const du of [-.29,.29]){plate(turret,m.plate,flank,s*du,0,.54,.54,.025,.01);frameBolts(turret,frame(at(flank,s*du,0),flank.n),.54,.54,.13,.025);}
  plate(turret,m.plate,cheek,0,0,.52,.52,.03,.012);frameBolts(turret,frame(at(cheek,0,0),cheek.n),.52,.52,.12,.03);
  if(high){const a=at(flank,-.55,.19,.06),b=at(flank,.55,.19,.06);rod(turret,m.fitting,a.toArray(),b.toArray(),.012);for(const q of [at(flank,-.5,.19),at(flank,.5,.19)]){const e=q.clone().addScaledVector(flank.n,.06);rod(turret,m.fitting,q.toArray(),e.toArray(),.012);}
   weld(turret,[P3(plan[1],levels[1],s),P3(plan[1],levels[2],s)]);weld(turret,[P3(plan[0],levels[1],s),P3(plan[0],levels[2],s)]);}
  markings(turret,flank,s,m);
  // Triple smoke dischargers on the cheek, splayed outward and up.
  const base=at(cheek,0,.13,.04);for(let i=0;i<3;i++){const q=base.clone().addScaledVector(cheek.u,(i-1)*.11),dir=cheek.n.clone().multiplyScalar(.6).add(V(0,.75,.25)).normalize(),tip=q.clone().addScaledVector(dir,.22);
   pipe(turret,m.tube,q.toArray(),tip.toArray(),.042,.032,.16);if(high){const lip=ring(turret,m.fitting,0,0,0,.042,.007,'y');lip.position.copy(tip).addScaledVector(dir,-.012);orient(lip,dir);}}
  place(box(turret,m.fitting,base.x,base.y,base.z,.4,.1,.06,.01),cheek);
 }
 function P3([x,z],[y,k],s){return [s*x*k,y,z*k];}
 const roof=frame(V(0,.9,0),UP,V(0,0,1));if(high){bolts(turret,roof,[-.62,-.8],[.62,-.8],8);bolts(turret,roof,[-.4,.76],[.4,.76],5);for(const x of [-.74,.74])bolts(turret,roof,[x,-.6],[x,.35],6);weld(turret,[[-.5,.902,.87],[.5,.902,.87]],.01);}
 // Commander's cupola with vision blocks and a pintle 12.7 mm HMG.
 const cx=.36,cz=-.36;lathe(turret,armor,[[0,.9],[.34,.9],[.34,1.0],[.31,1.04],[.31,1.08],[.27,1.1],[0,1.1]],'y',cx,0,cz,high?40:12);
 for(let k=0;k<6;k++){const t=k/6*Math.PI*2,q=V(cx+Math.sin(t)*.33,1.025,cz+Math.cos(t)*.33),b=box(turret,m.glass,q.x,q.y,q.z,.11,.045,.03,0);b.rotation.y=t;const hood=box(turret,m.plate,q.x*1+Math.sin(t)*.01,q.y+.035,q.z+Math.cos(t)*.01,.14,.02,.05,0);hood.rotation.y=t;}
 cyl(turret,m.plate,cx,1.12,cz,.24,.04,'y',.22);box(turret,m.fitting,cx-.2,1.13,cz,.06,.05,.14,.01);if(high){rod(turret,m.fitting,[cx-.08,1.15,cz+.1],[cx+.08,1.15,cz+.1],.01);}
 const hmg=new THREE.Group();hmg.position.set(cx,1.12,cz+.12);turret.add(hmg);rod(hmg,m.gunMetal,[0,0,0],[0,.24,.08],.025);box(hmg,m.gunMetal,0,.27,.1,.1,.11,.36,.012);cyl(hmg,m.gunMetal,0,.28,.62,.034,.64,'z');pipe(hmg,m.gunMetal,[0,.28,.93],[0,.28,1.0],.022,.012,.06,high?12:6);box(hmg,m.canRed,-.1,.22,.08,.07,.1,.16,.01);
 if(high){for(let k=0;k<5;k++)ring(hmg,m.gunMetal,0,.28,.42+k*.1,.037,.006,'z',12);rod(hmg,m.gunMetal,[-.05,.3,-.1],[-.05,.24,-.2],.01);rod(hmg,m.gunMetal,[.05,.3,-.1],[.05,.24,-.2],.01);box(hmg,m.gunMetal,0,.36,.1,.02,.05,.04,0);}
 flatten(hmg);
 // Loader's hatch, gunner's sight hood, ventilator, lifting eyes and aerial bases.
 lathe(turret,m.plate,[[0,.9],[.26,.9],[.26,.93],[.24,.945],[0,.95]],'y',-.36,0,-.3,high?36:10);box(turret,m.fitting,-.36,.96,-.07,.2,.04,.05,.01);if(high){rod(turret,m.fitting,[-.44,.97,-.36],[-.28,.97,-.36],.012);}
 box(turret,m.plate,-.4,.97,.52,.26,.14,.3,.02);box(turret,m.glass,-.4,.98,.675,.2,.07,.012,0);box(turret,m.plate,-.4,1.055,.56,.28,.03,.36,.01);
 lathe(turret,m.plate,[[0,.9],[.12,.9],[.12,.96],[.09,1.0],[0,1.01]],'y',0,0,-.72,high?24:8);
 for(const [x,z] of [[.72,.55],[-.72,.55],[.66,-.85],[-.66,-.85]])ring(turret,m.fitting,x,.945,z,.04,.012,'x');
 cyl(turret,m.fitting,.62,.94,-.86,.05,.08);const aerial=rod(turret,m.dark,[.62,.96,-.86],[.7,2.45,-.98],.008);aerial.name='radio-aerial';if(high){lathe(turret,m.fitting,[[0,.96],[.03,.96],[.035,1.0],[.02,1.05],[0,1.07]],'y',.62,0,-.86,12);cyl(turret,m.fitting,.7,2.46,-.98,.016,.03);}
 cyl(turret,m.fitting,-.62,.94,-.86,.04,.07);rod(turret,m.dark,[-.62,.96,-.86],[-.66,1.7,-.94],.006);
 // Rear stowage bin on brackets, a rolled tarp strapped across it and a canvas bag on the flank.
 box(turret,m.bin,0,.5,-1.2,1.56,.46,.34,.03);box(turret,m.plate,0,.745,-1.2,1.6,.035,.38,.012);
 for(const x of [-.6,0,.6])box(turret,m.fitting,x,.3,-1.04,.05,.14,.12,0);
 if(high){for(const x of [-.4,.4])box(turret,m.fitting,x,.66,-1.375,.06,.08,.012,0);for(const x of [-.75,-.25,.25,.75])box(turret,m.dark,x,.5,-1.372,.012,.4,.006,0);}
 cyl(turret,m.canvas,0,.89,-1.2,.13,1.4,'x',.13,high?28:8);for(const x of [-.45,.45])ring(turret,m.strap,x,.89,-1.2,.134,.012,'x',high?24:8);
 box(turret,m.canvas,.98,.5,-.8,.16,.38,.42,.06);if(high){for(const z of [-.92,-.68])box(turret,m.strap,1.065,.5,z,.012,.4,.035,0);}

 // ---------------------------------------------------------------- gun
 // Box mantlet with rounded flanks, a round collar, thick sleeve, long 76 mm barrel and muzzle brake.
 gun.position.set(0,.48,1.0);turret.add(gun);
 box(gun,armor,0,0,.06,.98,.54,.26,.09);box(gun,m.plate,0,0,.2,.72,.44,.08,.04);
 lathe(gun,armor,[[0,.22],[.26,.22],[.27,.25],[.27,.46],[.25,.5],[.2,.52],[0,.52]],'z',0,0,0);
 lathe(gun,m.barrel,[[0,.5],[.17,.5],[.17,.84],[.15,.88],[.112,.9],[.104,1.72],[.128,1.75],[.128,1.98],[.104,2.01],[.09,2.03],[.086,2.42],[.115,2.42],[.12,2.44],[.12,2.5],[.066,2.5]],'z',0,0,0);
 lathe(gun,m.bore,[[.066,2.5],[.066,1.0],[0,1.0]],'z',0,0,0);
 // Brake: front baffle ring and rear ring joined only above and below, leaving open side ports.
 lathe(gun,m.barrel,[[.066,2.64],[.12,2.64],[.12,2.7],[.11,2.72],[.066,2.72],[.066,2.64]],'z',0,0,0);
 for(const a0 of [.7,.7+Math.PI]){const sector=new THREE.Shape();sector.absarc(0,0,.12,a0,a0+Math.PI-1.4,false);sector.absarc(0,0,.066,a0+Math.PI-1.4,a0,true);
  const g=new THREE.ExtrudeGeometry(sector,{depth:.14,bevelEnabled:false,curveSegments:high?12:4});add(gun,g,m.barrel,0,0,2.5);}
 if(high){for(const z of [.5,.84])ring(gun,m.fitting,0,0,z,.17,.01,'z');ring(gun,m.fitting,0,0,1.0,.106,.008,'z');ring(gun,m.fitting,0,0,2.42,.121,.009,'z');for(let k=0;k<10;k++){const t=k/10*Math.PI*2;bolt(gun,V(Math.cos(t)*.22,Math.sin(t)*.22,.523),V(0,0,1));}
  for(const s of [-1,1])for(const y of [-.19,.19])bolt(gun,V(s*.42,y,.193),V(0,0,1));}
 // Coaxial MG port and the gunner's sight aperture in the mantlet face.
 cyl(gun,m.dark,-.27,-.06,.25,.035,.04,'z');cyl(gun,m.gunMetal,-.27,-.06,.3,.018,.14,'z');box(gun,m.glass,.3,.1,.245,.1,.06,.012,0);
 const muzzlePoint=new THREE.Object3D();muzzlePoint.name='main-gun-muzzle';muzzlePoint.position.z=2.74;gun.add(muzzlePoint);

 batch(body,new Set([turret,...wheels]));batch(turret,new Set([gun]));batch(gun);
 bakeWeather(root);
 let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});root.userData.triangles=triangles;
 return {root,body,turret,gun,muzzlePoint,wheels,armor,exhausts};
}

// Stencilled "217" on the forward flank plate and the triangle emblem on the rear one, as in the concept.
function markings(turret,flank,side,m){
 const makePanel=(du,w,h,u0,u1)=>{const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,u0+(u1-u0)*uv.getX(i));const mesh=new THREE.Mesh(geo,m.decal);mesh.renderOrder=2;mesh.castShadow=false;mesh.receiveShadow=true;
  const f=flank,q=f.c.clone().addScaledVector(f.u,du).addScaledVector(f.n,.03);mesh.position.copy(q);mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.u,f.v,f.n));turret.add(mesh);};
 // Decal atlas: triangle left of the measured gap, number right of it. Flank u reads toward the rear on the left side.
 const split=.469,toward=side>0?-1:1;makePanel(toward*-.29,.37,.32,0,split);makePanel(toward*.29,.42,.32,split,1);
}

// Root-space height and upward facing are baked per vertex for the mud and dust weathering shader.
function bakeWeather(root){
 root.updateMatrixWorld(true);const p=V(),n=V(),normalMatrix=new THREE.Matrix3();
 root.traverse(mesh=>{if(!mesh.isMesh||!mesh.material.userData.weathered)return;const pos=mesh.geometry.attributes.position,nor=mesh.geometry.attributes.normal,data=new Float32Array(pos.count*2);normalMatrix.getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);n.fromBufferAttribute(nor,i).applyMatrix3(normalMatrix).normalize();data[i*2]=p.y;data[i*2+1]=n.y;}
  mesh.geometry.setAttribute('weather',new THREE.BufferAttribute(data,2));});
}

// Materials: generated albedo, normal, roughness and specular maps in the showroom; albedo and bump in
// gameplay. Every surface shares one weathering pass: macro tone break-up, cavity darkening (showroom),
// bare steel turning metallic where the specular map marks chips, dust on upward faces and mud rising
// from the ground. Lamps are emissive so the bloom pass lights them.
function vanguardMaterials(materials,enemy,high){
 const maps=materials.vanguard||{},gear={albedo:maps.gearAlbedo,normal:maps.gearNormal,roughness:maps.gearRoughness,specular:maps.gearSpecular,bump:maps.gearBump};
 const surface=(color,{set=maps,metalness=.08,normal=.75,scale=.7,mud=1,dust=1,roughness=1}={})=>{
  const mat=high?new THREE.MeshPhysicalMaterial({map:set.albedo||null,normalMap:set.normal||null,normalScale:new THREE.Vector2(normal,normal),roughnessMap:set.roughness||null,roughness,metalness,specularColorMap:set.specular||null,specularIntensity:1,envMapIntensity:1})
   :new THREE.MeshStandardMaterial({map:set.albedo||null,bumpMap:set.bump||null,bumpScale:1.4,roughness:.84*roughness,metalness:Math.min(metalness,.25)});
  mat.color.setHex(color);mat.userData.projectUV={scale};weather(mat,{grime:maps.grime,cavity:high?set.bump:null,spec:high?set.specular:null,mud,dust:high?dust:dust*.45,metal:metalness});return mat;};
 const tint=(friendly,hostile)=>enemy?hostile:friendly;
 const armor=surface(tint(high?0xe4e9d4:0xd4e0b6,0xd8b39a)),plate=surface(tint(high?0xd9ddc8:0xcad6ac,0xcfae98),{normal:.85,scale:.8});
 const lampBody=surface(tint(0xd4d8c8,0xc2a590),{metalness:.2}),bin=surface(tint(0xdfe2d2,0xc9a894),{normal:.9}),fitting=surface(0xb8b8ae,{set:gear,metalness:.6,scale:.9});
 const lens=new THREE.MeshStandardMaterial({color:0xfff4dc,map:maps.lens||null,emissive:0xffcf8a,emissiveMap:maps.lens||null,emissiveIntensity:high?4.2:2.6,roughness:.15,metalness:0});
 const physical=o=>high?new THREE.MeshPhysicalMaterial(o):new THREE.MeshStandardMaterial(Object.fromEntries(Object.entries(o).filter(([k])=>!['clearcoat','clearcoatRoughness','sheen','sheenColor','sheenRoughness','specularIntensity'].includes(k))));
 const canvas=physical({map:maps.canvas||null,normalMap:high?maps.canvasNormal||null:null,bumpMap:high?null:maps.canvasBump||null,bumpScale:1,color:tint(0xe8e2cc,0xd9c3a8),roughness:1,sheen:.6,sheenColor:new THREE.Color(0x8c8466),sheenRoughness:.8});canvas.userData.projectUV={scale:1.6};weather(canvas,{grime:maps.grime,mud:.6,dust:1.2,metal:0});
 const decal=new THREE.MeshStandardMaterial({map:maps.decal||markingTexture(),transparent:true,alphaTest:.08,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,roughness:.9,metalness:0,color:0xf4f0e2});
 return {armor,plate,lampBody,bin,fitting,lens,canvas,decal,
  bolt:plate,weld:surface(tint(0xd9dccd,0xc4a58f),{normal:1.4,scale:1.4}),
  gear:surface(0xffffff,{set:gear,metalness:.55,scale:.9,mud:1.3}),link:surface(0x8f8a82,{set:gear,metalness:.6,scale:1.2,mud:1.05}),pin:surface(0xe4e0d8,{set:gear,metalness:.8,scale:1.4,mud:.8}),
  wheel:surface(tint(0xe0e2d4,0xcdac96),{mud:1.5}),rubber:surface(0x3a3834,{set:gear,metalness:0,scale:1.6,normal:.4,mud:1.4,roughness:1}),
  soot:surface(0x4c4640,{set:gear,metalness:.4,scale:1,dust:.3}),barrel:surface(tint(0xeceee2,0xd2ae96),{normal:.8,scale:.8}),gunMetal:surface(0x7c7c76,{set:gear,metalness:.7,scale:1.4}),
  tube:surface(tint(0xd8dccb,0xc0a28d),{scale:1.2}),tool:surface(0x9c9990,{set:gear,metalness:.7,scale:1.2}),wood:surface(0xa77f5a,{set:gear,metalness:0,scale:1.8,normal:.6,mud:.4}),
  can:surface(0xd9dcc4,{scale:1}),canRed:surface(0xe4826c,{scale:1,metalness:.1}),chain:surface(0xd4cabc,{set:gear,metalness:.75,scale:1.6}),cable:surface(0x8a8278,{set:gear,metalness:.6,scale:2.4}),
  strap:physical({color:0x3d3526,roughness:.85,metalness:0,map:maps.canvas||null}),
  glass:physical({color:0x020405,roughness:.08,metalness:0,clearcoat:.6,clearcoatRoughness:.05,envMapIntensity:.3,emissive:0x0f2824,emissiveIntensity:.6}),
  chrome:physical({color:0xe8e4da,roughness:.14,metalness:1,envMapIntensity:1.5}),
  marker:new THREE.MeshStandardMaterial({color:0xffe2b0,emissive:0xffb35a,emissiveIntensity:high?2.6:1.8,roughness:.2}),
  tail:new THREE.MeshStandardMaterial({color:0xff6a4a,map:maps.lens||null,emissive:0xff2a12,emissiveMap:maps.lens||null,emissiveIntensity:high?4:2.6,roughness:.2}),
  dark:new THREE.MeshStandardMaterial({color:0x0e0f0d,roughness:.92,metalness:.2}),
  bore:new THREE.MeshStandardMaterial({color:0x050505,roughness:.75,metalness:.3,envMapIntensity:.15,side:THREE.DoubleSide})};
}

// Mud, dust, macro variation, cavity and chip metalness layered onto a standard or physical material.
function weather(material,{grime,cavity,spec,mud=1,dust=1,metal=.1}){
 material.userData.weathered=true;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{grimeMap:{value:grime||null},cavityMap:{value:cavity||null},chipMap:{value:spec||null},weatherAmount:{value:new THREE.Vector3(mud,dust,metal)}});
  const defines=`${grime?'#define WEATHER_GRIME\n':''}${cavity?'#define WEATHER_CAVITY\n':''}${spec?'#define WEATHER_CHIPS\n':''}`;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 weather;\nvarying vec2 vWeather;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWeather=weather;');
  shader.fragmentShader=defines+shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec2 vWeather;uniform sampler2D grimeMap,cavityMap,chipMap;uniform vec3 weatherAmount;float weatherMud=0.,weatherChip=0.;`)
   .replace('#include <map_fragment>',`#include <map_fragment>
#ifdef USE_MAP
 {vec2 wuv=vMapUv;float macro=texture2D(map,wuv*.13+vec2(.37,.61)).g;diffuseColor.rgb*=mix(.84,1.14,smoothstep(.2,.48,macro));
 #ifdef WEATHER_CAVITY
  float cav=texture2D(cavityMap,wuv).r;diffuseColor.rgb*=mix(.62,1.,smoothstep(.3,.6,cav));
 #endif
 #ifdef WEATHER_GRIME
  float g=texture2D(grimeMap,wuv*.62+vec2(.13,.29)).r,g2=texture2D(grimeMap,wuv*1.7+vec2(.71,.05)).r;
  float low=1.-smoothstep(-.95,.35,vWeather.x);
  weatherMud=smoothstep(.42,.7,g*(.5+.5*g2)*(.35+low)+low*.45*weatherAmount.x-.15)*min(1.,weatherAmount.x);
  float up=smoothstep(.55,.98,vWeather.y)*weatherAmount.y,dust=up*smoothstep(.35,.85,g2*.7+g*.5)*.32;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.36,.28,.18)*mix(.8,1.1,g2),dust);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.125,.08)*mix(.75,1.2,g),weatherMud);
 #endif
 #ifdef WEATHER_CHIPS
  weatherChip=smoothstep(.55,.8,texture2D(chipMap,wuv).r)*(1.-weatherMud);
 #endif
 }
#endif`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(max(roughnessFactor,.52*weatherChip),.97,weatherMud);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,max(metalnessFactor,.6),weatherChip)*(1.-weatherMud);')
   .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.specularColor*=1.-.85*weatherMud;');
 };
 material.customProgramCacheKey=()=>`vanguard-weather-${!!grime}-${!!cavity}-${!!spec}`;
}

// Fallback stencil when the generated decal atlas is unavailable: triangle left, "217" right.
let fallbackMarking;
function markingTexture(){
 if(typeof document==='undefined')return null;
 if(!fallbackMarking){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=410;const ctx=canvas.getContext('2d');ctx.fillStyle=ctx.strokeStyle='#ece6d3';
  ctx.lineWidth=34;ctx.lineJoin='miter';ctx.beginPath();ctx.moveTo(60,350);ctx.lineTo(420,350);ctx.lineTo(240,50);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(170,330);ctx.lineTo(310,330);ctx.lineTo(240,210);ctx.closePath();ctx.fill();
  ctx.textBaseline='middle';ctx.font='900 300px Impact, Arial, sans-serif';ctx.save();ctx.translate(500,215);ctx.scale(.9,1);ctx.fillText('217',0,0);ctx.restore();
  ctx.globalCompositeOperation='destination-out';let seed=917;for(let i=0;i<900;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%1024;seed=(seed*1664525+1013904223)>>>0;ctx.fillRect(x,seed%410,2+seed%7,1+seed%4);}
  fallbackMarking=new THREE.CanvasTexture(canvas);fallbackMarking.colorSpace=THREE.SRGBColorSpace;fallbackMarking.anisotropy=8;}
 return fallbackMarking;
}
