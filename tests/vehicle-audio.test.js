import test from 'node:test';
import assert from 'node:assert/strict';
import {AUDIO_ASSETS,blendLoop} from '../src/audio.js';
import {existsSync} from 'node:fs';
test('all registered audio assets exist after renaming',()=>{
 for(const path of Object.values(AUDIO_ASSETS))assert.ok(existsSync('public/'+path),path);
});
test('loop preparation blends endpoints without modifying the supplied recording',()=>{
 const input=Float32Array.from({length:100},(_,i)=>i/100),copy=input.slice();
 const context={createBuffer(channels,length,sampleRate){const data=new Float32Array(length);return {length,sampleRate,getChannelData:()=>data};}};
 const out=blendLoop(context,{sampleRate:100,length:100,numberOfChannels:1,getChannelData:()=>input});
 assert.equal(out.length,85);assert.deepEqual(input,copy);assert.equal(out.getChannelData(0)[0],input[85]);assert.equal(out.getChannelData(0)[84],input[84]);
 assert.ok(Math.abs(out.getChannelData(0)[0]-out.getChannelData(0)[84])<.011);
});
