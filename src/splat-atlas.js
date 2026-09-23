import * as THREE from 'three';

export const SPLAT_TYPES=['blood-impact','blood-smear','blood-droplets','scorch'];
export const SPLAT_FILES=SPLAT_TYPES.flatMap(type=>Array.from({length:4},(_,i)=>`${type}-${i+1}.png`));

// One shared texture keeps the existing two instanced decal draw calls.
export async function loadSplatAtlas(baseUrl){
 const images=await Promise.all(SPLAT_FILES.map(file=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Unable to load splat ${file}`));image.src=`${baseUrl}assets/splats/${file}`;
 })));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
 const ctx=canvas.getContext('2d');
 images.forEach((image,i)=>ctx.drawImage(image,(i%4)*512+4,Math.floor(i/4)*512+4,504,504));
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;
 texture.minFilter=texture.magFilter=THREE.LinearFilter;
 return texture;
}

// Shuffle bags show every silhouette before reusing it, without boundary repeats.
export class SplatVariants{
 constructor(random=Math.random){this.random=random;this.bags={};this.last={};}
 next(type){
  const row=SPLAT_TYPES.indexOf(type);
  if(row<0)throw new RangeError(`Unknown splat type: ${type}`);
  let bag=this.bags[type];
  if(!bag?.length){
   bag=this.bags[type]=[0,1,2,3];
   for(let i=3;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag[3]===this.last[type])[bag[0],bag[3]]=[bag[3],bag[0]];
  }
  const variant=bag.pop();this.last[type]=variant;return row*4+variant;
 }
}
