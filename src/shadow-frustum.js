import * as THREE from 'three';
// Fit a conservative receiver volume, not just a flat ground rectangle. Rays
// parallel to the sun retain light-space x/y, so depth extrusion covers casters.
export class ShadowFrustum {
 constructor(){this.point=new THREE.Vector3();this.near=new THREE.Vector3();this.far=new THREE.Vector3();this.bounds=new THREE.Box3();this.lightPoint=new THREE.Vector3();}
 update(camera,sun,groundY=0){
  camera.updateMatrixWorld();sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
  const bounds=this.bounds.makeEmpty(),view=sun.shadow.camera.matrixWorldInverse;
  // Terrain, roofs and airborne vehicles need receiver coverage above the ground.
  for(const y of [groundY-12,groundY+24])for(const x of [-1,1])for(const z of [-1,1]){
   const a=this.near.set(x,z,-1).unproject(camera),b=this.far.set(x,z,1).unproject(camera),dy=b.y-a.y;
   if(Math.abs(dy)<1e-5)return;
   const t=(y-a.y)/dy;if(t<0||t>1)return;
   this.point.copy(b).sub(a).multiplyScalar(t).add(a).applyMatrix4(view);bounds.expandByPoint(this.point);
  }
  const c=sun.shadow.camera,padding=3;
  // Quantize size as well as center: camera motion must not resize shadow texels.
  const width=Math.ceil((bounds.max.x-bounds.min.x+padding*2)/4)*4,height=Math.ceil((bounds.max.y-bounds.min.y+padding*2)/4)*4;
  const sx=width/sun.shadow.mapSize.x,sy=height/sun.shadow.mapSize.y,cx=Math.round(((bounds.max.x+bounds.min.x)*.5-view.elements[12])/sx)*sx+view.elements[12],cy=Math.round(((bounds.max.y+bounds.min.y)*.5-view.elements[13])/sy)*sy+view.elements[13];
  c.left=cx-width*.5;c.right=cx+width*.5;c.bottom=cy-height*.5;c.top=cy+height*.5;
  c.near=.1;c.far=Math.max(400,-bounds.min.z+80);c.updateProjectionMatrix();
 }
}
