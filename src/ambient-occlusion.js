import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';

// Soft, depth-aware contact shading. Transparent effects and ground decals must
// not become opaque occluders when Three renders its normal/depth override pass.
export class AmbientOcclusion extends GTAOPass {
 constructor(scene,camera){
  super(scene,camera,1,1);
  this.resolutionScale=.75;
  this.blendIntensity=.72;
  this.updateGtaoMaterial({radius:2.2,thickness:1,distanceExponent:1.5,distanceFallOff:1,scale:1,samples:16,screenSpaceRadius:false});
  this.updatePdMaterial({radius:5,samples:16,depthPhi:1,normalPhi:3});
 }
 setSize(width,height){super.setSize(Math.max(1,Math.round(width*(this.resolutionScale??.75))),Math.max(1,Math.round(height*(this.resolutionScale??.75))));}
 setQuality(quality){this.resolutionScale=quality==='low'?.5:.75;this.updateGtaoMaterial({samples:quality==='low'?8:16});this.updatePdMaterial({samples:quality==='low'?8:16});}
 _overrideVisibility(){
  super._overrideVisibility();
  this.scene.traverse(object=>{if(!object.isMesh||!object.visible)return;const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(m=>m.transparent||!m.depthWrite)){object.visible=false;this._visibilityCache.push(object);}});
 }
}
