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

// Presentation-only transforms. Restore authoritative poses before any gameplay
// query, including frames with zero ticks. Removed objects leave the registry.
export class SceneMotion {
 constructor(){this.poses=new Map();this.seen=new Set();}
 visit(game,fn){
  for(const s of game.soldiers||[])if(!s.dead&&s.root.visible){fn(s.root);fn(s.crew.root);fn(s.gun);for(const p of s.crew.parts)fn(p.mesh);}
  for(const s of game.shells||[])if(!s.dead)fn(s.mesh);
  for(const p of game.props||[])if(p.dynamic&&(!p.destroyed||p.crushed))fn(p.mesh);
  for(const d of game.debris||[])fn(d.mesh);
  for(const item of game.ragdolls?.items||[])if(!item.removed)for(const p of item.parts)fn(p.mesh);
  for(const item of game.smokeGrenades?.items||[])if(item.mesh)fn(item.mesh);
 }
 // Restoring only the quaternion canonicalizes Euler angles. A later yaw-only
 // animation write can then retain X/Z half-turns and flip the soldier's aim.
 // Keep the authored Euler representation for simulation; slerp only for display.
 restore(){for(const [mesh,p] of this.poses){mesh.position.copy(p.current);mesh.rotation.copy(p.euler);mesh.scale.copy(p.scale);}}
 before(game){this.restore();for(const p of this.poses.values()){p.previous.copy(p.current);p.previousRotation.copy(p.rotation);p.previousScale.copy(p.scale);}}
 after(game){
  this.seen.clear();this.visit(game,mesh=>{this.seen.add(mesh);let p=this.poses.get(mesh);if(!p){p={previous:mesh.position.clone(),previousRotation:mesh.quaternion.clone(),current:mesh.position.clone(),rotation:mesh.quaternion.clone(),euler:mesh.rotation.clone(),scale:mesh.scale.clone(),previousScale:mesh.scale.clone(),parent:mesh.parent,generation:mesh.userData.presentationGeneration};this.poses.set(mesh,p);}
   if(p.parent!==mesh.parent||p.generation!==mesh.userData.presentationGeneration||p.current.distanceToSquared(mesh.position)>64){p.previous.copy(mesh.position);p.previousRotation.copy(mesh.quaternion);p.previousScale.copy(mesh.scale);p.parent=mesh.parent;p.generation=mesh.userData.presentationGeneration;}
   p.current.copy(mesh.position);p.rotation.copy(mesh.quaternion);p.euler.copy(mesh.rotation);p.scale.copy(mesh.scale);
  });
  for(const mesh of this.poses.keys())if(!this.seen.has(mesh))this.poses.delete(mesh);
 }
 present(alpha){for(const [mesh,p] of this.poses){mesh.position.lerpVectors(p.previous,p.current,alpha);mesh.quaternion.slerpQuaternions(p.previousRotation,p.rotation,alpha);mesh.scale.lerpVectors(p.previousScale,p.scale,alpha);}}
}
