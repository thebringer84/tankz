import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];await page.routeWebSocket('**',()=>{});
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
 await page.route('**/src/main.js*',route=>route.fulfill({contentType:'application/javascript',body:`
  import '/src/style.css';import {Game} from '/src/game.js';import * as T from '/node_modules/three/build/three.module.js';import {makeMaterials} from '/src/models.js';
  const source=await (await fetch('/src/game.js')).text(),url=source.match(/import RAPIER from ["']([^"']+)/)[1];await (await import(url)).default.init();const game=new Game(document.querySelector('#world'));game.bindInputs=()=>{};game.mode='playing';game.textures=Object.fromEntries(['sand','normal','height','armor','concrete','rock','smoke','fire','sparks','crater'].map(k=>[k,new T.Texture()]));game.materials=makeMaterials(game.textures);game.deploy();document.querySelector('#loading')?.remove();window.game=game;
 `}));
 await page.goto(process.env.TANKZ_URL||'http://localhost:5173');await page.waitForFunction(()=>window.game,null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),g=game;g.player.hp=1e9;g.renderer.setPixelRatio(1);g.renderer.shadowMap.enabled=true;
  const s=g.soldiers[0];s.body.setTranslation({x:2,y:1,z:12},true);g.world.step();g.infantry.pose(s);g.visibility.canSee=()=>true;
  for(let i=0;i<12;i++){g.infantry.beginFrame();g.step(1/60);g.infantry.endFrame();g.fx.update(1/60,false);g.updateCamera(1/60);g.fx.prepare(g.camera);g.presentation.render(1/60);}
  g.fx.smoke(new T.Vector3(0,2,12),true);g.fx.explosion(new T.Vector3(3,1,12));g.fire(g.player,false);
  g.fx.update(.1,false);g.fx.prepare(g.camera);g.renderer.info.autoReset=false;g.renderer.info.reset();g.presentation.render(.1);
  const output={skin:s.crew.skin?.mesh.isSkinnedMesh,normal:g.fx.points.geometry.instanceCount,hot:g.fx.hotPoints.geometry.instanceCount,aa:g.presentation.smaa.enabled,passes:g.presentation.composer.passes.length,draws:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles,shadow:[g.sun.shadow.camera.right-g.sun.shadow.camera.left,g.sun.shadow.camera.top-g.sun.shadow.camera.bottom],lights:g.fx.renderLights.length,fog:g.visibility.data.some(x=>x>0)};
  const {createCrew,makeMaterials}=await import('/src/models.js'),{skinCrew,restoreCrew}=await import('/src/infantry-skin.js');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,20),target=new T.WebGLRenderTarget(128,128);camera.position.set(2,1.5,4);camera.lookAt(0,.65,0);scene.add(new T.HemisphereLight(0xffffff,0x444444,2));const crew=createCrew(makeMaterials({armor:null,concrete:null,normal:null,rock:null}));scene.add(crew.root);
  const pixels=()=>{g.renderer.setRenderTarget(target);g.renderer.render(scene,camera);const p=new Uint8Array(128*128*4);g.renderer.readRenderTargetPixels(target,0,0,128,128,p);return p;};
  const before=pixels();skinCrew(crew);const after=pixels();let differences=0;for(let i=0;i<before.length;i++)if(Math.abs(before[i]-after[i])>5)differences++;output.skinPixelDifferences=differences;output.movingSkinDifferences=[];
  for(let frame=0;frame<8;frame++){
   crew.root.position.set(Math.sin(frame)*.3,0,Math.cos(frame)*.2);crew.root.rotation.y=frame*.25;crew.parts[3].mesh.rotation.x=frame*.12;
   const skinned=pixels();restoreCrew(crew);const original=pixels();let changed=0;for(let i=0;i<original.length;i++)if(Math.abs(original[i]-skinned[i])>5)changed++;output.movingSkinDifferences.push(changed);skinCrew(crew);
  }
  restoreCrew(crew);target.dispose();g.renderer.setRenderTarget(null);
  const {Visibility}=await import('/src/visibility.js'),{DustRenderer}=await import('/src/vehicle-dust.js');
  const dustScene=new T.Scene(),dustCamera=new T.OrthographicCamera(-2,2,2,-2,.1,20),dustTarget=new T.WebGLRenderTarget(16,16);dustCamera.position.z=5;dustCamera.lookAt(0,0,0);
  const root=new T.Group(),body=new T.Mesh(new T.BoxGeometry(2,2,.2),new T.MeshBasicMaterial({color:0x0000ff,toneMapped:false}));body.position.z=.4;root.add(body);dustScene.add(root);
  const unit={root,infantry:true},visibility=new Visibility({});const state=visibility.track(unit);state.opacity=1;visibility.applyFade(unit,state);
  const texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
  const dust=new DustRenderer(dustScene,texture,{},'float groundY(vec2 p){return -100.;}',1),particle={vehicleDust:true,p:new T.Vector3(0,0,2),size:4,life:4,total:5,spread:0,color:new T.Color(0xff0000),density:1,rotation:0};
  const dustPixel=()=>{dustCamera.updateMatrixWorld();dust.prepare([particle],dustCamera);g.renderer.setRenderTarget(dustTarget);g.renderer.render(dustScene,dustCamera);const pixel=new Uint8Array(4);g.renderer.readRenderTargetPixels(dustTarget,8,8,1,1,pixel);return [...pixel];};
  output.dustFront=dustPixel();particle.p.z=-1;output.dustBehind=dustPixel();visibility.dispose();dustTarget.dispose();texture.dispose();g.renderer.setRenderTarget(null);
  g.infantry.wound(s);g.visibility.update(1/60);g.presentation.render(1/60);g.infantry.kill(s);g.presentation.render(1/60);g.buildWorld('low');g.presentation.render(0);return output;
 });
 await page.screenshot({path:'/tmp/tankz-rendering-check.png'});
 assert.ok(result.dustFront[0]>50&&result.dustFront[2]<200,JSON.stringify(result.dustFront));assert.ok(result.dustBehind[0]<5&&result.dustBehind[2]>250,JSON.stringify(result.dustBehind));assert.ok(result.skin&&result.normal>0&&result.hot>0&&result.aa&&result.fog);assert.ok(result.skinPixelDifferences<200,`skinning changed ${result.skinPixelDifferences} channels`);assert.ok(result.movingSkinDifferences.every(n=>n<200),JSON.stringify(result.movingSkinDifferences));assert.equal(result.lights,4);assert.equal(result.passes,5);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}
