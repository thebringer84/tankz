import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerAwareness} from '../src/awareness.js';
import {turretAligned} from '../src/target-lock.js';
test('awareness follows perception, combat and search without flickering back to stealth',()=>{
 const enemy={enemy:true,ai:{state:'patrol',sees:false}},g={time:0,tanks:[enemy],soldiers:[],director:{messages:[]}},a=new PlayerAwareness();
 assert.equal(a.update(g,.016),'stealth');enemy.ai.sees=true;enemy.ai.state='suspicious';assert.equal(a.update(g,.016),'spotted');
 enemy.ai.state='pursue';assert.equal(a.update(g,.016),'engaged');enemy.ai.sees=false;enemy.ai.state='investigate';
 assert.equal(a.update(g,.1),'engaged');assert.equal(a.update(g,1.3),'spotted');assert.equal(a.searching,true);
 enemy.ai.state='patrol';assert.equal(a.update(g,.1),'spotted');enemy.ai.sees=true;assert.equal(a.update(g,.1),'spotted');
 enemy.ai.sees=false;assert.equal(a.update(g,1.3),'stealth');
 a.attack(0);assert.equal(a.update(g,.01),'engaged');g.time=3;assert.equal(a.update(g,1.3),'stealth');
 enemy.dead=true;enemy.ai.sees=true;enemy.ai.state='pursue';assert.equal(a.update(g,1.3),'stealth');
 enemy.dead=false;enemy.wounded=true;assert.equal(a.update(g,.1),'stealth');
 enemy.wounded=false;enemy.ai.sees=false;enemy.ai.state='patrol';g.director.messages.push({recipient:enemy});assert.equal(a.update(g,.1),'spotted');
});
test('lock requires both axes aligned, a current target and a reachable firing solution',()=>{
 const target={visibleToPlayer:true},t={localYaw:0,elevation:0,aimAlignment:{target,yaw:1,elevation:.2,reachable:true}};
 assert.equal(turretAligned(t,target),false);t.localYaw=1;assert.equal(turretAligned(t,target),false);
 t.elevation=.2;assert.equal(turretAligned(t,target),true);assert.equal(turretAligned(t,{}),false);
 t.aimAlignment.reachable=false;assert.equal(turretAligned(t,target),false);t.aimAlignment.reachable=true;
 target.visibleToPlayer=false;assert.equal(turretAligned(t,target),false);target.visibleToPlayer=true;target.dead=true;assert.equal(turretAligned(t,target),false);
 target.dead=false;t.localYaw=Math.PI-.002;t.aimAlignment.yaw=-Math.PI+.002;assert.equal(turretAligned(t,target),true);
});
test('enemy alert escalates with live aggression and radio responders, then clears',()=>{
 const a=new PlayerAwareness(),g={time:0,tanks:[],soldiers:[],director:{messages:[]}};
 const unit=()=>({enemy:true,ai:{state:'pursue',sees:true}});
 g.tanks=[{enemy:true,ai:{state:'suspicious',sees:true,noticed:.1}}];a.update(g,.1);assert.equal(a.alertLevel,1);
 for(const [count,expected] of [[1,2],[3,3],[7,4],[14,5]]){g.tanks=Array.from({length:count},unit);a.update(g,.1);assert.equal(a.alertLevel,expected);}
 for(const t of g.tanks){t.ai.sees=false;t.ai.state='investigate';}a.update(g,.1);assert.equal(a.alertLevel,5);a.update(g,2);assert.equal(a.alertLevel,4);
 for(const t of g.tanks)t.dead=true;a.update(g,2);assert.equal(a.state,'stealth');assert.equal(a.alertLevel,0);
 const recipient={enemy:true,ai:{state:'patrol',sees:false}};g.director.messages=[{recipient},{recipient}];a.update(g,.1);assert.equal(a.alertLevel,1,'duplicate radio orders count one responder');
 g.director.messages=[];a.update(g,2);assert.equal(a.alertLevel,0);
});
