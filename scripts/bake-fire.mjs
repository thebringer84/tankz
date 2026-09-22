// Offline 2D incompressible flow and temperature advection; no runtime simulation.
// Run: node scripts/bake-fire.mjs. Deterministic, dependency-free PNG export.
import {deflateSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';
const W=96,H=192,N=W*H,dt=.035,frames=64,cols=8;
let u=new Float32Array(N),v=new Float32Array(N),heat=new Float32Array(N);
const sample=(a,x,y)=>{x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(H-1.001,y));const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,k=iy*W+ix;return (a[k]*(1-fx)+a[k+1]*fx)*(1-fy)+(a[k+W]*(1-fx)+a[k+W+1]*fx)*fy;};
const advect=a=>{const b=new Float32Array(N);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;b[k]=sample(a,x-u[k]*dt,y-v[k]*dt);}return b;};
const snapshots=[];
for(let step=0;step<520;step++){
 const time=step*dt;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;
  // Buoyancy and multi-scale swirling forcing break the rising sheet into tongues.
  v[k]+=dt*(heat[k]*95-1.3*v[k]);
  u[k]+=dt*(Math.sin(y*.17-time*3+x*.09)*11+Math.sin(y*.35-time*5-x*.18)*5-1.8*u[k]);
 }
 u=advect(u);v=advect(v);
 let pressure=new Float32Array(N),div=new Float32Array(N);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;div[k]=(u[k+1]-u[k-1]+v[k+W]-v[k-W])*.5;}
 for(let j=0;j<14;j++){const next=new Float32Array(N);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;next[k]=(pressure[k-1]+pressure[k+1]+pressure[k-W]+pressure[k+W]-div[k])*.25;}pressure=next;}
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;u[k]-=(pressure[k+1]-pressure[k-1])*.5;v[k]-=(pressure[k+W]-pressure[k-W])*.5;}
 heat=advect(heat);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;heat[k]=Math.max(0,heat[k]-dt*(.12+heat[k]*.28));
  if(y<9){const center=W*.5+Math.sin(time*2.1)*3;const source=Math.exp(-Math.pow((x-center)/19,4))*(.83+.17*Math.sin(x*.7+time*9));heat[k]=Math.max(heat[k],source*(1-y/24));v[k]=Math.max(v[k],34+8*Math.sin(x*.3+time*6));}
 }
 if(step>=328&&(step-328)%3===0)snapshots.push(heat.slice());
}
const aw=W*cols,ah=H*8,pixels=Buffer.alloc(aw*ah*4);
for(let f=0;f<frames;f++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const t=snapshots[f][y*W+x],a=Math.max(0,Math.min(1,(t-.10)*3.4));
 const k=(((f/cols|0)*H+H-1-y)*aw+(f%cols)*W+x)*4;
 // Straight-alpha color: red/copper cooling edges, yellow hot interior.
 pixels[k]=255;pixels[k+1]=Math.round(45+200*Math.pow(Math.min(1,t),1.1));pixels[k+2]=Math.round(8+130*Math.pow(Math.min(1,t),3));pixels[k+3]=Math.round(a*255);
}
const crc=b=>{let c=0xffffffff;for(const byte of b){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
const chunk=(name,data)=>{const type=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([type,data])),data.length+8);return out;};
const header=Buffer.alloc(13);header.writeUInt32BE(aw);header.writeUInt32BE(ah,4);header[8]=8;header[9]=6;
const scan=Buffer.alloc((aw*4+1)*ah);for(let y=0;y<ah;y++)pixels.copy(scan,y*(aw*4+1)+1,y*aw*4,(y+1)*aw*4);
writeFileSync('public/assets/fire-simulation-atlas.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Baked ${frames} fluid frames, ${aw}x${ah} RGBA atlas.`);
