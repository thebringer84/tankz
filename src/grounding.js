import * as THREE from 'three';

// Interpolate the same triangles used by the rendered terrain and physics mesh.
export function terrainSampler(geometry,size,segments){
 const positions=geometry.attributes.position,stride=segments+1,cell=size/segments;
 return (x,z)=>{const gx=THREE.MathUtils.clamp((x+size/2)/cell,0,segments),gz=THREE.MathUtils.clamp((z+size/2)/cell,0,segments),ix=Math.min(segments-1,Math.floor(gx)),iz=Math.min(segments-1,Math.floor(gz)),u=gx-ix,v=gz-iz,a=iz*stride+ix;
  const h00=positions.getY(a),h10=positions.getY(a+1),h01=positions.getY(a+stride),h11=positions.getY(a+stride+1);
  return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
 };
}
export function alignToGround(object,height){const x=object.position.x,z=object.position.z,normal=new THREE.Vector3(height(x-.25,z)-height(x+.25,z),.5,height(x,z-.25)-height(x,z+.25)).normalize();object.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal));}
export function seatOnGround(object,geometry,height,embed=0){
 const transform=new THREE.Matrix4().compose(new THREE.Vector3(),object.quaternion,object.scale),vertices=geometry.attributes.position,v=new THREE.Vector3();let support=-Infinity;
 for(let i=0;i<vertices.count;i++){v.fromBufferAttribute(vertices,i).applyMatrix4(transform);support=Math.max(support,height(object.position.x+v.x,object.position.z+v.z)-v.y);}
 object.position.y=support-embed;object.updateMatrix();return object.position.y;
}
