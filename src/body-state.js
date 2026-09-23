// Cached Rapier reads are read-only snapshots. Physics steps and direct body
// mutations invalidate them; a pre-physics value never survives a world step.
export function cacheBodyState(world){
 let epoch=0;
 const create=world.createRigidBody.bind(world),step=world.step.bind(world);
 world.step=(...args)=>{epoch++;try{return step(...args);}finally{epoch++;}};
 world.createRigidBody=(...args)=>{
  const body=create(...args),values={},versions={};
  const invalidate=()=>{for(const key of Object.keys(versions))versions[key]=-1;};
  for(const key of ['translation','rotation','linvel','angvel']){
   const read=body[key].bind(body);
   body[key]=()=>{if(versions[key]!==epoch){values[key]=read();versions[key]=epoch;}return values[key];};
  }
  for(const key of ['setTranslation','setRotation','setLinvel','setAngvel','setNextKinematicTranslation','setNextKinematicRotation','applyImpulse','applyTorqueImpulse','applyImpulseAtPoint','setBodyType','setEnabled','resetVelocities']){
   if(!body[key])continue;const mutate=body[key].bind(body);body[key]=(...args)=>{invalidate();return mutate(...args);};
  }
  return body;
 };
 return ()=>{epoch++;};
}
