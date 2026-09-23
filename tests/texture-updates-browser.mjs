import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-webgl']});
try{
 const page=await browser.newPage();await page.route('**/src/main.js*',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.goto(process.env.TANKZ_URL||'http://localhost:5173');
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{markTextureRows}=await import('/src/texture-updates.js');
  const renderer=new T.WebGLRenderer(),target=new T.WebGLRenderTarget(7,7),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),output=[];
  for(const float of [false,true]){
   const data=float?new Float32Array(49):new Uint8Array(49),texture=new T.DataTexture(data,7,7,T.RedFormat,float?T.FloatType:T.UnsignedByteType);texture.needsUpdate=true;
   const material=new T.ShaderMaterial({uniforms:{map:{value:texture}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 v;uniform sampler2D map;void main(){float r=texture2D(map,v).r;gl_FragColor=vec4(r,r,r,1.);}'}),mesh=new T.Mesh(new T.PlaneGeometry(2,2),material);scene.add(mesh);
   renderer.setRenderTarget(target);renderer.render(scene,camera);
   for(const k of [1,15,16,48])data[k]=float?1:255;markTextureRows(texture,[1,15,16,48],7);renderer.render(scene,camera);
   const pixels=new Uint8Array(196);renderer.readRenderTargetPixels(target,0,0,7,7,pixels);output.push(Array.from({length:49},(_,i)=>pixels[i*4]));scene.remove(mesh);texture.dispose();material.dispose();mesh.geometry.dispose();
  }
  target.dispose();renderer.dispose();return output;
 });
 for(const pixels of result)for(let i=0;i<49;i++)assert.equal(pixels[i],[1,15,16,48].includes(i)?255:0,`pixel ${i}`);
 console.log('RedFormat byte and float partial uploads match GPU readback.');
}finally{await browser.close();}
