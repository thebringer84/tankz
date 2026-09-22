import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {loft,trackLoop,band,flatten,batch,gearMaterial} from './tank-geometry.js';

// Marauder: the super-heavy, deliberately excessive (concept-art/09-marauder-heavy.png). Four
// independent track units under armoured guards, a toothed ram plough, reactive armour bricks,
// twin exhaust stacks and a colossal turret with one enormous box-braked cannon, twin autocannon
// pods, a rocket pod, caged searchlights and a cupola machine gun. Both detail levels share every
// pivot and the muzzle; showroom detail adds individual bricks, track links, chains, cages and bolts.
export function createMarauder(materials,enemy=false,detail='low'){
 const high=detail==='high',segments=high?28:10,root=new THREE.Group(),body=new THREE.Group(),turret=new THREE.Group(),gun=new THREE.Group(),wheels=[],exhausts=[];
 root.name='Marauder';root.userData.detail=detail;root.add(body);body.position.y=-.2;
 const maps=materials.marauder||{},armor=marauderArmor(maps,enemy,high),hazard=hazardPaint(maps,high),gearMaps=materials.vanguard||{},dark=gearMaterial(gearMaps,high,0x4a4640,.45,1.6),track=gearMaterial(gearMaps,high,0x9c968c,.55,1.3),rubber=gearMaterial(gearMaps,high,0x4a4744,0,1.8),steel=gearMaterial(gearMaps,high,0xc8c4bc,.8,1.6);
 const paint=new THREE.MeshStandardMaterial({color:0xe3dbc0,roughness:.95});
 // Tinted variants of the generated armour maps, so pipes, fittings, cans and bedrolls are never flat colour.
 const worn=(color,metalness=.3)=>{const m=high?new THREE.MeshPhysicalMaterial({map:maps.albedo||null,normalMap:maps.normal||null,normalScale:new THREE.Vector2(.6,.6),roughnessMap:maps.roughness||null,roughness:1,metalness,specularColorMap:maps.specular||null,envMapIntensity:.8}):new THREE.MeshStandardMaterial({map:maps.albedo||null,bumpMap:maps.bump||null,bumpScale:.8,roughness:.85,metalness:Math.min(metalness,.1)});m.color.setHex(color);m.userData.projectUV={scale:.9};return m;};
 const soot=worn(0x6a625a,.2),metal=worn(0xc9cdc6,.55),olive=worn(0xb9c79c,.2),red=worn(0xe08268,.2),bedroll=worn(0xf0dcb4,0),chainMetal=worn(0xd9c2b0,.6),links=worn(0x8f8a80,.45),gunMetal=worn(0x9da09a,.6),receiver=worn(0x6f716c,.5),tubes=worn(0x77736c,.35);
 const glass=high?new THREE.MeshPhysicalMaterial({color:0x04070a,roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.02,iridescence:.6,iridescenceIOR:1.8,iridescenceThicknessRange:[260,520],envMapIntensity:.8,emissive:0x2a2410,emissiveIntensity:.3}):new THREE.MeshStandardMaterial({color:0x121a1c,roughness:.15,metalness:.7,emissive:0x2a2410,emissiveIntensity:.4});
 const bore=new THREE.MeshStandardMaterial({color:0x050505,roughness:.75,metalness:.3,envMapIntensity:.15,side:THREE.DoubleSide});
 const beam=new THREE.MeshStandardMaterial({color:0xfff1c8,emissive:0xffd88a,emissiveIntensity:2.2}),tail=new THREE.MeshStandardMaterial({color:0xff5a3a,emissive:0xd8321c,emissiveIntensity:1.5});
 const add=(parent,geo,mat,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(p,m,x,y,z,w,h,d)=>add(p,high?new RoundedBoxGeometry(w,h,d,1,Math.min(.02,w*.2,h*.2,d*.2)):new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(p,m,x,y,z,r,h,axis='y',top=r,sides=segments)=>{const geo=new THREE.CylinderGeometry(top,r,h,sides);if(axis==='x')geo.rotateZ(Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);return add(p,geo,m,x,y,z);};
 const ring=(p,m,x,y,z,r,t,axis='z',sides=segments)=>{const geo=new THREE.TorusGeometry(r,t,high?6:3,sides);if(axis==='x')geo.rotateY(Math.PI/2);if(axis==='y')geo.rotateX(Math.PI/2);return add(p,geo,m,x,y,z);};
 const rod=(p,m,a,b,r=.02)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.sub(from);const mesh=cyl(p,m,0,0,0,r,delta.length(),'y',r,high?10:6);mesh.position.copy(from).addScaledVector(delta,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;};
 // Lathe profiles are [radius, axial] pairs along +z. pipe() builds a hollow tube open at b with a dark bore.
 const lathe=(p,m,profile,x=0,y=0,z=0,sides=segments)=>add(p,new THREE.LatheGeometry(profile.map(([r,a])=>new THREE.Vector2(r,a)),sides).rotateX(Math.PI/2),m,x,y,z);
 const pipe=(p,m,a,b,rOut,rIn,depth,sides=segments)=>{const from=V(...a),delta=V(...b).sub(from),L=delta.length(),d=Math.min(depth,L*.95),q=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),delta.clone().normalize());
  for(const mesh of [lathe(p,m,[[0,0],[rOut,0],[rOut,L],[rIn,L]],0,0,0,sides),lathe(p,bore,[[rIn,L],[rIn,L-d],[0,L-d]],0,0,0,sides)]){mesh.position.copy(from);mesh.quaternion.copy(q);}};
 // Plate with round holes cut through it, extruded along +z from z0.
 const holedPlate=(p,m,x,y,z0,w,h,depth,holes,r)=>{const shape=new THREE.Shape([new THREE.Vector2(-w/2,-h/2),new THREE.Vector2(w/2,-h/2),new THREE.Vector2(w/2,h/2),new THREE.Vector2(-w/2,h/2)]);for(const [hx,hy] of holes){const hole=new THREE.Path();hole.absarc(hx,hy,r,0,Math.PI*2,true);shape.holes.push(hole);}
  return add(p,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:high,bevelSize:.006,bevelThickness:.006,bevelSegments:1,curveSegments:high?16:6}),m,x,y,z0);};
 const bolt=(p,x,y,z,axis='x')=>{const geo=new THREE.CylinderGeometry(.028,.028,.022,6);if(axis==='x')geo.rotateZ(Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);add(p,geo,steel,x,y,z);};
 const section=(z,bottom,top,...side)=>({z,points:[[0,bottom],...side,[0,top],...side.slice().reverse().map(([x,y])=>[-x,y])]});
 // Plates laid out on a facet: u runs across it, v up it, and u×v faces outward.
 const grid=(parent,mat,origin,u,v,cols,rows,w,h,d,gap=.03)=>{const n=new THREE.Vector3().crossVectors(u,v),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,n));
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const p=origin.clone().addScaledVector(u,(i-(cols-1)/2)*(w+gap)).addScaledVector(v,(j-(rows-1)/2)*(h+gap)).addScaledVector(n,d/2);box(parent,mat,p.x,p.y,p.z,w,h,d).quaternion.copy(q);}};
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);

 // Tall slab hull: sponsons ride on the track guards and the glacis slopes into the plough.
 add(body,loft([
  section(-2.05,-.32,.66,[.88,-.3],[.9,.14],[1.6,.16],[1.64,.4],[1.38,.64]),
  section(-1.9,-.38,.74,[.92,-.36],[.95,.14],[1.68,.16],[1.72,.42],[1.45,.72]),
  section(1.2,-.38,.74,[.92,-.36],[.95,.14],[1.68,.16],[1.72,.42],[1.45,.72]),
  section(1.95,-.32,.34,[.86,-.3],[.9,.14],[1.62,.2],[1.66,.3],[1.4,.34]),
  section(2.1,-.22,.22,[.8,-.2],[.84,.1],[1.5,.16],[1.52,.2],[1.3,.22])]),armor);
 // Reactive armour bricks across the glacis and the upper hull sides.
 const glacisUp=V(0,.47,-.88).normalize();
 if(high)grid(body,armor,V(0,.54,1.575),V(1,0,0),glacisUp,7,3,.3,.2,.08,.04);else grid(body,armor,V(0,.54,1.575),V(1,0,0),glacisUp,1,3,2.3,.22,.07,.04);
 for(const side of [-1,1]){const up=V(-side*.669,.743,0);if(high)grid(body,armor,V(side*1.585,.57,-.3),V(0,0,-side),up,9,1,.28,.3,.07,.04);else grid(body,armor,V(side*1.585,.57,-.3),V(0,0,-side),up,3,1,.92,.3,.07,.04);}

 for(const side of [-1,1]){
  for(const end of [-1,1]){
   // Four separate track units: idler, three road wheels and a sprocket, under a heavy guard.
   const circles=[[end*.3,-.3,.2],[end*.66,-.51,.17],[end*1.02,-.51,.17],[end*1.38,-.51,.17],[end*1.72,-.26,.24],[end*.85,-.08,.05],[end*1.25,-.08,.05]];
   const loop=trackLoop(circles,high?120:40),thickness=.07;add(body,band(loop,.6,thickness),track,side*1.3);
   const lugCount=high?56:24;for(let i=0;i<lugCount;i++){const {p,n}=loop[Math.round(i*loop.length/lugCount)%loop.length],basis=new THREE.Matrix4().makeBasis(V(1,0,0),V(0,n[1],n[0]),V(0,-n[0],n[1]));
    const lug=(x,out,w,h,d)=>add(body,new THREE.BoxGeometry(w,h,d),track,side*1.3+x,p[1]+n[1]*out,p[0]+n[0]*out).quaternion.setFromRotationMatrix(basis);
    if(high){for(const s of [-1,1])lug(s*.15,thickness+.02,.26,.04,.09);if(i%2===0)lug(0,-.04,.06,.08,.07);}else lug(0,thickness+.018,.56,.036,.1);
   }
   const wheel=(z,y,r)=>{const group=new THREE.Group();group.position.set(side*1.3,y,z);body.add(group);wheels.push(group);
    if(high){for(const dx of [-.14,.14])cyl(group,rubber,dx,0,0,r,.2,'x');for(const s of [-1,1])cyl(group,armor,s*.245,0,0,r*.8,.014,'x');cyl(group,steel,side*.26,0,0,r*.34,.05,'x');cyl(group,dark,side*.29,0,0,r*.14,.02,'x');for(let k=0;k<6;k++){const a=k/6*Math.PI*2;bolt(group,side*.29,Math.sin(a)*r*.25,Math.cos(a)*r*.25);}}
    else{cyl(group,rubber,0,0,0,r,.48,'x');cyl(group,armor,side*.245,0,0,r*.8,.014,'x');cyl(group,steel,side*.26,0,0,r*.34,.05,'x');}
    batch(group);};
   wheel(end*.3,-.3,.2);for(const z of [.66,1.02,1.38])wheel(end*z,-.51,.17);
   const sprocket=new THREE.Group();sprocket.position.set(side*1.3,-.26,end*1.72);body.add(sprocket);wheels.push(sprocket);cyl(sprocket,steel,0,0,0,.14,.5,'x');cyl(sprocket,armor,side*.26,0,0,.12,.03,'x');
   for(const dx of [-.17,.17]){cyl(sprocket,metal,dx,0,0,.2,.06,'x');const teeth=high?12:8;for(let k=0;k<teeth;k++){const a=k/teeth*Math.PI*2,tooth=box(sprocket,steel,dx,Math.sin(a)*.225,Math.cos(a)*.225,.06,.08,.07);tooth.rotation.x=Math.PI/2-a;}}
   batch(sprocket);
   if(high)for(const z of [.85,1.25])cyl(body,steel,side*1.3,-.08,end*z,.05,.26,'x');
   // Chamfered guard plate; extrusion runs outward along x after rotating the (z,y) profile.
   const [z0,z1]=end>0?[.08,2.02]:[-2.02,-.08],c=.16,shape=new THREE.Shape();shape.moveTo(z0+c,-.24);shape.lineTo(z1-c,-.24);shape.lineTo(z1,-.24+c);shape.lineTo(z1,.16);shape.lineTo(z0,.16);shape.lineTo(z0,-.24+c);shape.closePath();
   const plate=new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false});plate.rotateY(-Math.PI/2);add(body,plate,armor,side*1.665+.035);
   if(high){for(let k=0;k<7;k++){const z=z0+.18+k*(z1-z0-.36)/6;bolt(body,side*1.71,.1,z);bolt(body,side*1.71,-.18,z);}box(body,armor,side*1.715,-.04,(z0+z1)/2,.04,.06,z1-z0-.3);box(body,dark,side*1.705,-.04,(z0+z1)/2,.01,.38,.012);}
  }
  // Caged headlights, tail lamps and tow points.
  const light=(x,y,z,dir,lens)=>{cyl(body,metal,x,y,z,.11,.16,'z');cyl(body,lens,x,y,z+dir*.082,.09,.01,'z');if(high){for(const dz of [.05,.12])ring(body,steel,x,y,z+dir*dz,.13,.01,'z',12);for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;rod(body,steel,[x+Math.cos(a)*.13,y+Math.sin(a)*.13,z],[x+Math.cos(a)*.13,y+Math.sin(a)*.13,z+dir*.15],.008);}}};
  light(side*1.2,.42,1.9,1,beam);light(side*1.2,.35,-2.1,-1,tail);
  box(body,steel,side*.55,-.18,-2.08,.14,.12,.1);ring(body,steel,side*.55,-.28,-2.12,.07,.02,'x');
  // Engine intakes flank the rear deck, with jerry cans lashed behind them.
  box(body,armor,side*1.02,.88,-1.2,.42,.3,.9);for(let k=0;k<(high?7:3);k++)box(body,dark,side*1.235,.88,-1.55+k*.7/(high?6:2),.012,.2,.05);
  for(let k=0;k<3;k++){const z=-1.9+k*.26;box(body,k===1?red:olive,side*1.18,.9,z,.3,.34,.2);if(high){for(const r of [-.6,.6]){const cross=box(body,dark,side*1.18,.9,z+.101,.3,.03,.005);cross.rotation.z=r;}box(body,steel,side*1.18,1.08,z,.08,.03,.12);}}
  // Twin exhaust stacks with perforated heat shields, sooty rear-facing elbows and smoke outlets.
  const x=side*1.52,z=-1.85,top=1.5,R=.13;cyl(body,soot,x,.975,z,.1,1.05);box(body,metal,x-side*.09,.62,z,.1,.16,.2);box(body,metal,x-side*.09,1.1,z,.1,.08,.16);
  cyl(body,metal,x,.92,z,.13,.55,'y',.13,high?20:8);if(high)for(let k=0;k<5;k++)ring(body,dark,x,.7+k*.11,z,.131,.009,'y',20);
  const elbow=new THREE.TorusGeometry(R,.1,high?12:6,high?14:5,Math.PI/2);elbow.rotateY(-Math.PI/2);add(body,elbow,soot,x,top,z-R);
  pipe(body,soot,[x,top+R,z-R+.01],[x,top+R,z-R-.13],.11,.084,.3);if(high)ring(body,soot,x,top+R,z-R-.125,.1,.012,'z',20);
  const exhaust=new THREE.Object3D();exhaust.name='exhaust';exhaust.position.set(x,top+R,z-R-.16);body.add(exhaust);exhausts.push(exhaust);
  if(high){for(let k=0;k<8;k++)bolt(body,side*1.7,.3,-1.6+k*.4);}
 }
 // Engine grille, spare road wheel and a tow cable across the stern.
 box(body,dark,0,.745,-1.4,1.3,.02,.8);for(let k=0;k<(high?13:5);k++)box(body,steel,-.6+k*1.2/(high?12:4),.76,-1.4,.035,.02,.76);
 cyl(body,tubes,0,.2,-2.14,.3,.18,'z');cyl(body,armor,0,.2,-2.235,.22,.02,'z');cyl(body,steel,0,.2,-2.25,.08,.04,'z');
 if(high){const cable=new THREE.CatmullRomCurve3([V(-.9,.55,-2.06),V(-.6,.38,-2.12),V(.6,.38,-2.12),V(.9,.55,-2.06)]);add(body,new THREE.TubeGeometry(cable,24,.025,6,false),chainMetal);for(let k=0;k<6;k++)bolt(body,-1.25+k*.5,.55,-2.07,'z');}

 // Toothed ram plough: a bent hazard-striped blade on push arms, teeth angled into the ground.
 const profile=new THREE.Shape([new THREE.Vector2(2.42,-.64),new THREE.Vector2(2.3,-.2),new THREE.Vector2(2.12,.12),new THREE.Vector2(2.04,.12),new THREE.Vector2(2.22,-.2),new THREE.Vector2(2.34,-.64)]);
 const blade=new THREE.ExtrudeGeometry(profile,{depth:3.3,bevelEnabled:false});blade.rotateY(-Math.PI/2);add(body,blade,hazard,1.65);
 for(const side of [-1,1]){const wing=box(body,hazard,side*1.72,-.26,2.2,.07,.76,.42);wing.rotation.y=side*.45;rod(body,armor,[side*.95,-.05,2.0],[side*.95,-.3,2.28],.07);rod(body,armor,[side*.95,-.3,1.9],[side*.95,-.45,2.3],.06);
  if(high){rod(body,steel,[side*.5,.12,1.98],[side*.5,-.05,2.2],.035);cyl(body,dark,side*.5,.1,2.0,.06,.14);for(let k=0;k<4;k++)bolt(body,side*(.3+k*.35),.02,2.1,'z');}}
 for(let i=0;i<8;i++){const tooth=add(body,new THREE.ConeGeometry(.1,.3,4),metal,-1.4+i*.4,-.63,2.48);tooth.rotation.x=Math.PI/2+.4;}
 if(high){const chain=(a,b,sag,count,out)=>{for(let i=0;i<count;i++){const t=i/(count-1),p=V(a.x,0,0).lerp(V(b.x,0,0),t);p.y=a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*sag;p.z=a.z+(b.z-a.z)*t;
   const tangent=V(b.x-a.x,(b.y-a.y)-Math.cos(t*Math.PI)*Math.PI*sag,b.z-a.z).normalize(),side=(i%2?out:V(0,1,0)).clone().addScaledVector(tangent,-(i%2?out:V(0,1,0)).dot(tangent)).normalize();
   const link=add(body,new THREE.TorusGeometry(.04,.012,4,8),chainMetal,p.x,p.y,p.z);link.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,side,V().crossVectors(tangent,side)));link.scale.x=1.45;}};
  for(const s of [-1,1])chain(V(s*1.75,.4,-1.5),V(s*1.75,.4,.9),.22,34,V(s,0,0));chain(V(-.95,-.02,2.06),V(.95,-.02,2.06),.16,26,V(0,0,1));}

 // Colossal slab turret with a short bustle.
 turret.position.set(0,.74,-.25);body.add(turret);cyl(turret,dark,0,.02,0,1.15,.14);cyl(turret,steel,0,.09,0,1.1,.04);
 add(turret,loft([
  section(-1.6,.05,.76,[.8,.05],[.95,.25],[.9,.62],[.65,.74]),
  section(-1.4,0,.9,[1.05,0],[1.28,.25],[1.2,.72],[.85,.88]),
  section(.7,0,.9,[1.05,0],[1.28,.25],[1.2,.72],[.85,.88]),
  section(1.35,.02,.72,[.72,.02],[.86,.2],[.8,.6],[.55,.7])]),armor);
 for(const side of [-1,1]){
  const facetUp=V(-side*.168,.986,0),across=V(0,0,-side);
  // Spare track links hung on the rear flank, bricks on the front flank and cheek.
  if(high)grid(turret,links,V(side*1.24,.485,-1.05),across,facetUp,3,3,.28,.12,.06,.03);else grid(turret,links,V(side*1.24,.485,-1.05),across,facetUp,1,1,.9,.42,.06);
  if(high)grid(turret,armor,V(side*1.24,.485,.42),across,facetUp,3,3,.24,.13,.07,.03);else grid(turret,armor,V(side*1.24,.485,.42),across,facetUp,1,1,.78,.45,.07);
  const cheek=V(.543,0,-side*.84);if(high)grid(turret,armor,V(side*1.035,.43,1.025),cheek,V(0,1,0),2,2,.28,.18,.07,.03);else grid(turret,armor,V(side*1.035,.43,1.025),cheek,V(0,1,0),1,1,.6,.4,.07);
  // Smoke dischargers and caged searchlights at the front roof corners.
  for(let k=0;k<3;k++){const c=V(side*1.05,.82,.1+k*.15),d=V(side*.48,.88,0).normalize();pipe(turret,tubes,c.clone().addScaledVector(d,-.14).toArray(),c.clone().addScaledVector(d,.14).toArray(),.055,.042,.2);if(high){const lip=ring(turret,steel,0,0,0,.056,.008,'z',20);lip.position.copy(c).addScaledVector(d,.13);lip.quaternion.setFromUnitVectors(V(0,0,1),d);}}
  const lx=side*.78,ly=1.08,lz=.5;box(turret,metal,lx,.96,lz,.1,.16,.1);cyl(turret,metal,lx,ly,lz,.13,.2,'z');cyl(turret,beam,lx,ly,lz+.101,.105,.01,'z');
  if(high){for(const dz of [.06,.16])ring(turret,steel,lx,ly,lz+dz,.15,.01,'z',14);for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;rod(turret,steel,[lx+Math.cos(a)*.15,ly+Math.sin(a)*.15,lz-.02],[lx+Math.cos(a)*.15,ly+Math.sin(a)*.15,lz+.18],.008);}}
  markings(turret,side,paint,box);
  if(high)for(let k=0;k<9;k++)bolt(turret,side*1.16,.12,-1.3+k*.25);
 }
 // Commander's cupola with a pintle heavy machine gun.
 cyl(turret,armor,-.52,.98,-.3,.34,.2);cyl(turret,armor,-.52,1.1,-.3,.28,.05);
 if(high){for(let k=0;k<7;k++){const a=k/7*Math.PI*2,block=box(turret,glass,-.52+Math.sin(a)*.335,.99,-.3+Math.cos(a)*.335,.12,.07,.03);block.rotation.y=a;}box(turret,armor,-.52,1.35,.3,.42,.28,.03);}
 else cyl(turret,glass,-.52,.99,-.3,.345,.06);
 rod(turret,gunMetal,[-.52,1.1,-.1],[-.52,1.3,.02],.03);box(turret,receiver,-.52,1.32,.1,.12,.14,.34);cyl(turret,gunMetal,-.52,1.34,.6,.025,.7,'z');box(turret,olive,-.65,1.29,.08,.1,.12,.18);
 pipe(turret,gunMetal,[-.52,1.34,.93],[-.52,1.34,1.0],.032,.013,.06,high?14:6);
 if(high){lathe(turret,receiver,[[.036,.3],[.036,.62],[.026,.64]],-.52,1.34,0,16);for(let k=0;k<6;k++)for(let a=0;a<4;a++){const t=a/4*Math.PI*2+.4,hole=cyl(turret,dark,-.52+Math.cos(t)*.0362,1.34+Math.sin(t)*.0362,.34+k*.05,.008,.004,'y',.008,6);hole.quaternion.setFromUnitVectors(V(0,1,0),V(Math.cos(t),Math.sin(t),0));}
  box(turret,receiver,-.52,1.405,.14,.1,.02,.2);for(const x of [-.04,.04])rod(turret,gunMetal,[-.52+x,1.32,-.07],[-.52+x,1.27,-.15],.012);rod(turret,gunMetal,[-.56,1.27,-.15],[-.48,1.27,-.15],.012);box(turret,gunMetal,-.52,1.38,.9,.008,.05,.012);box(turret,gunMetal,-.45,1.34,.16,.03,.02,.04);}
 // Roof rocket pod on a pylon, twelve tubes facing forward.
 box(turret,metal,.62,1.0,-.85,.12,.24,.2);box(turret,armor,.62,1.36,-.87,.62,.48,.68);
 // Front face cut with twelve tube openings; each bore shows the nose of a loaded rocket inside.
 const podHoles=[];for(let i=0;i<4;i++)for(let j=0;j<3;j++)podHoles.push([-.19+i*.127,-.13+j*.13]);holedPlate(turret,armor,.62,1.36,-.53,.62,.48,.04,podHoles,.05);
 for(const [hx,hy] of podHoles){lathe(turret,bore,[[.05,0],[.05,-.34],[0,-.34]],.62+hx,1.36+hy,-.49,high?14:6);const nose=add(turret,new THREE.ConeGeometry(.04,.1,high?12:6).rotateX(Math.PI/2),red,.62+hx,1.36+hy,-.62);if(high)ring(turret,steel,.62+hx,1.36+hy,-.487,.054,.008,'z',12);}
 if(high)rod(turret,steel,[.36,.9,-.6],[.4,1.14,-.6],.02);
 // Bustle rack with jerry cans and bedrolls, and the aerials.
 box(turret,bedroll,-.35,.45,-1.75,.5,.3,.26);box(turret,olive,.12,.45,-1.72,.3,.34,.2);box(turret,red,.45,.45,-1.72,.3,.34,.2);
 if(high){for(const x of [-.7,-.3,.1,.5,.8])rod(turret,steel,[x,.2,-1.58],[x,.66,-1.9],.014);rod(turret,steel,[-.8,.66,-1.9],[.8,.66,-1.9],.014);rod(turret,steel,[-.8,.3,-1.66],[.8,.3,-1.66],.014);cyl(turret,bedroll,-.35,.7,-1.78,.12,.5,'x');}
 const aerial=rod(turret,dark,[-.8,.8,-1.3],[-.86,2.5,-1.36],.01);aerial.name='radio-aerial';rod(turret,dark,[.9,.8,-1.2],[.93,1.9,-1.24],.008);

 if(high){cyl(turret,armor,.45,.95,.3,.2,.1);cyl(turret,steel,.2,.95,-.4,.12,.08);for(const x of [-.9,.9])for(const z of [-1.2,-.6,0,.6])bolt(turret,x,.9,z,'y');}

 // Main gun: huge mantlet, fume extractor and a box muzzle brake, flanked by twin autocannon pods.
 gun.position.set(0,.45,1.28);turret.add(gun);box(gun,armor,0,0,.12,1.0,.62,.5);cyl(gun,metal,0,0,.5,.26,.3,'z');cyl(gun,armor,0,0,.72,.21,.2,'z');
 lathe(gun,armor,[[0,.65],[.15,.65],[.13,3.55],[.07,3.55]]);lathe(gun,bore,[[.07,3.55],[.07,2.1],[0,2.1]]);cyl(gun,armor,0,0,1.75,.21,.5,'z');cyl(gun,armor,0,0,1.44,.15,.12,'z',.21);cyl(gun,armor,0,0,2.06,.21,.12,'z',.14);
 // Box brake: holed baffles front, middle and rear between top and bottom plates; the sides stay open.
 for(const [z,d] of [[3.5,.08],[3.74,.06],[3.98,.08]])holedPlate(gun,metal,0,0,z,.56,.35,d,[[0,0]],.08);for(const y of [-.19,.19])box(gun,metal,0,y,3.78,.56,.05,.56);
 if(high){for(const z of [1.2,2.5,3.1])ring(gun,metal,0,0,z,z<2?.16:.145,.018);box(gun,metal,0,.225,3.78,.5,.03,.5);for(const s of [-1,1])for(const y of [-.2,.2])bolt(gun,s*.4,y,.38,'z');}
 for(const s of [-1,1]){box(gun,armor,s*.72,-.04,.2,.34,.34,.6);cyl(gun,gunMetal,s*.72,-.04,1.0,.045,1.0,'z');pipe(gun,receiver,[s*.72,-.04,1.47],[s*.72,-.04,1.58],.06,.026,.09);if(high)for(const z of [.62,.8,.98])ring(gun,gunMetal,s*.72,-.04,z,.05,.01,'z',12);}
 const muzzlePoint=new THREE.Object3D();muzzlePoint.name='main-gun-muzzle';muzzlePoint.position.z=4.1;gun.add(muzzlePoint);

 batch(body,new Set([turret,...wheels]));batch(turret,new Set([gun]));batch(gun);
 let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});root.userData.triangles=triangles;
 return {root,body,turret,gun,muzzlePoint,wheels,armor,exhausts};
}

// Worn gunmetal armour: generated albedo/normal/roughness/specular in the showroom, albedo plus
// bump in gameplay. Road grime darkens and browns everything low on the hull.
function marauderArmor(maps,enemy,high){
 const armor=high?new THREE.MeshPhysicalMaterial({map:maps.albedo||null,normalMap:maps.normal||null,normalScale:new THREE.Vector2(.7,.7),roughnessMap:maps.roughness||null,roughness:1,metalness:.2,specularColorMap:maps.specular||null,specularIntensity:1,envMapIntensity:.8})
  :new THREE.MeshStandardMaterial({map:maps.albedo||null,bumpMap:maps.bump||null,bumpScale:.8,roughness:.85,metalness:.05});
 armor.color.setHex(enemy?(high?0xd8ab96:0xffd2bc):(high?0xb4b9a6:0xf4f6ea));armor.userData.projectUV={scale:.42};
 armor.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vGrime;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGrime=position.y;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGrime;').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11))),diffuseColor.rgb,.6);\n diffuseColor.rgb*=mix(vec3(.6,.5,.4),vec3(1.),smoothstep(-.7,.4,vGrime));');
 };
 armor.customProgramCacheKey=()=>'marauder-grime';
 return armor;
}
// Hazard stripes are placed as one tile across the blade, so its wrap seam never shows.
function hazardPaint(maps,high){
 const paint=high?new THREE.MeshPhysicalMaterial({map:maps.hazard||null,normalMap:maps.normal||null,normalScale:new THREE.Vector2(.5,.5),roughnessMap:maps.roughness||null,roughness:1,metalness:.2,envMapIntensity:.7})
  :new THREE.MeshStandardMaterial({map:maps.hazard||null,bumpMap:maps.bump||null,bumpScale:.8,roughness:.8,metalness:.15});
 paint.userData.projectUV={scale:.3,offset:[.5,.5]};return paint;
}
function markings(turret,side,paint,box){
 // Stencilled "07" and the heavy triangle between the track links and the bricks.
 const normal=new THREE.Vector3(side*.986,.168,0),across=new THREE.Vector3(0,1,0).cross(normal).normalize(),group=new THREE.Group();group.position.set(side*1.24,.485,-.3).addScaledVector(normal,.006);
 group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,normal.clone().cross(across),normal));group.scale.setScalar(.95);turret.add(group);
 const coords=[[0,.14,.11,.024],[.055,.07,.024,.12],[-.055,.07,.024,.12],[0,0,.11,.024],[-.055,-.07,.024,.12],[.055,-.07,.024,.12],[0,-.14,.11,.024]],segments={'0':[0,1,2,4,5,6],'7':[0,1,5]};
 const digit=(value,x)=>{for(const i of segments[value]){const [dx,dy,w,h]=coords[i];box(group,paint,x+dx,dy,0,w,h,.006);}};
 digit('0',-.19);digit('7',-.03);
 const triangle=new THREE.Shape([new THREE.Vector2(-.1,-.08),new THREE.Vector2(.1,-.08),new THREE.Vector2(0,.1)]);triangle.holes.push(new THREE.Path([new THREE.Vector2(-.055,-.052),new THREE.Vector2(0,.045),new THREE.Vector2(.055,-.052)]));
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(triangle),paint);mesh.position.set(.18,0,.004);group.add(mesh);flatten(group);
}
