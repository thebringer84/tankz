import * as THREE from 'three';
import {terrainHeight} from './config.js';
const clamp=THREE.MathUtils.clamp;

// Follow track surface speed rather than chassis translation: counter-rotating
// treads still excavate sand while the hull pivots in place.
export function updateVehicleDust(game,t,dt,p,velocity,forward,right,angular){
 const state=t.dustMotion??={previous:p.clone(),air:0,fall:0,contact:!!t.grounded,landCooldown:0,tracks:[0,0],wake:0};
 const teleported=state.previous.distanceToSquared(p)>36;
 if(teleported){state.air=state.fall=state.wake=0;state.tracks.fill(0);state.contact=!!t.grounded;}
 state.previous.copy(p);state.landCooldown=Math.max(0,state.landCooldown-dt);
 const visible=!t.enemy||t.visibleToPlayer!==false;
 const surface=game.environment?.surfaceHeight||terrainHeight;
 const loose=(x,z)=>.18+.82*(game.environment?.ruts?.softness(x,z)??1);
 if(!t.grounded){state.air+=dt;state.fall=Math.max(state.fall,-velocity.y);state.contact=false;state.tracks.fill(0);state.wake=0;return;}
 if(!state.contact&&state.air>.12&&state.fall>1.8&&state.landCooldown===0&&!teleported){
  // Incoming normal kinetic energy, retained from the descent before suspension
  // compression arrests it. One burst per landing, not one per wheel contact.
  const dx=surface(p.x-.5,p.z)-surface(p.x+.5,p.z),dz=surface(p.x,p.z-.5)-surface(p.x,p.z+.5),normal=new THREE.Vector3(dx,1,dz).normalize();
  const impact=Math.max(0,state.fall*normal.y-velocity.x*normal.x-velocity.z*normal.z),energy=.5*t.cfg.mass*impact*impact;
  if(visible)game.fx.landingDust?.(p,t.yaw,t.cfg.scale,energy,loose(p.x,p.z),surface);
  state.lastLandingEnergy=energy;state.landCooldown=.65;
 }
 state.contact=true;state.air=state.fall=0;
 if(!visible){state.tracks.fill(0);state.wake=0;return;}
 const width=(t.jeep?.9:1.24)*t.cfg.scale,spin=Math.abs(angular.y)*width,groundSpeed=Math.hypot(velocity.x,velocity.z),agitation=groundSpeed+(t.jeep?0:spin*2.3);
 if(agitation<.35){state.tracks.fill(0);state.wake=0;return;}
 for(let i=0;i<2;i++){
  const side=i?1:-1,trackSpeed=t.speed-angular.y*width*side,direction=Math.sign(trackSpeed)||1;
  const source=p.clone().addScaledVector(right,side*width).addScaledVector(forward,-direction*(t.jeep?1.2:1.65)*t.cfg.scale);source.y=surface(source.x,source.z)+.24;
  const intensity=clamp((Math.abs(trackSpeed)+spin)/15,.08,1.5)*loose(source.x,source.z),rate=(t.jeep?5:9)+Math.min(22,Math.abs(trackSpeed)*1.2+spin*3);
  state.tracks[i]+=dt*rate;let emitted=0;
  while(state.tracks[i]>=1&&emitted++<3){state.tracks[i]--;game.fx.dust?.(source,velocity,t.cfg.scale*(t.jeep?.6:1),right.clone().multiplyScalar(side),{intensity,pivot:spin>groundSpeed*.7,trackSpeed,forward});}
 }
 state.wake+=dt*(t.jeep?3:6+Math.min(8,agitation*.45));
 if(state.wake>=1){state.wake%=1;const source=p.clone().addScaledVector(forward,-Math.sign(t.speed||1)*2.2*t.cfg.scale);source.y=surface(source.x,source.z)+.5;
  game.fx.dustWake?.(source,velocity,t.cfg.scale*(t.jeep?.6:1),clamp(agitation/14,.1,1.6)*loose(source.x,source.z),spin>groundSpeed*.7);
 }
}

export class DustRenderer {
 constructor(scene,texture,surfaceUniforms,surfaceGLSL,max){
  const plane=new THREE.PlaneGeometry(1,1),geo=new THREE.InstancedBufferGeometry();geo.index=plane.index;geo.attributes=plane.attributes;
  for(const [key,width] of [['iCenter',3],['iSize',2],['iColor',3],['iAlpha',1],['iRotation',1],['iAge',1]])geo.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(max*width),width).setUsage(THREE.DynamicDrawUsage));
  geo.instanceCount=0;
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...surfaceUniforms,dustTex:{value:texture},cameraRight:{value:new THREE.Vector3(1,0,0)},cameraUp:{value:new THREE.Vector3(0,1,0)}},
   vertexShader:`attribute vec3 iCenter,iColor;attribute vec2 iSize;attribute float iAlpha,iRotation,iAge;uniform vec3 cameraRight,cameraUp;varying vec2 vUv;varying vec3 vWorld,vColor;varying float vAlpha,vRotation,vAge;void main(){vUv=uv;vColor=iColor;vAlpha=iAlpha;vRotation=iRotation;vAge=iAge;vWorld=iCenter+cameraRight*position.x*iSize.x+cameraUp*position.y*iSize.y;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
   fragmentShader:surfaceGLSL+`uniform sampler2D dustTex;varying vec2 vUv;varying vec3 vWorld,vColor;varying float vAlpha,vRotation,vAge;void main(){vec2 p=vUv-.5;float c=cos(vRotation),s=sin(vRotation);vec2 uv=mat2(c,-s,s,c)*p+.5;uv+=vec2(sin(uv.y*12.+vRotation+vAge*3.),cos(uv.x*11.-vAge*2.))*.012*sin(vAge*3.14159);if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;vec4 texel=texture2D(dustTex,uv);float edge=1.-smoothstep(.31,.5,max(abs(uv.x-.5),abs(uv.y-.5)));float groundFade=smoothstep(-.12,.65,vWorld.y-groundY(vWorld.xz));float billow=.5+.5*sin(vWorld.x*.63+sin(vWorld.z*.37))*cos(vWorld.z*.58+vWorld.y*.42);float alpha=(1.-exp(-texel.a*vAlpha*(1.3+billow*1.4)))*edge*groundFade;float shade=(.68+dot(texel.rgb,vec3(.333))*.35)*(.8+billow*.35);gl_FragColor=vec4(vColor*shade,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  this.mesh=new THREE.Mesh(geo,mat);this.mesh.name='Layered vehicle dust';this.mesh.frustumCulled=false;scene.add(this.mesh);
 }
 prepare(particles,camera){
  if(camera){const m=camera.matrixWorld.elements;this.mesh.material.uniforms.cameraRight.value.set(m[0],m[1],m[2]);this.mesh.material.uniforms.cameraUp.value.set(m[4],m[5],m[6]);}
  const a=this.mesh.geometry.attributes;let n=0;
  for(const p of particles){if(!p.vehicleDust)continue;const age=p.total-p.life,progress=age/p.total,growth=1+Math.sqrt(age)*p.spread,fade=Math.min(1,age/(p.wake?.55:.12))*Math.pow(1-progress,1.2);
   a.iCenter.setXYZ(n,p.p.x,p.p.y,p.p.z);a.iSize.setXY(n,p.size*growth,p.size*growth*(p.wake?.72:.82));a.iColor.setXYZ(n,p.color.r,p.color.g,p.color.b);a.iAlpha.setX(n,p.density*fade);a.iRotation.setX(n,p.rotation);a.iAge.setX(n,progress);n++;
  }
  for(const [key,attribute] of Object.entries(a))if(key.startsWith('i'))attribute.needsUpdate=true;this.mesh.geometry.instanceCount=n;
 }
}
