import test from 'node:test';
import assert from 'node:assert/strict';
import {InfantryDecisions} from '../src/infantry-decisions.js';

test('1,500 simultaneous alerts stay bounded across catch-up ticks and all receive decisions',()=>{
 const queue=new InfantryDecisions(),soldiers=Array.from({length:1500},()=>({})),served=new Set();
 for(const s of soldiers)queue.request(s,2);
 for(let frame=0;frame<12;frame++){
  queue.beginFrame();let count=0;
  for(let tick=0;tick<5;tick++)queue.run(s=>{count++;served.add(s);});
  assert.ok(count<=128);queue.endFrame();
 }
 assert.equal(served.size,1500);assert.equal(queue.pending.size,0);
});

test('urgent reactions outrank a backlog while FIFO work survives sustained urgent load',()=>{
 const queue=new InfantryDecisions(),background=Array.from({length:1500},()=>({})),served=new Set();
 for(const s of background)queue.request(s,2);
 const urgent={};queue.request(urgent,0);const first=[];
 queue.beginFrame();queue.run(s=>{first.push(s);served.add(s);});queue.endFrame();
 assert.equal(first[0],urgent);
 for(let frame=0;frame<48;frame++){
  // Repeated requests must preserve the age of existing FIFO entries.
  for(const s of background)if(!served.has(s))queue.request(s,2);
  for(let i=0;i<128;i++)queue.request({},0);
  queue.beginFrame();queue.run(s=>served.add(s));queue.endFrame();
 }
 assert.ok(background.every(s=>served.has(s)));
});

test('queued units can be promoted and casualties do not consume the decision budget',()=>{
 const queue=new InfantryDecisions(),ordinary={},specialist={},damaged={},dead={dead:true},wounded={wounded:true};
 for(const s of [ordinary,specialist,damaged,dead,wounded])queue.request(s,2);
 queue.request(specialist,1);queue.request(damaged,0);
 const order=[];queue.beginFrame();queue.run(s=>order.push(s));
 assert.deepEqual(order,[damaged,specialist,ordinary]);
 assert.equal(queue.budget.priority,93);assert.equal(queue.pending.size,0);
});
