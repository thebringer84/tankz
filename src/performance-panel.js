import {startGameProfiler} from './performance-profile.js';

const stages=[['simulation','Simulation'],['simulation.infantry.decisions','↳ Infantry decisions'],['simulation.infantry.movement','↳ Infantry movement'],['simulation.physics','↳ Physics'],['render','Render submission'],['effects.update','Effects update'],['effects.prepare','Effects prepare']];
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const ms=value=>value==null?'—':value.toFixed(2);

export class PerformancePanel {
 constructor(game){
  this.game=game;this.enabled=false;this.lastPaint=-Infinity;
  this.element=document.createElement('section');this.element.className='performance-panel';this.element.hidden=true;this.element.setAttribute('aria-label','Performance profiler');
  this.element.innerHTML=`<header><strong>PERFORMANCE</strong><span data-field="mode">Waiting for frames</span></header>
   <div class="profiler-summary"><b data-field="fps">— FPS</b><span>CPU <b data-field="cpu">—</b> ms</span><span>GPU <b data-field="gpu">—</b> ms</span></div>
   <canvas width="640" height="160" aria-label="Last 15 seconds of frame time: frame interval, CPU and GPU, with 60 and 120 FPS budgets"></canvas>
   <div class="profiler-legend"><span>Frame</span><span>CPU</span><span>GPU</span><span>Last 15 s · ms</span></div>
   <table><thead><tr><th>Stage</th><th>ms/frame</th></tr></thead><tbody>${stages.map(([key,label])=>`<tr><td>${label}</td><td data-stage="${key}">—</td></tr>`).join('')}</tbody></table>
   <p class="profiler-counts" data-field="counts">Waiting for frames…</p>
   <p class="profiler-note">CPU stages overlap. GPU — means pending or unavailable. Live values average the last second.</p>
   <div class="profiler-actions"><button type="button" data-profiler="record">Record 15 s</button><button type="button" data-profiler="recent">Save last 15 s</button><button type="button" data-profiler="export" disabled>Export capture</button></div>
   <label class="profiler-switch"><input type="checkbox" data-profiler="lights"> Flash lighting</label>
   <label class="profiler-switch"><input type="checkbox" data-profiler="machineGunLights"> Machine-gun lighting</label>
   <p class="profiler-status" data-field="status" role="status">Ready</p>`;
  this.fields=Object.fromEntries([...this.element.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el]));
  this.canvas=this.element.querySelector('canvas');this.context=this.canvas.getContext('2d');
  this.element.addEventListener('keydown',event=>{if(game.mode==='playing'&&event.code!=='Escape')event.stopPropagation();});
  this.element.addEventListener('click',event=>{
   const action=event.target.closest('[data-profiler]')?.dataset.profiler;
   if(action==='record')this.record();
   if(action==='recent')this.download(this.session.report(performance.now()-15000,true));
   if(action==='export'&&this.capture)this.download(this.capture);
  });
  this.element.querySelector('[data-profiler="lights"]').addEventListener('change',event=>{game.fx.flashLightsEnabled=event.target.checked;});
  this.element.querySelector('[data-profiler="machineGunLights"]').addEventListener('change',event=>{game.fx.machineGunLightsEnabled=event.target.checked;});
  this.mount();
 }
 mount(host){(host||document.body).append(this.element);this.element.classList.toggle('profiler-floating',!host);}
 setEnabled(enabled){
  if(this.enabled===enabled)return;
  if(enabled){
   try{this.session=startGameProfiler(this.game,{onFrame:(sample,history)=>this.update(sample,history)});}
   catch(error){this.fields.status.textContent=error.message;throw error;}
   this.enabled=true;this.element.hidden=false;this.lastPaint=-Infinity;
  }else{
   if(this.recordTimer){clearTimeout(this.recordTimer);this.recordTimer=null;this.capture=this.session.report(this.recordStart,true);this.fields.status.textContent='Recording stopped; partial capture saved.';}
   this.session.stop();this.session=null;this.enabled=false;this.element.hidden=true;
  }
  this.element.querySelector('[data-profiler="record"]').disabled=false;
  this.element.querySelector('[data-profiler="export"]').disabled=!this.capture;
 }
 record(){
  if(this.recordTimer)return;
  this.recordStart=performance.now();this.element.querySelector('[data-profiler="record"]').disabled=true;
  this.element.querySelector('[data-profiler="export"]').disabled=true;
  this.fields.status.textContent='Recording 15 seconds…';
  this.recordTimer=setTimeout(()=>{
   this.recordTimer=null;this.capture=this.session.report(this.recordStart,true);
   this.element.querySelector('[data-profiler="record"]').disabled=false;this.element.querySelector('[data-profiler="export"]').disabled=false;
   this.fields.status.textContent='Capture ready to export.';
  },15000);
 }
 download(report){
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download=`tankz-profile-${new Date().toISOString().replaceAll(':','-')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  this.fields.status.textContent='JSON exported with frame timeline and settings.';
 }
 update(sample,history){
  if(sample.timestamp-this.lastPaint<250)return;this.lastPaint=sample.timestamp;
  const recent=history.filter(f=>sample.timestamp-f.timestamp<=1000&&f.mode===sample.mode);
  const avg=fn=>mean(recent.map(fn));const interval=mean(recent.map(f=>f.interval).filter(v=>v!=null));
  this.fields.mode.textContent=sample.mode.replace('playing.','');
  this.fields.fps.textContent=interval?`${Math.round(1000/interval)} FPS`:'— FPS';this.fields.cpu.textContent=ms(avg(f=>f.cpuMs));
  this.fields.gpu.textContent=ms(mean(recent.map(f=>f.gpuMs).filter(v=>v!==undefined)));
  for(const [key]of stages)this.element.querySelector(`[data-stage="${key}"]`).textContent=ms(avg(f=>f.stages[key]?.ms||0));
  this.fields.counts.textContent=`${ms(avg(f=>f.stages.simulation?.invocations||0))} ticks/frame · ${Math.round(avg(f=>f.stages['simulation.infantry.movement']?.invocations||0))} controller queries · ${Math.round(avg(f=>f.drawCalls))} draws · ${sample.triangles.toLocaleString()} triangles · ${sample.projectiles} projectiles · ${sample.particles} particles`;
  this.element.querySelector('[data-profiler="lights"]').checked=this.game.fx.flashLightsEnabled!==false;
  this.element.querySelector('[data-profiler="machineGunLights"]').checked=!!this.game.fx.machineGunLightsEnabled;
  if(this.recordTimer)this.fields.status.textContent=`Recording… ${Math.max(0,Math.ceil((this.recordStart+15000-sample.timestamp)/1000))} s remaining`;
  this.draw(history,sample.timestamp);
 }
 draw(history,now){
  const c=this.context,w=this.canvas.width,h=this.canvas.height;if(!c)return;
  const frames=history.filter(f=>now-f.timestamp<=15000),peak=Math.max(33.34,...frames.map(f=>Math.max(f.cpuMs,f.gpuMs||0,f.interval||0))),limit=Math.min(150,peak*1.1);
  const y=value=>h-12-Math.min(limit,value)/limit*(h-22);
  c.clearRect(0,0,w,h);c.font='18px monospace';
  for(const [budget,label,x]of [[1000/60,'60 FPS',w-195],[1000/120,'120 FPS',w-95]]){c.strokeStyle='#4b5554';c.beginPath();c.moveTo(0,y(budget));c.lineTo(w,y(budget));c.stroke();c.fillStyle='#bac5c0';c.fillText(label,x,y(budget)-3);}
  for(const [key,color]of [['interval','#c4cec7'],['cpuMs','#eabd70'],['gpuMs','#77cbb4']]){c.strokeStyle=color;c.lineWidth=2;c.beginPath();let first=true;for(const f of frames){if(f[key]==null){first=true;continue;}const x=w*(1-(now-f.timestamp)/15000);if(first)c.moveTo(x,y(f[key]));else c.lineTo(x,y(f[key]));first=false;}c.stroke();}
 }
}
