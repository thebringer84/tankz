import {MAP_SIZE} from './config.js';
import * as THREE from 'three';
import {AmbientOcclusion} from './ambient-occlusion.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export class Presentation {
 constructor(game){
  this.game=game;const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthTexture:new THREE.DepthTexture(1,1)});
  this.composer=new EffectComposer(game.renderer,target);this.composer.addPass(new RenderPass(game.scene,game.camera));
  this.fog=new ShaderPass({uniforms:{tDiffuse:{value:null},depth:{value:null},mapSize:{value:MAP_SIZE},visibility:{value:null},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},fogEnabled:{value:0},showroom:{value:0},texel:{value:new THREE.Vector2()}},vertexShader,fragmentShader:`
   varying vec2 vUv;uniform sampler2D tDiffuse,depth,visibility;uniform mat4 inverseProjection,cameraWorld;uniform float fogEnabled,showroom,mapSize;uniform vec2 texel;
   void main(){vec4 color=texture2D(tDiffuse,vUv);float d=texture2D(depth,vUv).x;vec4 p=inverseProjection*vec4(vUv*2.-1.,d*2.-1.,1.);if(showroom>.5){float blur=smoothstep(17.,32.,-p.z/p.w)*showroom;vec4 soft=color*4.;
   for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){if(x==0&&y==0)continue;soft+=texture2D(tDiffuse,vUv+vec2(float(x),float(y))*texel*2.5);}
   color=mix(color,soft/12.,blur);}p=cameraWorld*(p/p.w);vec2 uv=(p.xz+mapSize*.5)/mapSize;
   float seen=texture2D(visibility,uv).r*.4;seen+=texture2D(visibility,uv+vec2(1.32/mapSize,0.)).r*.15;seen+=texture2D(visibility,uv-vec2(1.32/mapSize,0.)).r*.15;seen+=texture2D(visibility,uv+vec2(0.,1.32/mapSize)).r*.15;seen+=texture2D(visibility,uv-vec2(0.,1.32/mapSize)).r*.15;
   seen*=1.-smoothstep(.88,1.,max(abs(vUv.x*2.-1.),abs(vUv.y*2.-1.)));
   float fog=(1.-seen)*fogEnabled*step(d,.99999);color.rgb*=mix(vec3(1.),vec3(.40,.43,.49),fog);gl_FragColor=color;}`});
  const render=this.fog.render.bind(this.fog);this.fog.render=(renderer,write,read,...rest)=>{this.fog.uniforms.depth.value=read.depthTexture;this.fog.uniforms.texel.value.set(1/read.width,1/read.height);render(renderer,write,read,...rest);};this.composer.addPass(this.fog);
  this.ao=new AmbientOcclusion(game.scene,game.camera);this.composer.addPass(this.ao);
  this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.38,.55,1.15);this.composer.addPass(this.bloom);this.smaa=new SMAAPass();this.composer.addPass(this.smaa);this.composer.addPass(new OutputPass());
  this.grain=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0},strength:{value:.025}},vertexShader,fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse;uniform float time,strength;void main(){vec4 c=texture2D(tDiffuse,vUv);float noise=fract(sin(dot(gl_FragCoord.xy+floor(time*24.),vec2(12.9898,78.233)))*43758.5453)-.5;float vignette=smoothstep(.2,.8,distance(vUv,vec2(.5)));c.rgb=c.rgb*(1.-vignette*.12)+noise*strength;gl_FragColor=c;}`});this.composer.addPass(this.grain);
 }
 resize(quality=this.quality||'high'){this.quality=quality;this.ao.setQuality(quality);const g=this.game;this.composer.setPixelRatio(g.renderer.getPixelRatio());this.composer.setSize(innerWidth,innerHeight);}
 render(dt){const g=this.game,u=this.fog.uniforms,showroom=!!g.showroom&&['menu','garage'].includes(g.mode);this.smaa.enabled=showroom;u.showroom.value=showroom?1:0;this.grain.uniforms.strength.value=showroom?.012:.025;this.bloom.strength=showroom?.24:.38;this.ao.blendIntensity=showroom?.62:.72;if(g.mode==='playing')g.visibility.animate(dt);u.fogEnabled.value=['playing','paused','results'].includes(g.mode)?1:0;u.visibility.value=g.visibility.texture;u.inverseProjection.value.copy(g.camera.projectionMatrixInverse);g.camera.updateMatrixWorld();u.cameraWorld.value.copy(g.camera.matrixWorld);this.grain.uniforms.time.value=g.time;this.composer.render(dt);}
}
