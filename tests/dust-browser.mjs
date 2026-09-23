import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({...(process.env.TANKZ_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
// Render explicit frames so assertions measure simulation time instead of the
// speed of a headless software GPU. DOM/WAAPI animations still run normally.
await page.route('**/src/main.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 import '/src/style.css';import {Game} from '/src/game.js';import {UI} from '/src/ui.js';
 window.advanceGameFrame=Game.prototype.frame;Game.prototype.frame=function(){};
 const game=new Game(document.querySelector('#world'));await game.init();
 const ui=new UI(game,document.querySelector('#ui'));window.tankz={game,ui};
 document.querySelector('#loading').remove();
 `}));
await page.addInitScript(()=>localStorage.setItem('tankz-settings',JSON.stringify({quality:'low',shake:0})));
try{
 await page.goto(process.env.TANKZ_URL||'http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game.running,{timeout:60000});await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();
 await page.evaluate(()=>{const g=tankz.game;window.dustScenario=(kind)=>{
  const t=g.player;t.body.setTranslation({x:0,y:g.environment.surfaceHeight(0,19)+(kind==='landing'?8:1.05),z:19},true);t.body.setRotation({x:0,y:0,z:0,w:1},true);t.body.setLinvel({x:0,y:0,z:0},true);t.body.setAngvel({x:0,y:0,z:0},true);t.dustMotion=null;t.turboCharge=1;t.turboLocked=false;g.fx.clear();g.syncTank(t);
  const aim=t.root.position.clone();aim.z+=100;const cmd={throttle:kind==='trail'?1:0,steer:kind==='pivot'?1:0,aim,fire:false,secondary:false};let landedAt=-1;
  for(let i=0;i<(kind==='landing'?180:360);i++){
   g.drive(t,cmd,1/60);g.world.step();g.syncTank(t);g.fx.update(1/60,false);
   if(kind==='landing'&&t.dustMotion.lastLandingEnergy&&landedAt<0)landedAt=i;
   if(landedAt>=0&&i-landedAt===15)break;
  }
  const p=t.root.position;g.updateCamera(10);g.camera.position.set(p.x+16,p.y+36,p.z+32);g.camera.lookAt(p.x,p.y,p.z-(kind==='trail'?10:0));g.visibility.update(0,true);g.fx.prepare(g.camera);g.presentation.render(0);tankz.ui.frame(1/60);
  return {count:g.fx.particles.filter(p=>p.vehicleDust).length,wakes:g.fx.particles.filter(p=>p.wake).length,energy:t.dustMotion.lastLandingEnergy||0,instances:g.fx.vehicleDust.mesh.geometry.instanceCount,speed:t.speed};
 };});
 for(const kind of ['trail','pivot','landing']){
  const result=await page.evaluate(kind=>window.dustScenario(kind),kind);console.log(kind,result);assert.ok(result.count>30);assert.equal(result.instances,result.count);if(kind==='landing')assert.ok(result.energy>10000);if(kind==='trail')assert.ok(result.wakes>10);
  await page.screenshot({path:`test-artifacts/tank-dust-${kind}.png`});
 }
 assert.deepEqual(errors,[]);console.log('Real-physics trail, pivot and landing dust render without browser errors.');
}finally{await browser.close();}
