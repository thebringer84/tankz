const interfaceAssets=new Map();
export const interfaceAsset=file=>interfaceAssets.get(file)||import.meta.env.BASE_URL+'assets/'+file+'.png';

// Yield through a paint before the next synchronous preparation stage.
export const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

export class LoadingScreen {
 constructor(element=document.querySelector('#loading')){this.element=element;this.progress=0;this.hideTimer=null;}
 show(title='PREPARING YOUR VEHICLE'){
  clearTimeout(this.hideTimer);this.progress=0;const e=this.element;e.style.backgroundImage='url("'+interfaceAsset('loading-desert-survey')+'")';e.hidden=false;e.classList.remove('hidden','failed');e.querySelector('#loading-title').textContent=title;e.querySelector('#loading-error').hidden=true;e.querySelector('#loading-retry').hidden=true;this.update('Starting preparation',0);
  document.querySelector('#ui').inert=true;
 }
 update(label,progress){const e=this.element;this.progress=Math.max(this.progress,Math.min(1,progress));const percent=Math.round(this.progress*100);e.querySelector('#loading-status').textContent=label;e.querySelector('#loading-percent').textContent=percent+'%';e.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',percent);e.querySelector('#loading-fill').style.transform='scaleX('+this.progress+')';}
 hide(){this.update('Ready',1);this.element.classList.add('hidden');document.querySelector('#ui').inert=false;this.hideTimer=setTimeout(()=>{this.element.hidden=true;},350);}
 fail(error){console.error(error);const e=this.element;e.classList.add('failed');e.querySelector('#loading-status').textContent='Preparation interrupted';e.querySelector('#loading-error').hidden=false;e.querySelector('#loading-error').textContent='Unable to prepare the scene. Reload to retry.';const retry=e.querySelector('#loading-retry');retry.hidden=false;retry.onclick=()=>location.reload();retry.focus();}
}

export async function preloadInterface(progress=()=>{}){
 const assets=['loading-desert-survey','awareness-edge','alert-chevron'];let loaded=0;
 await Promise.all(assets.map(async file=>{const response=await fetch(import.meta.env.BASE_URL+'assets/'+file+'.png');if(!response.ok)throw new Error('Unable to load interface artwork');const url=URL.createObjectURL(await response.blob()),image=new Image();image.src=url;await image.decode();interfaceAssets.set(file,url);progress(++loaded/assets.length);}));
}

// Compile hidden pooled effects as well as visible meshes. The render also
// allocates shadow maps, postprocess targets and uploads geometry buffers.
export async function warmScene(game){
 game.updateCamera(0);game.fx.prepare(game.camera);
 await game.renderer.compileAsync(game.scene,game.camera);
 const pooled=[...game.fx.muzzleFlashes.map(f=>f.group),...game.fx.shockwaves.map(w=>w.mesh),game.fx.headingMarker,...game.fx.projectileTemplates,...game.wreckFires.pool.map(s=>s.group),game.drone.model.root];
 const saved=pooled.map(object=>({object,visible:object.visible,position:object.position.clone()}));
 try{for(const object of pooled){object.visible=true;object.position.copy(game.player.root.position);}game.presentation.render(0);}
 finally{for(const {object,visible,position} of saved){object.visible=visible;object.position.copy(position);}}
 game.presentation.render(0);
 await nextPaint();
}
