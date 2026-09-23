import test from 'node:test';
import assert from 'node:assert/strict';
import {getMission,MISSIONS} from '../src/missions.js';
import {JEEP_COUNT,INFANTRY_COUNT,MATCH_DURATION} from '../src/config.js';
import {Game} from '../src/game.js';
test('Dev Map briefing matches the actual battlefield and unknown missions cannot deploy',()=>{
 const m=getMission();assert.equal(m.name,'Dev Map');assert.equal(m.jeepCount,JEEP_COUNT);assert.equal(m.infantryCount,INFANTRY_COUNT);assert.equal(m.duration,MATCH_DURATION);assert.equal(new Set(MISSIONS.map(m=>m.id)).size,MISSIONS.length);
 assert.throws(()=>Game.prototype.deploy.call({},'not-a-mission'),RangeError);
});
