import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForDeploymentFrames} from '../src/loading.js';
import {Game} from '../src/game.js';

async function settle(intervals){
 let next,done=false,time=0;const promise=waitForDeploymentFrames(fn=>{next=fn;}).then(()=>{done=true;});
 for(const dt of intervals){time+=dt;next(time);await Promise.resolve();if(done)break;}
 return {done,time,promise};
}
test('deployment waits for a minimum hold and several stable live frames',async()=>{
 const short=await settle(Array(10).fill(16));assert.equal(short.done,false);
 const stable=await settle(Array(40).fill(16));assert.equal(stable.done,true);assert.ok(stable.time>=350&&stable.time<500);
 const spike=await settle([0,300,16,16,100,...Array(8).fill(16)]);assert.equal(spike.done,true);assert.ok(spike.time>=528);
});
test('deployment hold is bounded on consistently slow machines',async()=>{
 const result=await settle(Array(25).fill(100));assert.equal(result.done,true);assert.ok(result.time<=1700);
});
test('deployment gates commands, shots and damage without requiring active physics',()=>{
 const g=Object.create(Game.prototype);g.deploymentIntro=true;g.aim={};g.keys=new Set(['KeyW','Space']);
 const target={enemy:false,hp:100};assert.equal(g.commandFor(target).throttle,0);assert.equal(g.commandFor(target).fire,false);
 assert.doesNotThrow(()=>g.fire(target,false));g.hurt(target,30,{});assert.equal(target.hp,100);
 g.deploymentIntro=false;g.hurt(target,30,{});assert.equal(target.hp,70);
});
