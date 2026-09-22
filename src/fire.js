import * as THREE from 'three';
// A baked fluid sequence supplies coherent motion; distortion adds finer rising detail.
export function createBurningFlame(atlas,phase=0){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,premultipliedAlpha:true,side:THREE.DoubleSide,
 uniforms:{atlas:{value:atlas},intensity:{value:1},time:{value:0},phase:{value:phase}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy;gl_Position=projectionMatrix*center;}`,
 fragmentShader:`varying vec2 vUv;uniform sampler2D atlas;uniform float time,phase,intensity;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 vec4 tile(float frame,vec2 uv){vec2 cell=vec2(mod(frame,8.),7.-floor(frame/8.));return texture2D(atlas,(cell+clamp(uv,vec2(.006,.003),vec2(.994,.997)))/8.);}
 vec4 sequence(float frame,vec2 uv){float f=floor(frame);return mix(tile(f,uv),tile(min(f+1.,63.),uv),fract(frame));}
 void main(){float t=time+phase;vec2 uv=vec2(mix(.13,.87,vUv.x),vUv.y*.65);
 float flow=noise(vec2(vUv.x*6.,vUv.y*8.-t*2.2));uv.x+=(flow-.5)*.055*vUv.y;
 float frame=8.+mod(t*18.,56.);vec4 c=sequence(frame,uv);
 if(frame>56.)c=mix(c,sequence(frame-56.,uv),smoothstep(56.,64.,frame));
 float erosion=noise(vec2(vUv.x*19.,vUv.y*24.-t*5.));
 float a=c.a*smoothstep(.04,.3,c.a-erosion*.17*vUv.y)*smoothstep(0.,.045,vUv.y)*(1.-smoothstep(.88,1.,vUv.y))*.85;
 vec3 hot=c.rgb*(1.15+.65*(1.-vUv.y));a*=intensity;gl_FragColor=vec4(hot*a,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const geometry=new THREE.PlaneGeometry(.95,2.45);geometry.translate(0,1.225,0);
 const mesh=new THREE.Mesh(geometry,material);mesh.name='simulated-tire-flame';mesh.frustumCulled=false;
 return mesh;
}
