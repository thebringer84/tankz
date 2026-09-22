import * as THREE from 'three';

export function snapshotVehicle(t){
 t.previousPose??={position:new THREE.Vector3(),rotation:new THREE.Quaternion()};
 t.previousPose.position.copy(t.body.translation());t.previousPose.rotation.copy(t.body.rotation());
}

// Render one fixed step behind simulation, using the remaining accumulator as
// the blend. Never write the displayed pose back into the physics body.
export function presentVehicle(t,alpha){
 const position=t.body.translation(),rotation=t.body.rotation();
 t.root.position.copy(position);t.root.quaternion.copy(rotation);
 if(!t.previousPose)return;
 if(t.previousPose.position.distanceToSquared(t.root.position)>64){snapshotVehicle(t);return;}
 t.root.position.lerpVectors(t.previousPose.position,t.root.position,alpha);
 t.root.quaternion.slerp(t.previousPose.rotation,1-alpha);
}

export function followCamera(game,target,dt){
 const rig=game.cameraRig??={anchor:target.clone(),offset:new THREE.Vector3(0,43*game.zoom,30*game.zoom)};
 const blend=1-Math.exp(-Math.max(0,dt)*5);
 rig.anchor.lerp(target,blend);rig.offset.lerp(new THREE.Vector3(0,43*game.zoom,30*game.zoom),blend);
 game.camera.position.copy(rig.anchor).add(rig.offset);
 // Position and gaze share the same filtered anchor. Looking directly at the
 // unsmoothed physics target used to introduce a tiny rotation every tick.
 game.camera.lookAt(rig.anchor.x,rig.anchor.y,rig.anchor.z-3);
}
