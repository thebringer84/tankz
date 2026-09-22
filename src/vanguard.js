import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The two meshes share dimensions and articulation. Showroom detail adds hardware,
// individual track pins, wheel rims, welds, tools and stowage rather than changing scale.
export function createVanguard(materials,enemy=false,detail='low'){
 const high=detail==='high',segments=high?24:10,root=new THREE.Group(),body=new THREE.Group(),turret=new THREE.Group(),gun=new THREE.Group(),wheels=[];
 root.name='Vanguard';root.userData.detail=detail;root.add(body);body.position.y=-.2;
 const armor=high?new THREE.MeshPhysicalMaterial({map:materials.armor.map,normalMap:materials.armorNormal,normalScale:new THREE.Vector2(.12,.12),roughnessMap:materials.armorRoughness,roughness:.9,metalness:.12,clearcoat:.06,clearcoatRoughness:.55,envMapIntensity:.85}):materials.armor.clone();armor.color.setHex(enemy?0xc9b99c:(high?0xb5b18a:0xe1ddba));
 const plate=armor.clone();plate.color.setHex(0xc0bc95);const paint=new THREE.MeshStandardMaterial({color:0xe3dbc0,roughness:.97});
 const {dark,track,canvas,rust,lamp}=materials;const steel=high?materials.steel.clone():materials.steel;if(high){steel.roughness=.42;steel.metalness=.85;steel.envMapIntensity=1.1;}
 const add=(parent,geo,mat,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(p,m,x,y,z,w,h,d)=>add(p,high?new RoundedBoxGeometry(w,h,d,1,Math.min(.018,w*.15,h*.15,d*.15)):new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(p,m,x,y,z,r,h,axis='y',top=r)=>{const geo=new THREE.CylinderGeometry(top,r,h,segments);if(axis==='x')geo.rotateZ(Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);return add(p,geo,m,x,y,z);};
 const ring=(p,m,x,y,z,r,t,axis='z')=>{const geo=new THREE.TorusGeometry(r,t,high?6:3,segments);if(axis==='x')geo.rotateY(Math.PI/2);if(axis==='y')geo.rotateX(Math.PI/2);return add(p,geo,m,x,y,z);};
 const rod=(p,m,a,b,r=.02)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.sub(from);const mesh=cyl(p,m,0,0,0,r,delta.length());mesh.position.copy(from).addScaledVector(delta,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;};
 const bolt=(p,x,y,z,axis='z')=>{const geo=new THREE.CylinderGeometry(.035,.035,.025,6);if(axis==='x')geo.rotateZ(Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);add(p,geo,steel,x,y,z);};
 const outline=(w,back,front,cut)=>[[-w+cut,front],[w-cut,front],[w,front-cut],[w,back+cut],[w-cut,back],[-w+cut,back],[-w,back+cut],[-w,front-cut]];
 const shell=(parent,mat,lower,upper,y0,y1)=>{const positions=[],uv=[];const triangle=(a,b,c)=>{positions.push(...a,...c,...b);for(const p of [a,c,b])uv.push(p[0]*.32+p[1]*.23,p[2]*.3+p[1]*.3);};
  const lo=lower.map(p=>[p[0],y0,p[1]]),hi=upper.map(p=>[p[0],y1,p[1]]);for(let i=0;i<8;i++){const j=(i+1)%8;triangle(lo[i],hi[i],lo[j]);triangle(lo[j],hi[i],hi[j]);triangle([0,y1,0],hi[j],hi[i]);triangle([0,y0,0],lo[i],lo[j]);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return add(parent,geo,mat);};
 // Sloped front plate and a stepped engine deck over a narrow lower hull.
 shell(body,armor,outline(.98,-1.72,1.78,.18),outline(1.08,-1.63,1.2,.2),-.32,.52);
 box(body,plate,0,.55,-.82,2.08,.13,1.52);
 const frontPanel=box(body,plate,0,.12,1.515,1.86,.035,.67);frontPanel.rotation.x=.59;
 for(const side of [-1,1]){
  const beltShape=new THREE.Shape();beltShape.moveTo(-1.42,-.46);beltShape.lineTo(1.42,-.46);beltShape.absarc(1.42,0,.46,-Math.PI/2,Math.PI/2,false);beltShape.lineTo(-1.42,.46);beltShape.absarc(-1.42,0,.46,Math.PI/2,Math.PI*1.5,false);
  const hole=new THREE.Path();hole.moveTo(-1.42,-.31);hole.lineTo(1.42,-.31);hole.absarc(1.42,0,.31,-Math.PI/2,Math.PI/2,false);hole.lineTo(-1.42,.31);hole.absarc(-1.42,0,.31,Math.PI/2,Math.PI*1.5,false);beltShape.holes.push(hole);
  const belt=new THREE.ExtrudeGeometry(beltShape,{depth:.62,bevelEnabled:false,curveSegments:high?10:4});belt.translate(0,0,-.31);belt.rotateY(Math.PI/2);add(body,belt,track,side*1.27,-.29,0);
  box(body,armor,side*1.26,.27,-.02,.76,.095,3.5);
  for(const end of [-1,1]){const fender=box(body,plate,side*1.26,.13,end*1.74,.78,.06,.51);fender.rotation.x=end*.48;}
  // Large road wheels, separate raised idlers, and small upper return rollers.
  for(let i=0;i<7;i++){const end=i>=5,z=end?(i===5?-1.5:1.5):-1.15+i*.575,r=end?.32:.39,y=end?-.17:-.36;const wheel=new THREE.Group();wheel.position.set(side*1.29,y,z);body.add(wheel);wheels.push(wheel);
   cyl(wheel,track,0,0,0,r,.48,'x');cyl(wheel,armor,side*.252,0,0,r*.8,.028,'x');cyl(wheel,steel,side*.278,0,0,r*.28,.055,'x');
   if(high){ring(wheel,steel,side*.27,0,0,r*.72,.018,'x');for(let k=0;k<(end?10:8);k++){const a=k/(end?10:8)*Math.PI*2;bolt(wheel,side*.29,Math.sin(a)*r*.56,Math.cos(a)*r*.56,'x');}cyl(wheel,dark,side*.31,0,0,r*.13,.025,'x');}
   batch(wheel);
  }
  for(let i=0;i<3;i++)cyl(body,steel,side*1.58,.055,-.87+i*.87,.14,.055,'x');
  const shoe=(y,z,angle)=>{const plateMesh=box(body,steel,side*1.27,y,z,.65,.055,.13);plateMesh.rotation.x=angle;if(high){const cleat=box(body,track,side*1.27,y+Math.cos(angle)*.033,z+Math.sin(angle)*.033,.49,.035,.058);cleat.rotation.x=angle;cyl(body,steel,side*1.625,y,z,.032,.065,'x');}};
  const count=high?18:12;for(let i=0;i<count;i++)for(const level of [-1,1])shoe(-.29+level*.47,-1.42+(i+.5)*2.84/count,0);
  for(const end of [-1,1])for(let i=0;i<(high?10:6);i++){const a=-Math.PI/2+(i+.5)*Math.PI/(high?10:6);shoe(-.29+.47*Math.sin(a),end*(1.42+.47*Math.cos(a)),Math.atan2(-Math.cos(a),-end*Math.sin(a)));}
  // Fender boxes, lamp guards, towing eyes and rear exhausts.
  for(let i=0;i<2;i++){box(body,armor,side*1.24,.45,-.8+i*.6,.53,.28,.5);box(body,steel,side*1.24,.6,-.8+i*.6,.55,.025,.52);if(high){for(const dz of [-.15,.15])box(body,dark,side*1.24,.48,-.8+i*.6+dz,.55,.04,.045);}}
  cyl(body,dark,side*.88,.37,1.35,.17,.12,'z');cyl(body,lamp,side*.88,.37,1.423,.125,.012,'z');ring(body,steel,side*.88,.37,1.435,.155,.024);
  if(high){rod(body,steel,[side*.88-.17,.37,1.46],[side*.88+.17,.37,1.46],.014);rod(body,steel,[side*.88,.2,1.46],[side*.88,.55,1.46],.014);}
  ring(body,steel,side*.72,-.13,1.8,.11,.036);box(body,armor,side*.72,-.02,1.73,.17,.19,.1);
  cyl(body,rust,side*.77,.3,-1.76,.13,.38,'z');cyl(body,dark,side*.77,.3,-1.96,.094,.02,'z');
 }
 // Driver's visors, segmented radiator grille and rear-mounted equipment.
 for(const side of [-1,1]){const hatch=box(body,plate,side*.5,.57,.54,.61,.085,.49);hatch.rotation.x=.09;box(body,dark,side*.5,.645,.65,.3,.04,.1);box(body,steel,side*.5,.68,.69,.37,.035,.16);}
 box(body,dark,0,.635,-1.07,1.05,.025,.66);for(let i=0;i<(high?14:7);i++)box(body,steel,-.46+i*.92/(high?13:6),.652,-1.07,.035,.018,.6);
 cyl(body,canvas,0,.84,-1.47,.18,1.17,'x');for(const x of [-.38,.38]){box(body,dark,x,1.025,-1.47,.045,.025,.34);box(body,dark,x,.84,-1.285,.045,.32,.022);}
 // Tall, faceted plate turret, wider at its base like the reference concept.
 turret.position.set(0,.6,.1);body.add(turret);cyl(turret,dark,0,.025,0,.87,.14);cyl(turret,steel,0,.11,0,.84,.055);
 shell(turret,armor,outline(1,-.94,.87,.2),outline(.79,-.77,.65,.16),.13,.94);
 box(turret,plate,0,.99,-.05,1.25,.04,1.15);
 box(turret,armor,0,.55,-1.02,1.22,.5,.24);for(const x of [-.44,.44])box(turret,dark,x,.56,-1.155,.04,.52,.035);
 cyl(turret,armor,-.32,1.035,-.31,.3,.15);cyl(turret,steel,-.32,1.13,-.31,.26,.05);cyl(turret,plate,-.32,1.17,-.31,.225,.035);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;const visor=box(turret,dark,-.32+Math.sin(a)*.26,1.09,-.31+Math.cos(a)*.26,.12,.045,.04);visor.rotation.y=a;}
 box(turret,armor,.37,1.025,.2,.32,.09,.39);box(turret,dark,.37,1.09,.34,.19,.055,.085);
 // Rectangular bolted mantlet, tapered cannon and open muzzle collar.
 gun.position.set(0,.55,.7);turret.add(gun);box(gun,plate,0,0,0,.75,.54,.22);cyl(gun,steel,0,0,.18,.255,.27,'z');cyl(gun,armor,0,0,.38,.2,.22,'z');
 cyl(gun,armor,0,0,1.48,.115,2.15,'z',.085);for(const z of [.53,1.37,2.45])cyl(gun,steel,0,0,z,z===.53?.145:.107,.09,'z');
 cyl(gun,paint,0,0,2.15,.104,.11,'z');cyl(gun,steel,0,0,2.66,.145,.26,'z');cyl(gun,dark,0,0,2.797,.098,.009,'z');ring(gun,steel,0,0,2.798,.121,.025);
 for(const side of [-1,1]){box(gun,dark,side*.143,0,2.66,.005,.07,.13);if(high)for(const y of [-.2,.2])bolt(gun,side*.29,y,.12);}
 const muzzlePoint=new THREE.Object3D();muzzlePoint.name='main-gun-muzzle';muzzlePoint.position.z=2.85;gun.add(muzzlePoint);
 cyl(turret,dark,.61,.5,.99,.05,.57,'z');
 for(const side of [-1,1]){for(let i=0;i<3;i++){
   const base=new THREE.Vector3(side*.91,.52,-.56+i*.18),direction=new THREE.Vector3(side*.7,.72,.12).normalize(),tip=base.clone().addScaledVector(direction,.3);
   rod(turret,steel,base.toArray(),tip.toArray(),.065);
   const opening=cyl(turret,dark,...tip.toArray(),.048,.006);opening.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
   const lip=ring(turret,steel,...tip.toArray(),.058,.008,'y');lip.quaternion.copy(opening.quaternion);
  }
  markings(turret,side,paint,box,high);
  if(high){for(const z of [-.65,-.35,0,.35,.62])for(const y of [.24,.78])bolt(turret,side*(y>.5?.855:.975),y,z,'x');for(const z of [-1.4,-.9,-.4,.1,.6,1.2])bolt(body,side*1.1,.41,z,'x');}
 }
 const aerial=rod(turret,dark,[.6,.97,-.6],[.69,2.02,-.69],.009);aerial.name='radio-aerial';
 if(high){
  // Folded shovel, grab handles, weld seams, tow cable and roof machine gun.
  rod(body,canvas,[-1.16,.68,-1.3],[-1.16,.68,-.15],.025);box(body,steel,-1.16,.68,-.02,.22,.04,.25);
  for(const side of [-1,1])for(const z of [-.47,.28]){rod(turret,steel,[side*.56,1.005,z],[side*.56,1.12,z],.014);rod(turret,steel,[side*.56,1.12,z],[side*.56,1.12,z+.19],.014);rod(turret,steel,[side*.56,1.12,z+.19],[side*.56,1.005,z+.19],.014);}
  const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(-.8,.65,-1.72),new THREE.Vector3(-.65,.73,-1.9),new THREE.Vector3(.65,.73,-1.9),new THREE.Vector3(.8,.65,-1.72)]);add(body,new THREE.TubeGeometry(cable,24,.023,5,false),steel);
  for(const side of [-1,1]){rod(turret,steel,[side*.96,.2,-.72],[side*.81,.88,-.63],.009);for(let k=0;k<7;k++)bolt(body,side*.98,.55,-1.45+k*.4);}
  const mount=new THREE.Group();mount.position.set(.28,1.05,-.34);turret.add(mount);cyl(mount,steel,0,.15,0,.035,.3);box(mount,dark,0,.34,.12,.12,.12,.42);cyl(mount,steel,0,.34,.55,.023,.5,'z');box(mount,canvas,-.12,.26,.02,.16,.17,.2);
  for(const side of [-1,1]){box(turret,canvas,side*.52,.66,-1.22,.32,.4,.18);for(const x of [-.1,.1])box(turret,dark,side*.52+x,.66,-1.32,.028,.41,.018);}
 }
 batch(body,new Set([turret,...wheels]));batch(turret,new Set([gun]));batch(gun);
 let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});root.userData.triangles=triangles;
 return {root,body,turret,gun,muzzlePoint,wheels,armor};
}
function markings(turret,side,paint,box,high){
 const group=new THREE.Group();group.position.set(side*.912,.48,-.08);group.rotation.y=side*Math.PI/2;group.rotateX(-.25);turret.add(group);
 const digit=(value,x)=>{const segments={'2':[0,1,3,4,6],'3':[0,1,3,5,6]};const coords=[[0,.14,.11,.022],[.055,.07,.022,.12],[-.055,.07,.022,.12],[0,0,.11,.022],[-.055,-.07,.022,.12],[.055,-.07,.022,.12],[0,-.14,.11,.022]];for(const i of segments[value]){const [dx,dy,w,h]=coords[i];box(group,paint,x+dx,dy,0,w,h,.005);}};
 digit('2',-.1);digit('3',.06);
 const triangle=new THREE.Shape();triangle.moveTo(-.075,-.06);triangle.lineTo(.075,-.06);triangle.lineTo(0,.075);triangle.closePath();const hole=new THREE.Path();hole.moveTo(-.04,-.04);hole.lineTo(0,.03);hole.lineTo(.04,-.04);hole.closePath();triangle.holes.push(hole);const mesh=new THREE.Mesh(new THREE.ShapeGeometry(triangle),paint);mesh.position.set(.26,0,.003);group.add(mesh);batch(group);
}
function batch(group,exclude=new Set()){
 const materials=new Map();for(const child of [...group.children]){if(!child.isMesh||exclude.has(child))continue;child.updateMatrix();let geo=child.geometry.clone().applyMatrix4(child.matrix);if(geo.index){const original=geo;geo=geo.toNonIndexed();original.dispose();}if(!materials.has(child.material))materials.set(child.material,[]);materials.get(child.material).push(geo);child.geometry.dispose();group.remove(child);}
 for(const [material,geos] of materials){const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
}
