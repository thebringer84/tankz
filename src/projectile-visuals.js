import * as THREE from 'three';

// Ballistics remain in Rapier. The streak represents a short exposure of travel,
// not a smoke trail or a larger collision body.
export function createCannonProjectile(ammo,key='ap'){
 const root=new THREE.Group();root.name='Cannon projectile';
 const metal=new THREE.MeshBasicMaterial({color:key==='he'?0x727650:0xbca47b});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.34,8).rotateX(Math.PI/2),metal);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.065,.18,8).rotateX(Math.PI/2),metal);tip.position.z=.25;
 root.add(body,tip);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,
  uniforms:{tint:{value:new THREE.Color(ammo.color)}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv;uniform vec3 tint;void main(){float head=pow(vUv.y,1.7),edge=1.-smoothstep(.03,.5,abs(vUv.x-.5));float core=1.-smoothstep(.02,.14,abs(vUv.x-.5));gl_FragColor=vec4(mix(tint*1.4,vec3(3.,2.7,1.9),core),edge*head*.8);}`});
 const streak=new THREE.Group();streak.name='Exposure streak';
 const geometry=new THREE.PlaneGeometry(.2,1).rotateX(Math.PI/2).translate(0,0,-.5);
 for(let i=0;i<2;i++){const plane=new THREE.Mesh(geometry,material);plane.rotation.z=i*Math.PI/2;streak.add(plane);}
 root.add(streak);root.userData.streak=streak;return root;
}
export function updateCannonProjectile(mesh,speed,life){
 const streak=mesh.userData.streak;if(!streak)return;
 streak.scale.z=Math.min(3.2,Math.max(.2,speed*Math.min(.025,life)));
}
