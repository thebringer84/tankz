import * as THREE from 'three';
import {createBurningFlame} from './fire.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function buildShowroom(game){
 RectAreaLightUniformsLib.init();const root=new THREE.Group();root.name='industrial-showroom';const tank=game.player.root.position;root.position.set(tank.x,tank.y-.99*game.player.cfg.scale,tank.z);game.root.add(root);
 const materials=game.materials,texture=game.textures.concrete.clone();texture.repeat.set(5,5);texture.needsUpdate=true;
 const concrete=new THREE.MeshStandardMaterial({map:texture,color:0x6e7067,roughness:.72,metalness:.05});
 const wall=new THREE.MeshStandardMaterial({map:game.textures.concrete,color:0x55564d,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x363c38,roughness:.45,metalness:.78});
 const rusty=new THREE.MeshStandardMaterial({map:game.textures.armor,color:0x977653,roughness:.67,metalness:.5});
 const rubber=new THREE.MeshStandardMaterial({color:0x181d1b,roughness:.95});const yellow=new THREE.MeshStandardMaterial({color:0xc5a05a,roughness:.86});
 const add=(geo,mat,x,y,z,parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(m,x,y,z,w,h,d,parent=root)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cylinder=(m,x,y,z,r,h,parent=root)=>add(new THREE.CylinderGeometry(r,r,h,20),m,x,y,z,parent);
 const beam=(a,b,width=.13)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.sub(va);const m=box(iron,0,0,0,width,delta.length(),width);m.position.copy(va).addScaledVector(delta,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());};
 const floor=box(concrete,0,-.12,0,25,.24,27);floor.name='service-bay-floor';
 for(let x=-10;x<=10;x+=3)box(rubber,x,.004,0,.012,.005,25);for(let z=-12;z<=12;z+=3)box(rubber,0,.004,z,24,.005,.012);
 // Paint and recessed steel grating define a real service bay beneath the tank.
 for(const side of [-1,1]){box(yellow,side*2.35,.009,0,.045,.012,6.6);box(iron,side*2.72,.012,.2,.32,.02,6);for(let z=-2.65;z<3;z+=.18)box(rubber,side*2.72,.027,z,.28,.012,.06);}
 for(const z of [-3.3,3.3])for(let x=-2.3;x<2.3;x+=.3){const stripe=box(yellow,x,.012,z,.12,.016,.36);stripe.rotation.y=-.55;}
 // Rear hangar door opens onto bright desert, framed by corrugated steel and girders.
 box(wall,5.9,3.7,7,7.2,7.4,.3);box(wall,-9,3.7,7,2,7.4,.3);box(iron,-3.2,6.8,7,9.4,1,.45);
 box(wall,-10,3.8,0,.3,7.6,14);box(wall,10,3.8,0,.3,7.6,14);
 for(let x=2.5;x<9.5;x+=.3)box(iron,x,3.5,6.77,.045,6.7,.06);
 for(const x of [-9.7,-7.8,1.7,9.7]){box(rusty,x,3.9,6.65,.26,7.8,.36);box(iron,x,.12,6.65,.6,.24,.7);for(const y of [.3,1.2,3.4,6.4])cylinder(iron,x,y,6.4,.04,.025).rotation.x=Math.PI/2;}
 for(const z of [-4,1,6]){box(iron,0,7.5,z,20,.25,.28);beam([-9,6.7,z],[0,8.3,z]);beam([0,8.3,z],[9,6.7,z]);for(let x=-8;x<8;x+=2)beam([x,7.5,z],[x+1,8.15-Math.abs(x)*.05,z],.065);}
 // Door exterior: a sandy apron and distant, hazy sandstone silhouettes.
 const sand=new THREE.MeshStandardMaterial({map:game.textures.sand,color:0x9e8b77,roughness:1});box(sand,-3,-.16,30,100,.2,80);

 const sky=new THREE.Mesh(new THREE.SphereGeometry(160,48,24),new THREE.MeshBasicMaterial({map:game.textures.showroomSky,side:THREE.BackSide,fog:false,depthWrite:false}));sky.position.y=3;sky.rotation.y=.8;sky.renderOrder=-10;root.add(sky);
 // Three-dimensional wrecked depot outside; only the remote skyline uses cards.
 const facade=new THREE.MeshStandardMaterial({map:game.textures.concrete,color:0xa09179,roughness:1});
 const trim=new THREE.MeshStandardMaterial({color:0x595749,roughness:.9});
 // Low-poly berms and scattered sandstone carry the foreground into the distant sky.
 for(let i=0;i<17;i++){const hill=add(new THREE.DodecahedronGeometry(1,1),sand,-42+i*5.5,-1.5,48+(i%3)*5);hill.scale.set(7,2.5+(i%4)*.7,8);hill.rotation.y=i*.7;}
 for(let i=0;i<32;i++){const x=-18+((i*13)%35),z=9+((i*17)%32);const rock=add(new THREE.DodecahedronGeometry(.16+(i%5)*.09,0),materials.rock,x,.1,z);rock.scale.set(1.3,.7,1);rock.rotation.set(i,.3*i,.2);}
 for(let i=0;i<13;i++){const x=-16+((i*7)%29),z=11+((i*11)%24);for(let j=0;j<3;j++){const shrub=add(new THREE.IcosahedronGeometry(.17,0),trim,x+Math.sin(j*2)*.13,.13,z+Math.cos(j*2)*.13);shrub.scale.set(1,.8,1);}}
 // Broken wall sections, exposed slabs, roof beams and genuine open interiors.
 for(const [x,z,w,h] of [[-13,21,6,4.2],[-4.5,25,5.8,3.5],[5,29,6,4.7]]){
  const building=new THREE.Group();building.position.set(x,0,z);building.rotation.y=x<0?.18:-.22;root.add(building);
  box(facade,0,.05,0,w,.18,5,building);
  box(facade,-w/2,h/2,0,.35,h,5,building);box(facade,w/2,h*.32,.7,.35,h*.64,3.6,building);
  box(facade,0,h*.4,2.35,w,h*.8,.35,building);
  for(const side of [-1,1])box(facade,side*(w/2-.65),h*.4,-2.3,1.3,h*.8,.38,building);
  box(facade,-w*.2,h-.35,-2.3,w*.6,.7,.38,building);
  const slab=box(facade,w*.23,.6,-.2,w*.45,.2,3.2,building);slab.rotation.z=-.31;
  for(let i=0;i<9;i++){const chunk=add(new THREE.DodecahedronGeometry(.25+(i%3)*.15,0),facade,Math.sin(i*7)*w*.52,.2,-2.5+Math.cos(i*9)*1.8,building);chunk.scale.set(1,.65,1.4);chunk.rotation.set(i*.7,i,.3);}
  for(let i=0;i<4;i++){const rebar=cylinder(iron,0,0,0,.016,.9);building.add(rebar);rebar.position.set(w/2,h*.64+.35,-.6+i*.5);rebar.rotation.z=.1+i*.12;}
 }
 for(const [x,z] of [[-8,13],[-3,18],[2,21]]){const barrier=box(facade,x,.45,z,2.4,.9,.7);barrier.rotation.y=.35;for(const side of [-1,1])box(trim,x+side*.85,.08,z,.35,.16,1);}
 // Tire piles burn independently of combat, reusing the generated VFX textures.
 const fires=[];
 for(const [x,z] of [[-11,19]]){
  for(let i=0;i<4;i++){const tire=add(new THREE.TorusGeometry(.35,.14,8,16),rubber,x+(i<2?(i-.5)*.64:0),.145+(i<2?0:(i-1)*.25),z+(i<2?0:.08));tire.rotation.x=Math.PI/2;tire.rotation.y=i===3?.12:0;}
  const light=new THREE.PointLight(0xff7926,65,9,2);light.position.set(x,1,z);root.add(light);
  const flames=[];for(let i=0;i<4;i++){const flame=createBurningFlame(game.textures.fireAtlas,i*.67);flame.position.set(x+Math.sin(i*2.4)*.35,.16+(i%2)*.12,z+Math.cos(i*2.4)*.28);root.add(flame);flames.push(flame);}
  fires.push({position:new THREE.Vector3(x,.8,z).add(root.position),light,flames});
 }
 let emission=0,age=0;
 root.userData.update=dt=>{age+=dt;emission+=dt;for(const fire of fires){fire.light.intensity=55+Math.sin(age*17)*8+Math.sin(age*29)*6;fire.flames.forEach(flame=>{flame.material.uniforms.time.value=age;});}

  // A showroom Marauder idles with a thin plume from each stack.
  if(game.player.exhausts&&game.fx.rand()<dt*6){game.player.root.updateMatrixWorld();for(const e of game.player.exhausts)game.fx.emit(e.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,1.2,-.2),0x3b3935,.25,2.4,'smoke');}
  while(emission>=.11){emission-=.11;for(const fire of fires){const p=fire.position.clone().add(new THREE.Vector3((game.fx.rand()-.5)*.45,.5,(game.fx.rand()-.5)*.45));game.fx.emit(p,new THREE.Vector3(.6,2.4,.12),0x302e2d,1.4,14,'smoke');const smoke=game.fx.particles.at(-1);smoke.plume=true;if(game.fx.rand()<.2)game.fx.emit(p,new THREE.Vector3(.5,3.5,0),0xffb34f,.04,.65,'ember');}}
 };
 // Start with an established smoke column, rather than growing it from zero on entry.
 for(const fire of fires)for(let i=0;i<28;i++){const t=i*.45;game.fx.emit(fire.position.clone().add(new THREE.Vector3(t*.32,1+t*1.65,t*.06)),new THREE.Vector3(.6,2.4,.12),0x302e2d,1.4,14,'smoke');const smoke=game.fx.particles.at(-1);smoke.plume=true;smoke.life=14-t;}
 const poleMat=new THREE.MeshBasicMaterial({color:0x51564f});
 for(const x of [-17,-5,8]){cylinder(poleMat,x,3,24,.055,6);box(poleMat,x,5.7,24,1.3,.065,.065);}
 for(const z of [23.8,24.2]){const points=[];for(let i=0;i<=32;i++){const x=-17+25*i/32;points.push(new THREE.Vector3(x,5.65-.7*Math.abs(Math.sin((x+17)/12.5*Math.PI)),z));}root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x454c47})));}
 // Soft-edged oil and dust deposits break up the clean concrete.
 const stainMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float noise=sin(vUv.x*43.)*sin(vUv.y*37.);gl_FragColor=vec4(.035,.029,.021,(1.-smoothstep(.25,.95,r+noise*.055))*.32);}' });
 for(let i=0;i<18;i++){const stain=add(new THREE.PlaneGeometry(1,1),stainMaterial,Math.sin(i*13.1)*6,.018,Math.cos(i*8.3)*5);stain.rotation.x=-Math.PI/2;stain.scale.set(1+(i%4)*.7,.6+(i%3)*.4,1);stain.castShadow=stain.receiveShadow=false;}
 // Workshop storage and maintenance props stay around the edges of the composition.
 const crate=(x,z,w=1.1,h=.75)=>{const m=add(new RoundedBoxGeometry(w,h,.75,1,.035),rusty,x,h/2,z);for(const side of [-1,1])box(iron,x+side*w*.3,h/2,z,.035,h+.02,.77);box(iron,x,h+.02,z,w+.02,.035,.77);return m;};
 crate(-5.8,3.5);crate(-6.8,4.4,1.3,.85);crate(-5.3,4.55,.9,.6);crate(5,4.1);crate(6.3,4.3,1.4,.75);
 for(const [x,z] of [[5.8,2.2],[6.8,2.55],[-6,5.5]]){cylinder(rusty,x,.65,z,.42,1.3);for(const y of [.1,.4,1,1.25])cylinder(iron,x,y,z,.432,.035);cylinder(iron,x+.16,1.315,z,.065,.022);}
 box(iron,6.1,1.45,-.15,3.2,.13,1.1);for(const x of [4.7,7.5])for(const z of [-.56,.25])box(iron,x,.7,z,.1,1.4,.1);for(let i=0;i<5;i++)box(rusty,5+i*.42,1.6,-.15,.18,.15,.32);
 // Stencilled fabric banner and bay designation echo the approved concept.
 const sign=(text,w,h,x,y,z)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const c=canvas.getContext('2d');c.fillStyle='#343a30';c.fillRect(0,0,512,768);c.strokeStyle='#9a9573';c.lineWidth=4;c.strokeRect(24,24,464,720);c.fillStyle='#c8c0a0';c.textAlign='center';c.font='bold 85px Impact, sans-serif';text.split('\n').forEach((line,i)=>c.fillText(line,256,240+i*115));c.font='22px monospace';c.fillText('DUSTLINE / FIELD WORKS',256,690);for(let i=0;i<1000;i++){c.fillStyle=i%2?'#20291e35':'#b1a58a20';c.fillRect((i*137)%512,(i*227)%768,2+(i%9),1+(i%3));}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;const m=add(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide}),x,y,z);m.castShadow=false;m.rotation.y=Math.PI;return m;};
 sign('BUILT\nTO\nENDURE.',2.1,3.3,5.3,3.5,6.55);sign('BAY\n023',1.1,1.5,-8.85,3.3,6.5);
 for(let y=.3;y<12;y+=.38)beam([-7.2,y,6.8],[-6.65,y,6.8],.045);beam([-7.2,.1,6.8],[-7.2,12.3,6.8],.05);beam([-6.65,.1,6.8],[-6.65,12.3,6.8],.05);
 for(const y of [.8,3.2,5.7,7.6])for(const x of [-7.2,-6.65])beam([x,y,6.8],[-7.8,y,7],.05);
 const emitter=new THREE.MeshStandardMaterial({color:0xffdfab,emissive:0xffb45f,emissiveIntensity:5});
 for(const [x,z] of [[-5,1],[5,1],[0,5]]){box(iron,x,6,z,2,.14,.28);box(emitter,x,5.91,z,1.8,.035,.17);beam([x,6,z],[x,7.5,z],.022);}
 const key=new THREE.SpotLight(0xffe5bf,310,35,.65,.65,2);key.position.set(3.5,7,-4);key.target.position.set(0,.8,0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.near=.5;key.shadow.camera.far=28;key.shadow.bias=-.00015;key.shadow.normalBias=.025;key.shadow.radius=3;root.add(key,key.target);
 const windowLight=new THREE.DirectionalLight(0x8ea5cc,.65);windowLight.position.set(-5,6,10);windowLight.target.position.set(0,.5,0);windowLight.castShadow=true;windowLight.shadow.mapSize.set(2048,2048);Object.assign(windowLight.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:32});windowLight.shadow.normalBias=.025;windowLight.shadow.bias=-.0002;root.add(windowLight,windowLight.target);
 const softbox=new THREE.RectAreaLight(0xffe3b7,2.5,4,3);softbox.position.set(4,3.5,-4);softbox.lookAt(0,1.2,0);root.add(softbox);
 const rim=new THREE.RectAreaLight(0xabc9e0,2.5,3,4);rim.position.set(-4,3,2);rim.lookAt(0,1,0);root.add(rim);
 const practical=new THREE.PointLight(0xffab51,80,9,2);practical.position.set(5.8,3,3.5);root.add(practical);
 root.userData.dispose=()=>{texture.dispose();root.traverse(o=>{if(o.material?.map?.isCanvasTexture)o.material.map.dispose();if(o.isLight)o.shadow?.dispose();});};
 return root;
}
