import test from 'node:test';
import assert from 'node:assert/strict';
import {SPLAT_TYPES,SPLAT_FILES,SplatVariants} from '../src/splat-atlas.js';
import {seededRandom} from '../src/config.js';

test('each splat type exhausts four variants, never repeating at bag boundaries',()=>{
 const variants=new SplatVariants(seededRandom(41));
 assert.equal(SPLAT_FILES.length,16);
 for(const [row,type] of SPLAT_TYPES.entries()){
  let previous=-1;
  for(let bag=0;bag<20;bag++){
   const seen=new Set();
   for(let i=0;i<4;i++){
    const index=variants.next(type);
    assert.equal(Math.floor(index/4),row);
    assert.notEqual(index,previous);
    seen.add(index);previous=index;
   }
   assert.equal(seen.size,4);
  }
 }
 assert.throws(()=>variants.next('unknown'),RangeError);
});
