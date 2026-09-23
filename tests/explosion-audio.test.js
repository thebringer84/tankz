import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEngine} from '../src/audio.js';
function setup(){
 const audio=new AudioEngine(),sources=[];
 const node=()=>({connect(){},disconnect(){},gain:{},frequency:{},playbackRate:{},start(){this.started=true;},stop(){this.stopped=true;}});
 audio.ctx={currentTime:0,createBufferSource(){const n=node();sources.push(n);return n;},createGain:node,createBiquadFilter:node};audio.sfxBus={};audio.explosionBuffers={explosionLarge:{},explosionDistant:{},fireball1:{},fireball2:{}};return {audio,sources};
}
test('explosions select large, alternating fireball, and distant recordings',()=>{
 const {audio,sources}=setup();audio.explosion(1,5);audio.explosion(1,5,'jeep');audio.explosion(1,5,'fuel');audio.explosion(1,80,'jeep');
 assert.deepEqual(sources.map(s=>s.buffer),['explosionLarge','fireball1','fireball2','explosionDistant'].map(k=>audio.explosionBuffers[k]));
 sources.forEach(s=>s.onended());assert.equal(audio.explosionVoices.size,0);
});
test('explosion voices stay bounded, favour louder blasts, and honour mute',()=>{
 const {audio,sources}=setup();for(let i=0;i<8;i++)audio.explosion(1,80);
 audio.explosion(1,200);assert.equal(sources.length,8);
 audio.explosion(2,0);assert.equal(audio.explosionVoices.size,8);assert.equal(sources.filter(s=>s.stopped).length,1);
 audio.sfxVolume=0;audio.explosion(2,0);assert.equal(sources.length,9);
});

test('grenades have separate near and distant explosions',()=>{
 const {audio,sources}=setup();audio.explosionBuffers.explosionGrenade={};audio.explosionBuffers.explosionGrenadeDistant={};
 audio.explosion(.65,5,'grenade');audio.explosion(.65,80,'grenade');assert.equal(sources[0].buffer,audio.explosionBuffers.explosionGrenade);assert.equal(sources[1].buffer,audio.explosionBuffers.explosionGrenadeDistant);
});
test('cries allow pairs but never exceed two starts in any six-second window',()=>{
 const {audio,sources}=setup();audio.infantryBuffers={agony1:{},agony2:{},agony3:{},agony4:{},pain1:{},pain2:{},grenadePin:{}};
 audio.scream(10);audio.ctx.currentTime=.3;audio.scream(10,0,'pain');audio.scream(10);assert.equal(sources.length,2);assert.equal(audio.screamVoices,2);
 sources[0].onended();sources[1].onended();audio.ctx.currentTime=5.9;audio.scream(10);assert.equal(sources.length,2);
 audio.ctx.currentTime=6;audio.scream(10);audio.scream(10);assert.equal(sources.length,3,'second slot is still cooling down');
 audio.ctx.currentTime=6.31;audio.scream(10);assert.equal(sources.length,4);audio.ctx.currentTime=20;audio.scream(10);assert.equal(sources.length,4,'concurrent cap still applies');
 sources[2].onended();sources[3].onended();audio.scream(36);assert.equal(sources.length,4);
 audio.sfxVolume=0;audio.scream(0);assert.equal(sources.length,4);
});

test('body impacts select the right recording and suppress crowds and distant impacts',()=>{
 const {audio,sources}=setup();audio.infantryBuffers={bodyImpact:{},bodyCrush:{}};
 audio.bodyImpact(26,true);assert.equal(sources.length,0);audio.bodyImpact(3,true);audio.bodyImpact(3);assert.equal(sources.length,1);assert.equal(sources[0].buffer,audio.infantryBuffers.bodyCrush);
 audio.ctx.currentTime=.31;audio.bodyImpact(3);assert.equal(sources.length,2);assert.equal(sources[1].buffer,audio.infantryBuffers.bodyImpact);
 audio.ctx.currentTime=1;audio.bodyImpact(3);assert.equal(sources.length,2);sources.forEach(s=>s.onended());assert.equal(audio.bodyVoices,0);
 audio.sfxVolume=0;audio.bodyImpact(3);assert.equal(sources.length,2);
});
