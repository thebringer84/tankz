import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {loft,trackLoop,band,flatten,batch,gearMaterial} from './tank-geometry.js';
import {createDrone} from './recon-drone.js';

// Kestrel: a low faceted recon hull, unmanned wedge turret, sensor mast, active protection
// launchers and a docked recon drone (concept-art/08-kestrel-scout.png). Both detail levels
// share dimensions, pivots and the muzzle; showroom detail adds chevron track lugs, wheel
// hardware, lenses, seams, bolts and stowage rather than changing the silhouette.
export function createKestrel(materials,enemy=false,detail='low'){
 const high=detail==='high',segments=high?28:10,root=new THREE.Group(),body=new THREE.Group(),turret=new THREE.Group(),gun=new THREE.Group(),wheels=[];
 root.name='Kestrel';root.userData.detail=detail;root.add(body);body.position.y=-.2;
 const gearMaps=materials.vanguard||{},armor=kestrelArmor(materials.kestrel||{},enemy,high),dark=gearMaterial(gearMaps,high,0x3a3935,.4,1.6),steel=gearMaterial(gearMaps,high,0xc8c6be,.8,1.6),track=gearMaterial(gearMaps,high,0x5a5650,0,1.8);
 const canvas=new THREE.MeshStandardMaterial({map:gearMaps.canvas||null,normalMap:high?gearMaps.canvasNormal||null:null,bumpMap:high?null:gearMaps.canvasBump||null,color:0xd8d0b4,roughness:1});canvas.userData.projectUV={scale:1.6};
 const paint=new THREE.MeshStandardMaterial({color:0xe3dbc0,roughness:.95});
 // Coated optical glass: near-black, glossy, with a thin-film sheen; lamps are emissive LED segments behind clear covers.
 const glass=high?new THREE.MeshPhysicalMaterial({color:0x03070a,roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.02,iridescence:.7,iridescenceIOR:1.8,iridescenceThicknessRange:[260,520],envMapIntensity:.9,emissive:0x07262b,emissiveIntensity:.35})
  :new THREE.MeshStandardMaterial({color:0x06101a,roughness:.1,metalness:.5,emissive:0x0a2c34,emissiveIntensity:.3});
 const led=new THREE.MeshStandardMaterial({color:0xeef8ff,emissive:0xd8efff,emissiveIntensity:high?3.2:2.4});
 const tail=new THREE.MeshStandardMaterial({color:0xff4a30,emissive:0xff2410,emissiveIntensity:high?3.4:2.4});
 const cover=high?new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.06,metalness:0,transparent:true,opacity:.22,clearcoat:1,envMapIntensity:1.2,depthWrite:false}):null;
 const radarFace=new THREE.MeshStandardMaterial({color:0x151816,roughness:.72,metalness:.1,normalMap:high?gearMaps.gearNormal||null:null,normalScale:new THREE.Vector2(.25,.25)});radarFace.userData.projectUV={scale:3};
 const bezel=new THREE.MeshStandardMaterial({color:0x151816,roughness:.5,metalness:.6}),bore=new THREE.MeshStandardMaterial({color:0x050505,roughness:.75,metalness:.3,envMapIntensity:.15,side:THREE.DoubleSide});
 const amber=new THREE.MeshStandardMaterial({color:0xffa640,emissive:0xc86a12,emissiveIntensity:.9});
 const add=(parent,geo,mat,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(p,m,x,y,z,w,h,d)=>add(p,high?new RoundedBoxGeometry(w,h,d,1,Math.min(.015,w*.2,h*.2,d*.2)):new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(p,m,x,y,z,r,h,axis='y',top=r,sides=segments)=>{const geo=new THREE.CylinderGeometry(top,r,h,sides);if(axis==='x')geo.rotateZ(Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);return add(p,geo,m,x,y,z);};
 const ring=(p,m,x,y,z,r,t,axis='z')=>{const geo=new THREE.TorusGeometry(r,t,high?6:3,segments);if(axis==='x')geo.rotateY(Math.PI/2);if(axis==='y')geo.rotateX(Math.PI/2);return add(p,geo,m,x,y,z);};
 // Lathe profiles are [radius, axial] pairs along +z; a dark bore lathe makes any tube end a real opening.
 const lathe=(p,m,profile,x=0,y=0,z=0,sides=segments)=>add(p,new THREE.LatheGeometry(profile.map(([r,a])=>new THREE.Vector2(r,a)),sides).rotateX(Math.PI/2),m,x,y,z);
 // Lamp: dark bezel recessed into the plate, emissive LED segments and a clear cover over them.
 const lamp=(p,m,x,y,z,w,h,dir,count)=>{box(p,bezel,x,y,z,w+.04,h+.035,.035);for(let i=0;i<count;i++){const seg=(w-.01)/count;box(p,m,x-w/2+seg*(i+.5)+.005,y,z+dir*.012,seg*.82,h,.02);}if(cover)add(p,new THREE.BoxGeometry(w+.012,h+.012,.006),cover,x,y,z+dir*.024).castShadow=false;};
 const rod=(p,m,a,b,r=.02)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.sub(from);const mesh=cyl(p,m,0,0,0,r,delta.length(),'y',r,high?8:5);mesh.position.copy(from).addScaledVector(delta,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;};
 const bolt=(p,x,y,z,axis='x')=>{const geo=new THREE.CylinderGeometry(.022,.022,.018,6);if(axis==='x')geo.rotateZ(Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);add(p,geo,steel,x,y,z);};
 // Cross-section: bottom centre, one side's points upward, top centre, then the mirror.
 const section=(z,bottom,top,...side)=>({z,points:[[0,bottom],...side,[0,top],...side.slice().reverse().map(([x,y])=>[-x,y])]});

 // Wedge hull: sponsons overhang the tracks, the deck crowns slightly and the nose rakes down hard.
 add(body,loft([
  section(-1.95,-.36,.36,[.74,-.34],[.86,-.02],[1.42,.1],[1.48,.2],[1.22,.34]),
  section(-1.8,-.5,.45,[.8,-.48],[.92,-.02],[1.5,.1],[1.58,.22],[1.3,.42]),
  section(1.05,-.5,.47,[.8,-.48],[.92,-.02],[1.5,.1],[1.58,.22],[1.3,.42]),
  section(1.72,-.46,.15,[.76,-.44],[.88,-.02],[1.44,.1],[1.5,.13],[1.22,.14]),
  section(1.98,-.3,-.02,[.58,-.28],[.66,-.14],[1,-.06],[1.04,-.04],[.84,-.03])]),armor);
 for(const side of [-1,1]){
  // Continuous rubber band track around idler, six road wheels, sprocket and return rollers.
  const roadZ=[-1.25,-.75,-.25,.25,.75,1.25],circles=[[-1.7,-.32,.22],...roadZ.map(z=>[z,-.46,.23]),[1.7,-.3,.24],[-.62,-.16,.06],[.62,-.16,.06]];
  const loop=trackLoop(circles,high?180:60),thickness=.06;add(body,band(loop,.46,thickness),track,side*1.2);
  const lugCount=high?84:36;for(let i=0;i<lugCount;i++){const {p,n}=loop[Math.round(i*loop.length/lugCount)%loop.length],basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,n[1],n[0]),new THREE.Vector3(0,-n[0],n[1]));
   const lug=(x,out,w,h,d,yaw=0)=>{const mesh=add(body,new THREE.BoxGeometry(w,h,d),track,side*1.2+x,p[1]+n[1]*out,p[0]+n[0]*out);mesh.quaternion.setFromRotationMatrix(basis);mesh.rotateY(yaw);};
   if(high){for(const s of [-1,1])lug(s*.11,thickness+.016,.22,.032,.05,s*.38);if(i%2===0)lug(0,-.035,.05,.07,.06);}else lug(0,thickness+.014,.42,.028,.07);
  }
  const wheel=(z,y,r)=>{const group=new THREE.Group();group.position.set(side*1.2,y,z);body.add(group);wheels.push(group);
   if(high){for(const dx of [-.115,.115])cyl(group,track,dx,0,0,r,.17,'x');for(const s of [-1,1])cyl(group,armor,s*.205,0,0,r*.84,.012,'x');ring(group,steel,side*.212,0,0,r*.84,.01,'x');cyl(group,steel,side*.22,0,0,r*.3,.05,'x');cyl(group,dark,side*.25,0,0,r*.13,.02,'x');
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2;cyl(group,dark,side*.21,Math.sin(a)*r*.55,Math.cos(a)*r*.55,r*.14,.014,'x');bolt(group,side*.25,Math.sin(a+.5)*r*.2,Math.cos(a+.5)*r*.2);}}
   else{cyl(group,track,0,0,0,r,.4,'x');cyl(group,armor,side*.205,0,0,r*.84,.012,'x');cyl(group,steel,side*.22,0,0,r*.3,.05,'x');}
   batch(group);};
  wheel(-1.7,-.32,.22);for(const z of roadZ)wheel(z,-.46,.23);
  // Toothed drive sprocket at the front, as on the reference.
  const sprocket=new THREE.Group();sprocket.position.set(side*1.2,-.3,1.7);body.add(sprocket);wheels.push(sprocket);cyl(sprocket,steel,0,0,0,.12,.38,'x');cyl(sprocket,armor,side*.2,0,0,.1,.03,'x');
  for(const dx of [-.12,.12]){cyl(sprocket,steel,dx,0,0,.2,.05,'x');const teeth=high?13:8;for(let k=0;k<teeth;k++){const a=k/teeth*Math.PI*2,tooth=box(sprocket,steel,dx,Math.sin(a)*.215,Math.cos(a)*.215,.05,.07,.06);tooth.rotation.x=Math.PI/2-a;}}
  batch(sprocket);
  if(high)for(const z of [-.62,.62])cyl(body,steel,side*1.2,-.16,z,.06,.2,'x');
  // Flat bolted skirt panels hide the upper run; the front panel rakes up over the sprocket.
  for(let i=0;i<5;i++){const z=-1.45+i*.6;box(body,armor,side*1.57,-.08,z,.05,.52,high?.58:.6);if(high){box(body,track,side*1.57,-.365,z,.04,.06,.56);for(const dz of [-.2,.2])bolt(body,side*1.6,.12,z+dz);box(body,dark,side*1.596,-.08,z+.29,.008,.5,.012);}}
  const rake=new THREE.Shape([new THREE.Vector2(1.25,-.34),new THREE.Vector2(1.45,-.34),new THREE.Vector2(1.72,-.02),new THREE.Vector2(1.72,.18),new THREE.Vector2(1.25,.18)]);const front=new THREE.ExtrudeGeometry(rake,{depth:.05,bevelEnabled:false});front.rotateY(-Math.PI/2);add(body,front,armor,side*1.57+.025);
  if(high){box(body,track,side*1.57,-.18,1.585,.04,.05,.42).rotation.x=-.87;for(const [dz,y] of [[1.38,.12],[1.62,.12],[1.36,-.26]])bolt(body,side*1.6,y,dz);box(body,dark,side*1.596,-.08,1.245,.008,.5,.012);}
  // LED running-light slits, towing shackles and rear tail lights.
  lamp(body,led,side*.78,-.07,1.975,.3,.026,1,high?6:1);lamp(body,led,side*.84,-.125,1.975,.16,.018,1,high?4:1);
  box(body,steel,side*.36,-.2,1.99,.1,.08,.06);ring(body,steel,side*.36,-.27,2.01,.055,.016,'x');
  lamp(body,tail,side*1.1,.18,-1.955,.22,.035,-1,high?5:1);box(body,steel,side*.5,-.25,-1.97,.1,.08,.06);
  // Crew hatches with periscope blocks on the front deck; unmanned turret carries no crew.
  const hatch=box(body,armor,side*.5,.47,1.1,.42,.04,.4);hatch.rotation.x=.05;
  // Seated on the raked glacis: deck height falls from .47 at z=1.05 to .15 at z=1.72.
  const glacisY=z=>.47-(z-1.05)*.478;
  for(let k=0;k<3;k++){const x=side*(.38+k*.12),hood=box(body,armor,x,glacisY(1.3)+.025,1.3,.1,.06,.07);hood.rotation.x=.45;const scope=box(body,glass,x,glacisY(1.3)+.01,1.335,.078,.04,.012);scope.rotation.x=.45;}
  // Cooling louvres either side of the drone pad on the rear deck.
  box(body,dark,side*.74,.44,-1.45,.46,.02,.66);for(let k=0;k<(high?9:3);k++)box(body,steel,side*.74,.452,-1.72+k*.54/(high?8:2),.46,.018,.03);
  if(high){for(const z of [-1.4,-.8,-.2,.4,1])bolt(body,side*1.585,.21,z);rod(body,canvas,[side*1.08,.435,-1.05],[side*1.08,.435,-1.85],.02);box(body,steel,side*1.08,.435,-.95,.12,.03,.16);ring(body,steel,side*1.2,.39,-1.9,.04,.01,'z');}
 }
 // Rear exhaust louvre grille between the tail lights.
 box(body,dark,0,.05,-1.96,.9,.22,.02);for(let k=0;k<(high?7:3);k++)box(body,steel,0,-.03+k*.16/(high?6:2),-1.975,.88,.018,.02);
 if(high){for(const x of [-.95,.95])box(body,dark,0,.462,x>0?1.02:-.95,2.3,.006,.012);for(const x of [-.95,.95])box(body,dark,x,.458,-.4,.012,.006,2.8);box(body,armor,0,.47-(1.52-1.05)*.478+.02,1.52,.26,.05,.12).rotation.x=.45;box(body,glass,0,.47-(1.52-1.05)*.478+.02,1.582,.2,.03,.012).rotation.x=.45;}
 // Recon drone docked on its landing pad.
 cyl(body,dark,0,.472,-1.5,.26,.012);if(high)ring(body,paint,0,.48,-1.5,.21,.01,'y');
 const docked=createDrone(materials.droneComposite||null),drone=docked.root;drone.scale.setScalar(.2);drone.position.set(0,.573,-1.5);drone.rotation.y=.3;body.add(drone);
 drone.traverse(o=>{if(o.isMesh&&o.material.transparent)o.visible=false;});for(const o of [...drone.children])if(!o.visible)drone.remove(o);
 for(const rotor of docked.rotors){rotor.rotation.y=.4;flatten(rotor);}flatten(drone);

 // Low unmanned turret: faceted wedge with a short ammunition bustle.
 turret.position.set(0,.47,.05);turret.scale.set(1.12,1.1,1.1);body.add(turret);cyl(turret,dark,0,.02,0,.8,.14);cyl(turret,steel,0,.08,0,.76,.04);
 const shell=add(turret,loft([
  section(-.95,.1,.45,[.55,.1],[.62,.22],[.58,.38],[.4,.44]),
  section(-.78,.06,.53,[.8,.06],[.92,.2],[.86,.42],[.6,.52]),
  section(.45,.06,.53,[.8,.06],[.92,.2],[.86,.42],[.6,.52]),
  section(.98,.08,.39,[.42,.08],[.5,.18],[.44,.32],[.3,.38])]),armor);
 // Panoramic commander sight drum and the gunner's sight head.
 cyl(turret,armor,-.38,.58,-.15,.2,.1);cyl(turret,dark,-.38,.69,-.15,.17,.14);cyl(turret,armor,-.38,.78,-.15,.19,.04);
 if(high){for(let k=0;k<8;k++){const a=k/8*Math.PI*2,pane=box(turret,glass,-.38+Math.sin(a)*.168,.69,-.15+Math.cos(a)*.168,.1,.07,.02);pane.rotation.y=a;}cyl(turret,steel,-.38,.81,-.15,.06,.03);}
 else cyl(turret,glass,-.38,.69,-.15,.172,.06);
 box(turret,armor,.34,.6,.5,.28,.14,.26);box(turret,glass,.34,.6,.635,.2,.08,.012);if(high)box(turret,armor,.34,.68,.58,.3,.02,.14);
 // Telescoping sensor mast with a spherical electro-optic head.
 cyl(turret,armor,.5,.58,-.62,.1,.1);cyl(turret,steel,.5,.7,-.62,.055,.2);cyl(turret,steel,.5,.86,-.62,.042,.14);add(turret,new THREE.SphereGeometry(.11,high?24:10,high?16:6),armor,.5,.98,-.62);
 cyl(turret,glass,.5,1.0,-.52,.04,.02,'z');if(high){ring(turret,steel,.5,.79,-.62,.058,.012,'y');for(const x of [-.055,.055])cyl(turret,glass,.5+x,.95,-.525,.022,.02,'z');ring(turret,steel,.5,1.0,-.51,.045,.008);}
 // Remote weapon station with coaxial optics and ammunition can.
 cyl(turret,steel,-.45,.57,-.62,.12,.08);box(turret,dark,-.45,.7,-.6,.16,.16,.26);cyl(turret,steel,-.45,.72,-.25,.02,.44,'z');box(turret,dark,-.58,.68,-.62,.08,.12,.16);box(turret,dark,-.36,.74,-.5,.06,.06,.06);box(turret,glass,-.36,.74,-.468,.046,.04,.006);
 if(high){cyl(turret,dark,-.45,.72,-.44,.03,.1,'z');cyl(turret,steel,-.45,.72,-.03,.028,.04,'z');rod(turret,dark,[-.54,.66,-.62],[-.5,.62,-.62],.02);}
 for(const side of [-1,1]){
  // Hard-kill active protection launchers angled outward and forward.
  const aps=new THREE.Group();aps.position.set(side*.72,.6,.3);aps.rotation.y=-side*.5;turret.add(aps);box(aps,armor,-side*.02,0,0,.16,.22,.22);
  const face=new THREE.Shape([new THREE.Vector2(-.11,-.11),new THREE.Vector2(.11,-.11),new THREE.Vector2(.11,.11),new THREE.Vector2(-.11,.11)]);for(const dy of [-.05,.05])for(const dz of [-.05,.05]){const h=new THREE.Path();h.absarc(dz,dy,.035,0,Math.PI*2,true);face.holes.push(h);}
  const plate=new THREE.ExtrudeGeometry(face,{depth:.02,bevelEnabled:false,curveSegments:high?12:5});plate.rotateY(side*Math.PI/2);add(aps,plate,armor,side*.1-side*.02,0,0);
  for(const dy of [-.05,.05])for(const dz of [-.05,.05]){const b=lathe(aps,bore,[[.035,0],[.035,-.09],[0,-.09]],side*.1,dy,dz,high?14:6);b.rotation.y=side*Math.PI/2;if(high)ring(aps,steel,side*.102,dy,dz,.037,.006,'x');}
  flatten(aps);
  // Flat radar tiles on the cheeks and laser warning receivers at each roof corner.
  // Radar tile seated on the cheek: raycast the shell for the exact surface point and facet normal.
  const hit=new THREE.Raycaster(new THREE.Vector3(side*1.4,.27,1.2),new THREE.Vector3(-side*.77,0,-.64).normalize()).intersectObject(new THREE.Mesh(shell.geometry,armor))[0];
  if(hit){const n=hit.face.normal.clone(),v=new THREE.Vector3(0,1,0).addScaledVector(n,-n.y).normalize(),u=new THREE.Vector3().crossVectors(v,n),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,n));
   const tile=(m,w,h,d)=>{const mesh=box(turret,m,0,0,0,w,h,d);mesh.position.copy(hit.point).addScaledVector(n,d/2);mesh.quaternion.copy(q);};tile(armor,.47,.15,.02);const glassTile=box(turret,radarFace,0,0,0,.44,.12,.008);glassTile.position.copy(hit.point).addScaledVector(n,.022);glassTile.quaternion.copy(q);}
  for(const [x,y,z] of [[.66,.53,.42],[.5,.5,-.8]]){add(turret,new THREE.CylinderGeometry(0,.07,.1,4),armor,side*x,y+.05,z);if(high){const lens=box(turret,amber,side*(x+.03),y+.04,z,.012,.03,.03);lens.rotation.z=side*.6;}}
  markings(turret,side,paint,box);
  if(high)for(const z of [-.7,.3])for(const y of [.12,.34])bolt(turret,side*(y<.2?.88:.9),y,z);
 }
 // Bustle stowage basket.
 if(high){for(const x of [-.45,-.15,.15,.45])rod(turret,steel,[x,.12,-.95],[x,.42,-1.18],.012);rod(turret,steel,[-.5,.42,-1.18],[.5,.42,-1.18],.012);for(const x of [-.3,0,.3])box(turret,canvas,x,.28,-1.08,.26,.22,.18);box(turret,dark,0,.28,-1.18,.9,.03,.01);}
 else box(turret,canvas,0,.28,-1.08,.9,.24,.2);
 const aerial=rod(turret,dark,[-.62,.5,-.82],[-.66,1.55,-.88],.008);aerial.name='radio-aerial';rod(turret,dark,[.64,.5,-.3],[.66,1.2,-.32],.006);

 // Narrow mantlet, long slim gun with segmented thermal sleeve and a multi-baffle muzzle brake.
 gun.position.set(0,.28,.9);turret.add(gun);box(gun,armor,0,0,.04,.36,.28,.36);cyl(gun,steel,0,0,.3,.12,.18,'z');
 lathe(gun,armor,[[0,.35],[.066,.35],[.058,2.24],[.075,2.24],[.075,2.36],[.032,2.36]]);lathe(gun,bore,[[.032,2.36],[.032,1.2],[0,1.2]]);cyl(gun,dark,.24,-.02,.35,.025,.3,'z');
 if(high){for(let k=0;k<4;k++){cyl(gun,dark,0,0,.62+k*.36,.079,.31,'z');ring(gun,steel,0,0,.79+k*.36,.074,.012);}box(gun,steel,0,.1,2.2,.05,.04,.08);for(const s of [-1,1])for(const y of [-.09,.09])bolt(gun,s*.18,y,.2);}
 else cyl(gun,dark,0,0,1.15,.079,1.4,'z');
 // Multi-baffle brake: each baffle is a plate with a real bore hole; the sides stay open between them.
 const baffle=new THREE.Shape([new THREE.Vector2(-.12,-.085),new THREE.Vector2(.12,-.085),new THREE.Vector2(.12,.085),new THREE.Vector2(-.12,.085)]),boreHole=new THREE.Path();boreHole.absarc(0,0,.04,0,Math.PI*2,true);baffle.holes.push(boreHole);
 for(const z of [2.36,2.44,2.52])add(gun,new THREE.ExtrudeGeometry(baffle,{depth:.035,bevelEnabled:high,bevelSize:.004,bevelThickness:.004,bevelSegments:1,curveSegments:high?16:6}),steel,0,0,z);
 for(const s of [-1,1])box(gun,steel,0,s*.075,2.455,.24,.02,.19);
 const muzzlePoint=new THREE.Object3D();muzzlePoint.name='main-gun-muzzle';muzzlePoint.position.z=2.56;gun.add(muzzlePoint);

 batch(body,new Set([turret,...wheels]));batch(turret,new Set([gun]));batch(gun);
 let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});root.userData.triangles=triangles;
 return {root,body,turret,gun,muzzlePoint,wheels,armor};
}

// Physically based composite armor: generated albedo/normal/roughness/specular in the showroom,
// albedo plus the generated bump map in gameplay. Angular two-tone camouflage is projected in
// model space, so bands run continuously across facets without extra UV work.
function kestrelArmor(maps,enemy,high){
 const armor=high?new THREE.MeshPhysicalMaterial({map:maps.albedo||null,normalMap:maps.normal||null,normalScale:new THREE.Vector2(.45,.45),roughnessMap:maps.roughness||null,roughness:1,metalness:.08,specularColorMap:maps.specular||null,specularIntensity:1,clearcoat:.08,clearcoatRoughness:.6,envMapIntensity:.9})
  :new THREE.MeshStandardMaterial({map:maps.albedo||null,bumpMap:maps.bump||null,bumpScale:1.5,roughness:.8,metalness:.08});
 armor.color.setHex(enemy?0xc9b596:0xb2b494);armor.userData.projectUV=true;
 const tone=enemy?'.62,.55,.48':'.5,.55,.47';
 armor.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCamo;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCamo=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCamo;\nfloat camoBand(float v,float edge){float w=fwidth(v)*.8;return smoothstep(edge-w,edge+w,fract(v));}')
   .replace('#include <map_fragment>',`#include <map_fragment>
    float camoA=camoBand((vCamo.z+vCamo.y*1.7+abs(vCamo.x)*.35)*.55+.08,.72),camoB=camoBand((vCamo.z-vCamo.y*1.7)*.55+.4,.8)*step(.55,fract(vCamo.z*.27+.3));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11)))*vec3(${tone}),max(camoA,camoB));`);
 };
 armor.customProgramCacheKey=()=>`kestrel-camo-${enemy?1:0}`;
 return armor;
}

function markings(turret,side,paint,box){
 // Stencilled "06" and the scout diamond on the main side facet of the turret.
 const normal=new THREE.Vector3(side*.965,.263,0),group=new THREE.Group();group.position.set(side*.89,.31,-.2).addScaledVector(normal,.004);const across=new THREE.Vector3(0,1,0).cross(normal).normalize();group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,normal.clone().cross(across),normal));group.scale.setScalar(.62);turret.add(group);
 const coords=[[0,.14,.11,.022],[.055,.07,.022,.12],[-.055,.07,.022,.12],[0,0,.11,.022],[-.055,-.07,.022,.12],[.055,-.07,.022,.12],[0,-.14,.11,.022]],segments={'0':[0,1,2,4,5,6],'6':[0,2,3,4,5,6]};
 const digit=(value,x)=>{for(const i of segments[value]){const [dx,dy,w,h]=coords[i];box(group,paint,x+dx,dy,0,w,h,.005);}};
 digit('0',-.1);digit('6',.06);
 const diamond=new THREE.Shape([new THREE.Vector2(0,-.1),new THREE.Vector2(.08,0),new THREE.Vector2(0,.1),new THREE.Vector2(-.08,0)]);diamond.holes.push(new THREE.Path([new THREE.Vector2(0,-.065),new THREE.Vector2(-.048,0),new THREE.Vector2(0,.065),new THREE.Vector2(.048,0)]));
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(diamond),paint);mesh.position.set(.28,0,.003);group.add(mesh);flatten(group);
}
