import {SplatVariants} from './splat-atlas.js';
import {ParticlePool} from './particle-pool.js';
import {createCannonProjectile} from './projectile-visuals.js';
import {DustRenderer} from './vehicle-dust.js';
import * as THREE from 'three';
import {terrainHeight,seededRandom,MAP_SIZE,TERRAIN_SEGMENTS,AMMO} from './config.js';
export class Effects {
 constructor(scene,smokeTexture,textures={}){
  this.scene=scene;this.time=0;this.particles=[];this.decals=[];this.screens=[];this.rand=seededRandom(414);this.max=3600;this.particlePool=new ParticlePool(this.particles,this.max);this.projectileTemplates=Object.entries(AMMO).map(([key,ammo])=>{const root=createCannonProjectile(ammo,key);root.visible=false;scene.add(root);return root;});
  const plane=new THREE.PlaneGeometry(1,1),geo=new THREE.InstancedBufferGeometry();geo.index=plane.index;geo.attributes={...plane.attributes};geo.instanceCount=0;for(const [key,width] of [['aCenter',3],['aColor',3],['aSize',1],['aAlpha',1],['aKind',1],['aRotation',1],['aAge',1]])geo.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(this.max*width),width).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{smokeTex:{value:smokeTexture},fireTex:{value:textures.fire||smokeTexture},sparkTex:{value:textures.sparks||smokeTexture},hotPass:{value:0},time:{value:0}},vertexShader:`attribute vec3 aCenter;varying vec2 vUv;attribute float aAge;varying float vAge;attribute vec3 aColor;attribute float aSize;attribute float aAlpha;attribute float aKind;attribute float aRotation;varying vec3 vColor;varying float vAlpha;varying float vKind;varying float vRotation;void main(){vAge=aAge;vColor=aColor;vAlpha=aAlpha;vKind=aKind;vRotation=aRotation;vUv=uv;vec4 mv=modelViewMatrix*vec4(aCenter,1.);mv.xy+=position.xy*aSize;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec2 vUv;uniform sampler2D smokeTex;uniform sampler2D fireTex;uniform sampler2D sparkTex;uniform float hotPass,time;varying float vAge;varying vec3 vColor;varying float vAlpha;varying float vKind;varying float vRotation;void main(){bool hot=vKind>.5&&vKind<3.5;if((hotPass>.5)!=hot)discard;vec2 p=vUv-.5;float c=cos(vRotation),s=sin(vRotation);vec2 uv=mat2(c,-s,s,c)*p+.5;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)discard;if(!hot){vec2 flow=vec2(sin(uv.y*13.+time*.7+vRotation),cos(uv.x*11.-time*.5+vRotation));uv+=flow*.018*sin(vAge*3.14159);}
vec4 texel=texture2D(smokeTex,clamp(uv,0.,1.));if(vKind<-.5){float radius=length(p);float detail=texture2D(smokeTex,clamp(uv,0.,1.)).a;float envelope=(1.-smoothstep(.12,.5,radius));texel.a=envelope*mix(.26,1.,detail);texel.rgb=vec3(.42+detail*.58);}
if(vKind>.5&&vKind<1.5){texel=texture2D(fireTex,uv);texel.rgb*=mix(vec3(1.25,1.05,.8),vec3(.75,.23,.045),smoothstep(.02,.7,vAge));texel.a*=1.-vAge*.6;}if(vKind>1.5&&vKind<2.5)texel=texture2D(sparkTex,uv);if(vKind>2.5&&vKind<3.5){float a=1.-smoothstep(.05,.48,length(p));texel=vec4(1.,.7,.25,a);}if(vKind>3.5){texel=vec4(1.,1.,1.,1.-smoothstep(.12,.47,length(p)));}vec3 color=hot?texel.rgb*vColor*1.25:vColor*(.48+texel.r*.65+uv.y*.18);float alpha=hot?texel.a*vAlpha:1.-exp(-texel.a*vAlpha*1.55);
if(!hot)alpha*=1.-smoothstep(.36,.5,max(abs(uv.x-.5),abs(uv.y-.5)));
gl_FragColor=vec4(color,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`});
  this.points=new THREE.Mesh(geo,mat);this.points.frustumCulled=false;scene.add(this.points);
  const hotMat=mat.clone();hotMat.uniforms.hotPass.value=1;hotMat.blending=THREE.AdditiveBlending;hotMat.toneMapped=false;this.hotPoints=new THREE.Mesh(geo.clone(),hotMat);this.hotPoints.frustumCulled=false;this.hotPoints.renderOrder=1;scene.add(this.hotPoints);
  this.flashLightsEnabled=true; // Diagnostic switch; keep the light count stable when comparing combat.
  this.machineGunLightsEnabled=false; // Rapid fire uses emissive flashes instead of repeated scene lighting.
  this.lights=Array.from({length:6},()=>{const light=new THREE.PointLight(0xff913c,0,28,2);return {light,life:0,total:1,power:0};});
  const flashGeo=new THREE.PlaneGeometry(1,1).rotateX(Math.PI/2).translate(0,0,.5);
  this.muzzleFlashes=Array.from({length:24},()=>{const material=new THREE.ShaderMaterial({uniforms:{age:{value:0},seed:{value:0},cannon:{value:0},blastTex:{value:textures.cannonMuzzle||textures.fire||smokeTexture}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float age,seed,cannon;uniform sampler2D blastTex;varying vec2 vUv;void main(){
if(cannon>.5){vec2 uv=vec2((vUv.x-.5)/(1.+age*.3)+.5,vUv.y);uv.x+=sin(uv.y*21.+seed+age*8.)*.009*age;vec4 plume=texture2D(blastTex,uv);float fade=pow(1.-age,1.35);vec3 heat=mix(vec3(2.8,2.5,1.8),vec3(1.15,.48,.15),age);float padding=smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.93,1.,vUv.y));gl_FragColor=vec4(plume.rgb*heat,plume.a*fade*padding*.8);return;}
float t=vUv.y,w=(.13+.34*sin(t*3.14159))*(1.-t*.65),edge=abs(vUv.x-.5);float turbulence=.8+.2*sin(t*39.+seed+sin(vUv.x*27.)*2.);float a=(1.-smoothstep(w*.25,w*turbulence,edge))*pow(1.-t,.6)*pow(1.-age,1.8);vec3 color=mix(vec3(3.,2.5,1.5),vec3(1.5,.3,.035),clamp(t*.9+age*.6,0.,1.));gl_FragColor=vec4(color,a);
#include <colorspace_fragment>
}`});const group=new THREE.Group();for(let i=0;i<2;i++){const mesh=new THREE.Mesh(flashGeo,material);mesh.rotation.z=i*Math.PI/2;group.add(mesh);}group.visible=false;scene.add(group);return {group,material,life:0,total:1,anchor:null};});
  this.rocketLights=Array.from({length:2},()=>{const light=new THREE.PointLight(0xff9a3d,0,5,2);return light;});
  this.setLightBudget(4);
  const groundGLSL=`uniform sampler2D terrainSurface;uniform float useTerrainSurface,mapSize,terrainSegments;float groundBaseY(vec2 p){float x=p.x,z=p.y;return .65*sin(x*.058)*cos(z*.047)+.35*sin(x*.15+z*.11)+5.8*exp(-(pow(x-23.,2.)/180.+pow(z-8.,2.)/360.))+4.7*exp(-(pow(x+34.,2.)/240.+pow(z+29.,2.)/180.))+3.8*exp(-(pow(x-5.,2.)/320.+pow(z+52.,2.)/140.))+4.*exp(-(pow(x+48.,2.)/230.+pow(z-49.,2.)/240.))+2.7*exp(-(pow(x+12.,2.)/50.+pow(z-3.,2.)/20.));}`;
  const surfaceGLSL=groundGLSL+`float groundY(vec2 p){if(useTerrainSurface<.5)return groundBaseY(p);vec2 cell=clamp((p+mapSize*.5)/(mapSize/terrainSegments),vec2(0.),vec2(terrainSegments-.001)),f=fract(cell),uv=(floor(cell)+.5)/(terrainSegments+1.);float a=texture2D(terrainSurface,uv).r,b=texture2D(terrainSurface,uv+vec2(1./(terrainSegments+1.),0.)).r,c=texture2D(terrainSurface,uv+vec2(0.,1./(terrainSegments+1.))).r,d=texture2D(terrainSurface,uv+vec2(1./(terrainSegments+1.))).r;return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);}`;
  this.surfaceUniforms={mapSize:{value:MAP_SIZE},terrainSegments:{value:TERRAIN_SEGMENTS,AMMO},terrainSurface:{value:null},useTerrainSurface:{value:0}};
  this.vehicleDust=new DustRenderer(scene,textures.dustBillow||smokeTexture,this.surfaceUniforms,surfaceGLSL,this.max);
  const headingMat=new THREE.ShaderMaterial({uniforms:{...this.surfaceUniforms},transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,toneMapped:false,
   vertexShader:surfaceGLSL+`varying vec2 vUv;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);wp.y=groundY(wp.xz)+.10;gl_Position=projectionMatrix*viewMatrix*wp;}`,
   fragmentShader:`varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float line=abs(p.y-(.55-abs(p.x)*.8));float tail=abs(p.y-(-.25-abs(p.x)*.8));float shape=max(1.-smoothstep(.065,.115,line),(1.-smoothstep(.04,.08,tail))*.45);float ends=1.-smoothstep(.65,.92,abs(p.x));gl_FragColor=vec4(.42,.83,.76,shape*ends*.62);}`});
  this.headingMarker=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.9,12,12).rotateX(Math.PI/2),headingMat);this.headingMarker.name='Hull forward marker';this.headingMarker.visible=false;this.headingMarker.frustumCulled=false;scene.add(this.headingMarker);
  const waveGeo=new THREE.PlaneGeometry(2,2,24,24).rotateX(-Math.PI/2);
  this.shockwaves=Array.from({length:8},()=>{const material=new THREE.ShaderMaterial({uniforms:{...this.surfaceUniforms,age:{value:0},seed:{value:0}},transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide,vertexShader:surfaceGLSL+`varying vec2 vUv;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);wp.y=groundY(wp.xz)+.09;gl_Position=projectionMatrix*viewMatrix*wp;}`,fragmentShader:`uniform float age,seed;varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float angle=atan(p.y,p.x),r=length(p);float wobble=sin(angle*9.+seed)*.022+sin(angle*17.-seed)*.012;float ridge=exp(-pow((r-.77-wobble)/(.075+age*.11),2.));float broken=.6+.4*sin(angle*13.+seed)*sin(angle*7.-seed);float alpha=ridge*broken*.3*smoothstep(0.,.07,age)*pow(1.-age,1.6);gl_FragColor=vec4(.29,.205,.12,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});const mesh=new THREE.Mesh(waveGeo,material);mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);return {mesh,age:0,duration:0,size:1};});

  const treadMat=new THREE.MeshBasicMaterial({color:0x57452e,side:THREE.DoubleSide,transparent:true,opacity:.46,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  // Short strips within a stamp form visible paired tread impressions.
  treadMat.onBeforeCompile=s=>{Object.assign(s.uniforms,this.surfaceUniforms);s.vertexShader=surfaceGLSL+'\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <project_vertex>','vec4 wp=modelMatrix*instanceMatrix*vec4(transformed,1.);wp.y=groundY(wp.xz)+.065;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;');};
  const pos=[],uv=[];for(let i=0;i<4;i++){let z=-.3+i*.18;pos.push(-.26,0,z,.26,0,z,-.26,0,z+.07,.26,0,z,.26,0,z+.07,-.26,0,z+.07);}const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tg.computeVertexNormals();
  this.tracks=new THREE.InstancedMesh(tg,treadMat,3200);this.tracks.renderOrder=-2;this.tracks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.trackIndex=0;this.trackCount=0;this.tracks.count=0;this.tracks.frustumCulled=false;scene.add(this.tracks);
  this.splatVariants=new SplatVariants(()=>this.rand());
  const decalVertex=surfaceGLSL+`attribute float aSplat;varying vec2 vUv;varying float vSplat;void main(){vUv=uv;vSplat=aSplat;vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.);wp.y=groundY(wp.xz)+.06;gl_Position=projectionMatrix*viewMatrix*wp;}`;
  const makeDecals=(capacity,blood)=>{
   const material=new THREE.ShaderMaterial({uniforms:{...this.surfaceUniforms,splatAtlas:{value:textures.splats||textures.crater||smokeTexture},useAtlas:{value:textures.splats?1:0},blood:{value:blood?1:0}},transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,side:THREE.DoubleSide,vertexShader:decalVertex,
    fragmentShader:`uniform sampler2D splatAtlas;uniform float useAtlas,blood;varying vec2 vUv;varying float vSplat;void main(){
     vec4 decal;
     if(useAtlas>.5){vec2 cell=vec2(mod(vSplat,4.),3.-floor(vSplat/4.));vec2 uv=(cell+mix(vec2(4.5/512.),vec2(507.5/512.),vUv))/4.;decal=texture2D(splatAtlas,uv);}
     else if(blood>.5){decal=vec4(.25,.014,.020,(1.-smoothstep(.25,.85,length(vUv*2.-1.)))*.82);}
     else{decal=texture2D(splatAtlas,vUv);}
     gl_FragColor=vec4(decal.rgb*.76,decal.a*.88);
#include <tonemapping_fragment>
#include <colorspace_fragment>
    }`});
   const geometry=new THREE.PlaneGeometry(1,1,8,8).rotateX(-Math.PI/2);
   geometry.setAttribute('aSplat',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
   const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.renderOrder=-2;mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);return mesh;
  };
  this.scorches=makeDecals(100,false);this.scorchIndex=0;this.dummy=new THREE.Object3D();
  this.smears=makeDecals(192,true);this.smearIndex=0;

 }
 setLightBudget(count){
  if(!Number.isInteger(count)||count<0||count>8)throw new RangeError('Light budget must be between 0 and 8');
  for(const light of this.renderLights||[])light.removeFromParent();
  this.lightBudget=count;this.renderLights=Array.from({length:count},()=>{const light=new THREE.PointLight(0xffffff,0,1,2);this.scene.add(light);return light;});
 }
 prepareLights(camera){
  const candidates=this.lightCandidates??=[];candidates.length=0;
  for(const slot of this.lights)if(slot.light.intensity>0)candidates.push(slot.light);
  for(const light of this.rocketLights)if(light.intensity>0)candidates.push(light);
  const score=light=>light.intensity/(1+(camera?camera.position.distanceToSquared(light.position):0));
  candidates.sort((a,b)=>score(b)-score(a));
  for(let i=0;i<this.renderLights.length;i++){const light=this.renderLights[i],source=candidates[i];light.intensity=source?.intensity||0;if(source){light.color.copy(source.color);light.position.copy(source.position);light.distance=source.distance;light.decay=source.decay;}}
 }

 emit(p,v,color,size,life,kind='dust',delay=0){const particle=this.particlePool.acquire();particle.p.copy(p);particle.v.copy(v);particle.color.set(color);Object.assign(particle,{enemyFire:!!this.enemyFire,size,life,total:life,kind,delay,rotation:this.rand()*6.28,spin:(this.rand()-.5)*(kind==='smoke'?.22:1.4)});}

 blood(pos,direction,scale=1){
  const axis=direction.clone().normalize();for(let i=0;i<Math.ceil(28*scale);i++){const velocity=axis.clone().multiplyScalar((2+this.rand()*5)*scale).add(new THREE.Vector3((this.rand()-.5)*5,1+this.rand()*4,(this.rand()-.5)*5));this.emit(pos,velocity,i%3?0x79131b:0xb62a27,.08+this.rand()*.18,.7+this.rand()*.8,'blood');this.particles.at(-1).stain=this.rand()<.4;}
  this.smear(pos,this.rand()*6.28,.3*scale,'blood-impact');
 }
 bloodBurst(pos,direction,scale=1){this.blood(pos,direction.lengthSq()>.01?direction:new THREE.Vector3(0,1,0),Math.min(2,1.2*scale));for(let i=0;i<4;i++){const p=pos.clone().add(new THREE.Vector3((this.rand()-.5)*1.8,0,(this.rand()-.5)*1.8));this.smear(p,this.rand()*6.28,(.18+this.rand()*.35)*scale,'blood-impact');}}
 bloodTrail(pos,velocity){for(let i=0;i<2;i++){this.emit(pos,velocity.clone().multiplyScalar(.15).add(new THREE.Vector3((this.rand()-.5)*.7,-.5,(this.rand()-.5)*.7)),0x8d1620,.07+this.rand()*.08,.6+this.rand()*.4,'blood');this.particles.at(-1).stain=this.rand()<.4;}}
 bloodLanding(pos,scale){this.smear(pos,this.rand()*6.28,scale,'blood-impact');for(let i=0;i<5;i++){this.emit(pos,new THREE.Vector3((this.rand()-.5)*2,.6+this.rand(),(this.rand()-.5)*2),0x971d25,.07,.25,'blood');}}
 dust(pos,velocity,scale=1,outward=new THREE.Vector3(),options={}){
  const intensity=options.intensity??THREE.MathUtils.clamp(Math.hypot(velocity.x,velocity.z)/14,0,1),pivot=!!options.pivot;
  const v=outward.clone().multiplyScalar(.45+intensity*.65);v.y=.42+intensity*.48;
  if(options.forward)v.addScaledVector(options.forward,-Math.sign(options.trackSpeed||1)*(.45+intensity*.7));
  const source=pos.clone().addScaledVector(outward,(this.rand()-.5)*.28);
  this.emit(source,v,0xa07245,(1.1+intensity*.75)*scale,3.6+intensity*2.5+this.rand()*.7,'dust');
  const p=this.particles.at(-1);Object.assign(p,{trail:true,vehicleDust:true,density:.19+intensity*.13,spread:pivot?1.7:1.1,wind:.45});p.spin*=.12;
 }
 dustWake(pos,velocity,scale=1,intensity=1,pivot=false){
  const p=pos.clone().add(new THREE.Vector3((this.rand()-.5)*.8,.25,(this.rand()-.5)*.8)),v=velocity.clone().multiplyScalar(.04);v.y=.45+intensity*.3;
  this.emit(p,v,0xa97d50,(3.4+intensity*1.4)*scale,5.2+intensity*2+this.rand(),'dust');
  Object.assign(this.particles.at(-1),{trail:true,vehicleDust:true,wake:true,density:.09+intensity*.055,spread:pivot?2:1.7,spin:(this.rand()-.5)*.11,wind:.6});
 }
 landingDust(pos,yaw,scale,energy,softness=1,surface=terrainHeight){
  const strength=THREE.MathUtils.clamp(Math.sqrt(Math.max(0,energy)/14000),.2,3),count=Math.round(12+strength*10),co=Math.cos(yaw),si=Math.sin(yaw);
  for(let i=0;i<count;i++){
   const angle=i/count*Math.PI*2+(this.rand()-.5)*.28,x=Math.cos(angle),z=Math.sin(angle),dir=new THREE.Vector3(x*co+z*si,0,z*co-x*si),p=pos.clone().addScaledVector(dir,(1.1+this.rand()*.6)*scale);p.y=surface(p.x,p.z)+.22;
   const v=dir.multiplyScalar((1.5+strength*2.4)*(.75+this.rand()*.5));v.y=.3+strength*.35;
   this.emit(p,v,0xa07245,(1.2+strength*.65)*scale,(2.7+strength*.85)*( .85+this.rand()*.3),'dust',this.rand()*.045);
   Object.assign(this.particles.at(-1),{trail:true,vehicleDust:true,landing:true,density:(.15+strength*.07)*softness,spread:1+strength*.3,wind:.45,spin:(this.rand()-.5)*.15});
  }
  this.dustWake(pos.clone().setY(surface(pos.x,pos.z)+.65),new THREE.Vector3(),scale,strength*softness,true);
 }
 burningInfantry(pos,wounded=false){
  for(let i=0;i<3;i++){const p=pos.clone().add(new THREE.Vector3((this.rand()-.5)*.5,(wounded?0:.15)+this.rand()*.55,(this.rand()-.5)*.4));this.emit(p,new THREE.Vector3(0,1.2+this.rand(),0),i?0xff871f:0xffcf69,.32+this.rand()*.2,.35+this.rand()*.2,'fire');}
  this.emit(pos.clone().add(new THREE.Vector3(0,.7,0)),new THREE.Vector3(.15,1.5,0),0x383532,.4,.8,'smoke');
 }
 flameStream(pos,dir,length){
  const reach=Math.max(.05,length),side=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();
  for(let i=0;i<5;i++){const offset=Math.min(reach*.2,i*.08),p=pos.clone().addScaledVector(dir,offset),v=dir.clone().multiplyScalar(20);this.emit(p,v,i%2?0xff871f:0xffc46a,.48+this.rand()*.26,Math.min(.55,(reach-offset)/20),'fire');const particle=this.particles.at(-1);particle.flameJet=true;particle.jetDir=dir.clone();particle.jetSide=side.clone();particle.phase=this.rand()*6.28;}
  // Dark rolling smoke and sparks give the hot core a readable edge.
  const tip=pos.clone().addScaledVector(dir,Math.min(reach*.85,8));this.emit(tip,new THREE.Vector3(.25,1.8,.15),0x514136,.8+this.rand()*.5,1.5,'smoke',.08);this.particles.at(-1).density=.23;
  for(let i=0;i<2;i++)this.emit(pos,dir.clone().multiplyScalar(15+this.rand()*5).addScaledVector(side,(this.rand()-.5)*2),0xffb54b,.055+this.rand()*.05,Math.min(.55,reach/20),'ember');this.flash(pos,85,.08,6);
 }
 updateRocketLights(shells){const active=shells.filter(s=>s.rocket&&!s.dead&&s.mesh?.visible!==false);for(let i=0;i<this.rocketLights.length;i++){const light=this.rocketLights[i],s=active[i];light.intensity=s?22:0;if(s)light.position.copy(s.body.translation());}}
 rocketTrail(from,to,shell){const delta=to.clone().sub(from),distance=delta.length();if(distance<.00001)return;const direction=delta.clone().normalize();for(let d=.3-(shell.trailDistance||0);d<=distance;d+=.3){const p=from.clone().addScaledVector(direction,d);this.emit(p,direction.clone().multiplyScalar(-.3).add(new THREE.Vector3(0,.25,0)),0x8d887d,.38+this.rand()*.18,1.2+this.rand()*.5,'smoke');this.particles.at(-1).density=.24;}shell.trailDistance=((shell.trailDistance||0)+distance)%.3;this.emit(to,direction.multiplyScalar(-1.5),0xffac48,.45,.07,'fire');}
 damageSmoke(tank,dt){
  const ratio=tank.hp/tank.cfg.hp;if(tank.dead||ratio>.4){tank.damageSmokeTimer=0;return;}
  const stage=ratio<=.2?3:ratio<=.3?2:1,interval=stage===1?.4:stage===2?.19:.09;
  tank.damageSmokeTimer=(tank.damageSmokeTimer||0)-dt;
  while(tank.damageSmokeTimer<=0){tank.damageSmokeTimer+=interval;tank.root.updateWorldMatrix(true,false);
   const p=tank.root.localToWorld(new THREE.Vector3((this.rand()-.5)*.45,.65,-1.3*tank.cfg.scale));
   const color=new THREE.Color(0x9b9c95).lerp(new THREE.Color(0x222423),THREE.MathUtils.clamp((.4-ratio)/.2,0,1));
   const velocity=new THREE.Vector3().copy(tank.body.linvel()).multiplyScalar(.12);velocity.y=1+stage*.4;
   this.emit(p,velocity,color,.5+stage*.25,3+stage*1.5,'smoke');this.particles.at(-1).plume=stage>=2;this.particles.at(-1).damageSmoke=true;
  }
 }
 screenSmoke(pos,duration=8,radius=4.5){this.screens.push({p:pos.clone(),remaining:duration,duration,radius,timer:0});}
 updateScreens(dt){for(const screen of [...this.screens]){screen.remaining-=dt;if(screen.remaining<=0){this.screens.splice(this.screens.indexOf(screen),1);continue;}screen.timer-=dt;
  while(screen.timer<=0){screen.timer+=.12;const age=screen.duration-screen.remaining,spread=screen.radius*.6*Math.min(1,.2+age*1.2);
   for(let i=0;i<2;i++){const a=this.rand()*Math.PI*2,r=Math.sqrt(this.rand())*spread,p=screen.p.clone().add(new THREE.Vector3(Math.cos(a)*r,this.rand()*.9,Math.sin(a)*r));this.emit(p,new THREE.Vector3(Math.cos(a)*.18,.12,Math.sin(a)*.18),0xb7b4a7,5.6+this.rand()*1.4,Math.min(3.2,screen.remaining),'smoke');this.particles.at(-1).screen=true;}
  }
 }}
 smoke(pos,big=false){for(let i=0;i<(big?45:2);i++)this.emit(pos,new THREE.Vector3((this.rand()-.5)*(big?8:1),2+this.rand()*2,(this.rand()-.5)*(big?8:1)),big?0x9b9a8e:0x343735,big?4:1.2,big?8:3.5,'smoke');}
 flash(pos,power,duration,distance=25){const available=this.lights.filter(l=>!l.reserved),slot=available.find(l=>l.life<=0)||available.reduce((a,b)=>a.life<b.life?a:b);slot.enemyFire=!!this.enemyFire;slot.light.position.copy(pos).add(new THREE.Vector3(0,.8,0));slot.light.distance=distance;slot.light.intensity=power;slot.power=power;slot.life=slot.total=duration;}
 muzzleJet(pos,dir,scale=1,anchor=null){const item=this.muzzleFlashes.find(f=>f.life<=0)||this.muzzleFlashes.reduce((a,b)=>a.life<b.life?a:b);item.enemyFire=!!this.enemyFire;item.group.position.copy(pos);item.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir.clone().normalize());item.group.rotateZ(this.rand()*Math.PI);item.group.scale.set(scale*(.8+this.rand()*.35),scale,scale*(1.1+this.rand()*.5));item.life=item.total=scale>2?.16:scale>1?.075:.045;item.presented=false;item.material.uniforms.cannon.value=scale>2?1:0;item.material.uniforms.age.value=0;item.material.uniforms.seed.value=this.rand()*100;item.anchor=anchor;item.group.visible=true;}
 shockwave(pos,size){const wave=this.shockwaves.find(w=>!w.mesh.visible)||this.shockwaves.reduce((a,b)=>a.age/a.duration>b.age/b.duration?a:b);wave.mesh.position.copy(pos);wave.size=size;wave.age=0;wave.duration=1.15;wave.mesh.scale.setScalar(.3);wave.mesh.material.uniforms.age.value=0;wave.mesh.material.uniforms.seed.value=this.rand()*100;wave.mesh.visible=true;}
 explosion(pos,size=1,variant='standard'){
  const profile=variant==='jeep'?['fuel','pressure','cookoff'][Math.floor(this.rand()*3)]:variant;
  const fuel=profile==='fuel',pressure=profile==='pressure',cookoff=profile==='cookoff',spread=pressure?1.35:1;
  this.flash(pos,(fuel?1500:1200)*size,.28,27*size);this.shockwave(pos,size*(pressure?1.25:1));
  this.emit(pos,new THREE.Vector3(0,.5,0),0xffffff,5*size,.05,'spark');
  const axis=this.rand()*Math.PI*2,lobes=Array.from({length:5},(_,i)=>new THREE.Vector3(Math.cos(axis+i*2.4)*(i%2?.85:.4),.25+(i%3)*.35,Math.sin(axis+i*2.4)*(i%2?.85:.4)).multiplyScalar(size));
  for(let i=0;i<(fuel?18:10)*size;i++){const l=lobes[i%5],delay=cookoff&&i%3===0?.35+this.rand()*.4:this.rand()*.12;const v=l.clone().normalize().multiplyScalar((2+this.rand()*3)*spread);v.y+=fuel?2:1;this.emit(pos.clone().add(l),v,0xffffff,(1.7+this.rand()*1.4)*size,(fuel?.65:.38)+this.rand()*.25,'fire',delay);this.particles.at(-1).blastFire=true;}
  for(let i=0;i<28*size;i++){const v=new THREE.Vector3(this.rand()-.5,this.rand()*.8,this.rand()-.5).normalize().multiplyScalar((6+this.rand()*16)*size);this.emit(pos,v,0xffd181,.08+this.rand()*.12,.5+this.rand()*1.4,'ember',cookoff?this.rand()*.55:0);}
  // Related lobes roll outward together, then lose blast momentum and rise.
  for(let i=0;i<22*size;i++){const l=lobes[i%5],p=pos.clone().add(l).add(new THREE.Vector3((this.rand()-.5)*.6,this.rand()*.5,(this.rand()-.5)*.6)),v=l.clone().multiplyScalar(3*spread);v.y=2+this.rand()*2;this.emit(p,v,i%3?0x39312a:0x665547,(1.5+this.rand()*.9)*size,4+this.rand()*3,'smoke',.08+this.rand()*.3+(cookoff&&i%3===0?.35:0));const smoke=this.particles.at(-1);smoke.blast=true;smoke.density=.36;smoke.spin*=.35;}
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2+this.rand()*.12,p=pos.clone().add(new THREE.Vector3(Math.sin(a)*.7,0,Math.cos(a)*.7));p.y=terrainHeight(p.x,p.z)+.12;this.emit(p,new THREE.Vector3(Math.sin(a)*(5+this.rand()*4)*size*spread,.15+this.rand()*.3,Math.cos(a)*(5+this.rand()*4)*size*spread),0x9b805b,(1.1+this.rand()*.8)*size,1.8+this.rand()*1.2,'dust');this.particles.at(-1).blastDust=true;this.particles.at(-1).density=.16;}
  this.scorch(pos,size*5);return profile;
 }
 muzzle(pos,dir){this.emit(pos,dir.clone().multiplyScalar(2),0xffffff,.85,.09,'spark');for(let i=0;i<4;i++)this.emit(pos,dir.clone().multiplyScalar(6+this.rand()*5),0xffd88e,.08,.12+this.rand()*.1,'ember');}
 machineGun(pos,dir,anchor=null){this.muzzleJet(pos,dir,.7,anchor);this.muzzle(pos,dir);this.emit(pos,dir.clone().multiplyScalar(1.6).add(new THREE.Vector3(0,.4,0)),0x82786a,.48,.55,'smoke',.035);if(this.machineGunLightsEnabled)this.flash(pos,38,.09,3.5);}
 ricochet(pos,normal,velocity){this.muzzle(pos,normal);const reflected=velocity.clone().normalize();for(let i=0;i<9;i++)this.emit(pos,reflected.clone().multiplyScalar(5+this.rand()*12).add(new THREE.Vector3((this.rand()-.5)*4,this.rand()*3,(this.rand()-.5)*4)),0xffd897,.07,.2+this.rand()*.3,'ember');}
 cannon(pos,dir,chassis,scale=1,anchor=null){
  this.muzzleJet(pos,dir,4.2*scale,anchor);const side=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();for(const sign of [-1,1])this.muzzleJet(pos,side.clone().multiplyScalar(sign).addScaledVector(dir,.25).normalize(),1.1*scale);
  this.flash(pos,950*scale,.18,19*scale);this.emit(pos,dir.clone().multiplyScalar(7),0xffffff,2.2*scale,.055,'spark');
  for(let i=0;i<8;i++)this.emit(pos,dir.clone().multiplyScalar(3+this.rand()*3).add(new THREE.Vector3((this.rand()-.5)*2,.7,(this.rand()-.5)*2)),0xb0a38f,(1.15+this.rand()*.6)*scale,1.2+this.rand()*.7,'smoke',.045);
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const p=chassis.clone().add(new THREE.Vector3(Math.sin(a)*1.5,0,Math.cos(a)*1.5));p.y=terrainHeight(p.x,p.z)+.12;this.emit(p,new THREE.Vector3(Math.sin(a)*4,.45,Math.cos(a)*4),0xb39266,1.2*scale,1.35+this.rand()*.65,'dust');this.particles.at(-1).blastDust=true;this.particles.at(-1).density=.16;}
  const ground=pos.clone();ground.y=terrainHeight(pos.x,pos.z)+.13;this.shockwave(ground,.55*scale);for(let i=0;i<6;i++)this.emit(ground,dir.clone().multiplyScalar(4+this.rand()*3).setY(.4),0xb39266,1.2*scale,1.1,'dust');
 }
 tread(pos,yaw,width){for(const side of [-1,1]){const x=pos.x+Math.cos(yaw)*width*side,z=pos.z-Math.sin(yaw)*width*side;this.dummy.position.set(x,terrainHeight(x,z)+.035,z);this.dummy.rotation.set(0,yaw,0);this.dummy.scale.set(1,1,1);this.dummy.updateMatrix();this.tracks.setMatrixAt(this.trackIndex++%3200,this.dummy.matrix);}this.tracks.count=Math.min(3200,this.trackIndex);this.tracks.instanceMatrix.needsUpdate=true;}
 setSplat(mesh,slot,type){const attribute=mesh.geometry.getAttribute('aSplat');attribute.setX(slot,this.splatVariants.next(type));attribute.needsUpdate=true;}
 scorch(pos,size){this.dummy.position.set(pos.x,terrainHeight(pos.x,pos.z)+.07,pos.z);this.dummy.rotation.set(0,this.rand()*6.28,0);this.dummy.scale.setScalar(size);this.dummy.updateMatrix();const slot=this.scorchIndex++%100;this.scorches.setMatrixAt(slot,this.dummy.matrix);this.setSplat(this.scorches,slot,'scorch');this.scorches.count=Math.min(100,this.scorchIndex);this.scorches.instanceMatrix.needsUpdate=true;}
 smear(pos,yaw,scale=1,type='blood-smear'){this.dummy.position.copy(pos);this.dummy.rotation.set(0,yaw,0);this.dummy.scale.set((.8+this.rand()*.7)*scale,1,(type==='blood-smear'?1.5+this.rand()*2.5:1.2+this.rand()*.8)*scale);this.dummy.updateMatrix();const slot=this.smearIndex++%192;this.smears.setMatrixAt(slot,this.dummy.matrix);this.setSplat(this.smears,slot,type);this.smears.count=Math.min(192,this.smearIndex);this.smears.instanceMatrix.needsUpdate=true;}
 update(dt,prepare=true){
  for(const f of this.muzzleFlashes){if(f.life<=0)continue;if(f.presented)f.life=Math.max(0,f.life-dt);f.group.visible=f.life>0;f.material.uniforms.age.value=1-f.life/f.total;if(f.anchor&&f.group.visible){f.anchor.getWorldPosition(f.group.position);f.anchor.getWorldQuaternion(f.group.quaternion);}}
  for(const w of this.shockwaves){if(!w.mesh.visible)continue;w.age+=dt;const t=Math.min(1,w.age/w.duration);w.mesh.material.uniforms.age.value=t;w.mesh.scale.setScalar(w.size*(.3+10*Math.pow(t,.65)));if(t>=1)w.mesh.visible=false;}
  this.updateScreens(dt);this.time+=dt;this.points.material.uniforms.time.value=this.time;this.hotPoints.material.uniforms.time.value=this.time;
  for(const slot of this.lights){if(slot.reserved)continue;slot.life=Math.max(0,slot.life-dt);slot.light.intensity=slot.power*Math.pow(slot.life/slot.total,2);}
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];if(p.delay>0){p.delay-=dt;continue;}p.life-=dt;if(p.life<=0){this.particlePool.remove(i);continue;}
   const age=p.total-p.life,progress=age/p.total;
   if(p.flameJet){p.v.copy(p.jetDir).multiplyScalar(20).addScaledVector(p.jetSide,Math.sin(age*18+p.phase)*age*5);p.v.y+=age*2;}else if(p.blastDust){p.v.multiplyScalar(Math.exp(-dt*2.3));}else if(p.screen){p.v.multiplyScalar(Math.exp(-dt*.8));}else if(p.vehicleDust){const blend=1-Math.exp(-dt*(p.landing?1.1:1.5)),wind=p.wind||.45;p.v.x+=(wind+Math.sin(p.p.z*.16+this.time*.3)*.14-p.v.x)*blend;p.v.z+=(.16+Math.cos(p.p.x*.12-this.time*.25)*.12-p.v.z)*blend;p.v.y+=(.06-p.v.y)*(1-Math.exp(-dt*.65));}else if(p.trail){p.v.x+=(.1-p.v.x)*(1-Math.exp(-dt*1.8));p.v.z+=(.04-p.v.z)*(1-Math.exp(-dt*1.8));p.v.y*=Math.exp(-dt*.6);}else if(p.kind==='smoke'){
    const follow=1-Math.exp(-dt*(p.blast?1.5:p.plume?1.2:.35)),phase=p.p.y*.5-this.time*.65;
    const windX=.65+Math.sin(phase+p.p.z*.09)*.42,windZ=.18+Math.cos(phase*.8+p.p.x*.08)*.32;
    p.v.x+=(windX-p.v.x)*follow;p.v.z+=(windZ-p.v.z)*follow;
    p.v.y+=((p.plume?2.5:1.3)*(1-progress*.65)-p.v.y)*(1-Math.exp(-dt*.5));
   }else{p.v.multiplyScalar(Math.exp(-dt*(p.flameJet?0:p.blastFire?3.5:p.kind==='ember'?.2:.65)));if(p.kind==='ember'||p.kind==='blood')p.v.y-=14*dt;else p.v.y+=.25*dt;}
   p.p.addScaledVector(p.v,dt);if(p.trail||p.blastDust)p.p.y=Math.max(p.p.y,terrainHeight(p.p.x,p.p.z)+.08);if(p.kind==='blood'&&p.p.y<=terrainHeight(p.p.x,p.p.z)+.04){if(p.stain)this.smear(p.p,p.rotation,.08+this.rand()*.09,'blood-droplets');this.particlePool.remove(i);continue;}p.rotation+=p.spin*dt;
  }
  if(prepare)this.prepare();
 }
 // Project hull-forward chevrons onto the same surface as the terrain decals.
 updateHeading(tank,visible){const marker=this.headingMarker;marker.visible=visible&&!tank.dead;if(!marker.visible)return;const p=tank.root.position,yaw=tank.yaw,scale=tank.cfg.scale;marker.position.set(p.x+Math.sin(yaw)*4.3*scale,0,p.z+Math.cos(yaw)*4.3*scale);marker.rotation.y=yaw;marker.scale.setScalar(scale);}
 // Sort alpha smoke/dust along the view direction, independent of emission order.
 prepare(camera){
  for(const flash of this.muzzleFlashes)if(flash.group.visible)flash.presented=true;
  for(const flash of this.muzzleFlashes)if(flash.enemyFire&&flash.group.visible&&!this.visibility?.sampledVisible(flash.group.position))flash.group.visible=false;
  for(const slot of this.lights)if(!slot.reserved){
   const visible=!slot.enemyFire||this.visibility?.sampledVisible(slot.light.position);
   slot.light.intensity=this.flashLightsEnabled&&visible?slot.power*Math.pow(slot.life/slot.total,2):0;
  }
  this.prepareLights(camera);
  const visible=this.visibleParticles??=[];visible.length=0;const hotParticles=this.hotParticles??=[];hotParticles.length=0;
  for(const p of this.particles)if(p.delay<=0&&(!p.enemyFire||this.visibility?.sampledVisible(p.p))){if(['spark','ember','fire'].includes(p.kind))hotParticles.push(p);else visible.push(p);}
  if(camera){camera.updateMatrixWorld();const m=camera.matrixWorldInverse.elements;for(const p of visible)p.depth=-(m[2]*p.p.x+m[6]*p.p.y+m[10]*p.p.z+m[14]);visible.sort((a,b)=>b.depth-a.depth);}
  this.vehicleDust.prepare(visible,camera);
  for(const [mesh,particles] of [[this.points,visible],[this.hotPoints,hotParticles]]){const a=mesh.geometry.attributes;let n=0;for(const p of particles){if(p.vehicleDust)continue;const progress=1-p.life/p.total,age=p.total-p.life,hot=['spark','ember','fire'].includes(p.kind),smoke=p.kind==='smoke';
   const growth=p.screen?1+progress*.65:p.trail?1+progress*1.8:smoke?(p.blast?1+Math.sqrt(age)*1.05:p.plume?1+Math.sqrt(age)*1.3:1+Math.sqrt(age)*.7):1+progress*(p.flameJet?3.5:hot?.5:1.9);
   const fade=hot?Math.pow(1-progress,.6):Math.min(1,age/(smoke?.3:.08))*Math.pow(1-progress,smoke?.85:.65);
   a.aCenter.setXYZ(n,p.p.x,p.p.y,p.p.z);a.aColor.setXYZ(n,p.color.r,p.color.g,p.color.b);a.aSize.setX(n,p.size*growth);
   a.aAlpha.setX(n,fade*(p.density!==undefined?p.density:p.screen?.26:p.kind==='dust'?.38:smoke?(p.plume?.46:.54):.95));a.aAge.setX(n,progress);a.aKind.setX(n,p.kind==='fire'?1:p.kind==='spark'?2:p.kind==='ember'?3:p.kind==='blood'?4:p.screen?-2:p.trail?-1:0);a.aRotation.setX(n,p.rotation);n++;
  }
  for(const attribute of Object.values(a))if(attribute.isInstancedBufferAttribute&&n){attribute.clearUpdateRanges();attribute.addUpdateRange(0,n*attribute.itemSize);attribute.needsUpdate=true;}mesh.geometry.instanceCount=n;}
 }

 clear(){for(const light of this.renderLights)light.intensity=0;this.points.geometry.instanceCount=this.hotPoints.geometry.instanceCount=0;this.vehicleDust.mesh.geometry.instanceCount=0;this.headingMarker.visible=false;for(const light of this.rocketLights)light.intensity=0;for(const f of this.muzzleFlashes){f.life=0;f.group.visible=false;f.anchor=null;}for(const w of this.shockwaves)w.mesh.visible=false;this.screens.length=0;this.particlePool.clear();for(const slot of this.lights){slot.life=0;slot.light.intensity=0;}this.tracks.count=0;this.trackIndex=0;this.scorches.count=0;this.scorchIndex=0;this.smears.count=0;this.smearIndex=0;}
}
