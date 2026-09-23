import {chromium} from '@playwright/test';

// Frozen-scene draw diagnostics, or --live for actual playing/paused frame captures.
const live=process.argv.includes('--live'),small=process.argv.includes('--small');
const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});
try {
 const page=await browser.newPage({viewport:{width:Number(process.env.TANKZ_WIDTH)||(small?320:1440),height:Number(process.env.TANKZ_HEIGHT)||(small?180:900)}});
 page.on('pageerror',error=>console.error(error.message));
 await page.goto(process.env.TANKZ_URL||'http://localhost:5173');
 await page.waitForFunction(()=>window.tankz?.game?.running,null,{timeout:120000});
 console.log(JSON.stringify(await page.evaluate(()=>{
  const g=tankz.game,gl=g.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:g.canvas.width,height:g.canvas.height,pixelRatio:g.renderer.getPixelRatio()};
 })));
 if(live){
  await page.evaluate(()=>tankz.game.deploy());
  for(const mode of ['playing','paused']){
   await page.evaluate(mode=>{tankz.game.mode=mode;},mode);
   console.log(JSON.stringify(await page.evaluate(()=>tankz.profile(1500))));
  }
 }else for(const mode of ['menu','playing']){
  if(mode==='playing')await page.evaluate(()=>tankz.game.deploy());
  await page.evaluate(()=>{tankz.game.running=false;});
  await page.waitForTimeout(100);
  for(const variant of ['baseline','noShadows']){
   console.log(JSON.stringify(await page.evaluate(({mode,variant})=>{
    const g=tankz.game,r=g.renderer,shadows=r.shadowMap.enabled;
    r.shadowMap.enabled=variant==='noShadows'?false:shadows;
    const auto=r.info.autoReset;r.info.autoReset=false;
    const samples=[],passes={};
    const originals=g.presentation.composer.passes.map(pass=>{
     const original=pass.render;pass.render=function(...args){const start=performance.now(),calls=r.info.render.calls;try{return original.apply(this,args);}finally{const key=this.constructor.name;const p=passes[key]??={ms:0,calls:0};p.ms+=performance.now()-start;p.calls+=r.info.render.calls-calls;}};return [pass,original];
    });
    try{
     for(let i=0;i<3;i++){r.info.reset();const start=performance.now();g.presentation.render(1/60);samples.push(performance.now()-start);}
     samples.sort((a,b)=>a-b);
     return {mode,variant,cpuMedianMs:samples[1],drawCalls:r.info.render.calls,triangles:r.info.render.triangles,passes:Object.fromEntries(Object.entries(passes).map(([k,v])=>[k,{ms:v.ms/3,calls:v.calls/3}]))};
    }finally{for(const [pass,original]of originals)pass.render=original;r.info.autoReset=auto;r.shadowMap.enabled=shadows;}
   },{mode,variant})));
  }
 }
}finally{await browser.close();}
