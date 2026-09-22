import test from 'node:test';
import assert from 'node:assert/strict';
import {ImpactReticle} from '../src/impact-reticle.js';
const sample=(reticle,x,y,dt=1/60,source='tank')=>reticle.update({x,y,visible:true},dt,1200,800,source);

test('impact marker eases large ballistic jumps and settles without overshooting',()=>{
 const r=new ImpactReticle();sample(r,300,250);const first=sample(r,800,400);
 assert.ok(first.x>300&&first.x<350);let previous=first.x;
 for(let i=0;i<59;i++){const p=sample(r,800,400);assert.ok(p.x>=previous&&p.x<=800);previous=p.x;}
 assert.ok(Math.abs(previous-800)<.001);
});

test('reticle filtering strongly suppresses alternating prediction jitter',()=>{
 const r=new ImpactReticle();sample(r,600,300);let min=Infinity,max=-Infinity;
 for(let i=0;i<120;i++){const p=sample(r,600+(i%2?25:-25),300);if(i>60){min=Math.min(min,p.x);max=Math.max(max,p.x);}}
 assert.ok(max-min<1,`filtered movement was ${max-min}px`);
});

test('damping is frame-rate independent and resets on deployment or resize',()=>{
 const finish=fps=>{const r=new ImpactReticle();sample(r,300,250);for(let i=0;i<fps/2;i++)sample(r,800,400,1/fps);return r.position.x;};
 assert.ok(Math.abs(finish(30)-finish(120))<1e-8);
 const r=new ImpactReticle();sample(r,300,250);assert.equal(sample(r,800,400,1/60,'new tank').x,800);
 assert.equal(r.update({x:2000,y:900},1/60,600,400,'new tank').x,480);
 assert.equal(r.position.y,225);assert.equal(r.position.visible,true);
});

test('offscreen predictions remain visible inside the central area without changing the prediction',()=>{
 const r=new ImpactReticle(),point={x:50000,y:-50000,visible:false};sample(r,600,300);
 for(let i=0;i<60;i++){const p=r.update(point,1/60,1200,800,'tank');assert.ok(p.visible);assert.ok(p.x>=240&&p.x<=960&&p.y>=200&&p.y<=576);}
 assert.ok(r.position.x>959);assert.ok(r.position.y<201);
 assert.deepEqual(point,{x:50000,y:-50000,visible:false});
});

test('reacquisition moves continuously from the central hold instead of hiding or snapping',()=>{
 const r=new ImpactReticle();sample(r,600,300);for(let i=0;i<60;i++)sample(r,2000,300);
 const before=r.position.x,p=sample(r,400,250);assert.ok(p.visible);assert.ok(p.x<before&&p.x>900);
});

test('invalid projections keep the last visible position',()=>{
 const r=new ImpactReticle();sample(r,600,300);
 assert.deepEqual(r.update({x:NaN,y:300,visible:false},1/60,1200,800,'tank'),{x:600,y:300,visible:true});
});

test('target lock follows its exact projection even outside the central hunting area',()=>{
 const r=new ImpactReticle();sample(r,600,300);
 const lock=r.update({x:1100,y:140,visible:true},1/60,1200,800,'tank',true);
 assert.deepEqual(lock,{x:1100,y:140,visible:true});
 const moved=r.update({x:1080,y:150,visible:true},1/60,1200,800,'tank',true);
 assert.equal(moved.x,1080);assert.equal(moved.y,150);
 const hunting=sample(r,600,300);assert.ok(hunting.visible&&hunting.x<=960&&hunting.y>=200);
});
