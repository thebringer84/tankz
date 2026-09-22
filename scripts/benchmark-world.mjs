import RAPIER from '@dimforge/rapier3d-compat';
import {worldFixture,freeWorld} from '../tests/world-fixture.js';
await RAPIER.init();const start=performance.now(),g=await worldFixture();
console.log(JSON.stringify({deploymentMs:performance.now()-start,infantry:g.soldiers.length,jeeps:g.tanks.filter(t=>t.enemy).length,terrainChunks:g.environment.ruts.patches.length,props:g.props.length}));
const timings={};for(const [obj,key,name] of [[g.infantry,'update','infantry'],[g.infantry.controller,'computeColliderMovement','characterMovement'],[g.infantry,'plan','planning'],[g.infantry.navigation,'route','route'],[g.director,'update','director'],[g.visibility,'update','visibility'],[g.world,'step','physics'],[g.environment.ruts,'update','ruts']]){const fn=obj[key].bind(obj);obj[key]=(...args)=>{const start=performance.now(),value=fn(...args);(timings[name]??=[]).push(performance.now()-start);return value;};}
for(let i=0;i<300;i++){const start=performance.now();g.step(1/60);(timings.total??=[]).push(performance.now()-start);}
for(const [key,values] of Object.entries(timings)){values.sort((a,b)=>a-b);console.log(key,JSON.stringify({medianMs:values[Math.floor(values.length*.5)],p95Ms:values[Math.floor(values.length*.95)],maxMs:values.at(-1)}));}
freeWorld(g);
