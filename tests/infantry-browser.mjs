import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.tankz?.game?.running);await page.locator('[data-action="settings"]').click();await page.getByRole('checkbox',{name:'Show FPS counter'}).check();await page.waitForTimeout(600);assert.match(await page.locator('#fps-counter').textContent(),/\d+ FPS/);await page.reload();await page.waitForFunction(()=>window.tankz?.game?.running);assert.ok(await page.locator('#fps-counter').isVisible());await page.locator('[data-action="settings"]').click();await page.getByRole('checkbox',{name:'Show FPS counter'}).uncheck();assert.equal(await page.locator('#fps-counter').isVisible(),false);await page.locator('[data-action="menu"]').click();await page.locator('[data-action="deploy"]').click();await page.locator('[data-action="launch-mission"]').click();
 assert.deepEqual(await page.evaluate(()=>tankz.game.infantry.squads.map(s=>s.members.length)),[1,1,4,6,8]);
 const start=await page.evaluate(()=>tankz.game.soldiers.map(s=>({...s.body.translation()})));await page.waitForTimeout(2400);
 const moved=await page.evaluate(start=>tankz.game.soldiers.filter((s,i)=>!s.dead&&Math.hypot(s.body.translation().x-start[i].x,s.body.translation().z-start[i].z)>1).length,start);assert.ok(moved>=10,`${moved} soldiers moved`);assert.ok(await page.evaluate(()=>tankz.game.soldiers.some(s=>s.locomotion==='walk'||s.locomotion==='run')));
 await page.evaluate(()=>{const g=tankz.game,s=g.soldiers.find(s=>!s.dead);s.visibleToPlayer=true;g.fire(s,true);});assert.ok(await page.evaluate(()=>tankz.game.fx.particles.some(p=>p.kind==='fire')),'infantry muzzle flash emitted');
 await page.evaluate(()=>{const g=tankz.game,p=g.player.body.translation();g.infantry.spawn(p.x+6,p.z+3);});await page.waitForTimeout(400);
 const markerCheck=await page.evaluate(()=>{const {game:g,ui}=tankz,s=g.soldiers.at(-1);s.visibleToPlayer=true;ui.drawMarkers(1/60);const marker=ui.enemyMarkers.get(s),node=marker.node,before=node.style.transform;const original=s.root.position.clone();s.root.position.x+=.25;ui.drawMarkers(1/60);const after=node.style.transform;ui.drawMarkers(1/60);const next=node.style.transform;s.root.position.copy(original);return {same:node===ui.enemyMarkers.get(s).node,animated:before!==after&&after!==next,healthBars:node.querySelectorAll('i').length};});assert.deepEqual(markerCheck,{same:true,animated:true,healthBars:0});
 await page.screenshot({path:'test-artifacts/infantry-patrols.png'});
 await page.evaluate(()=>{const g=tankz.game;g.mode='paused';const s=g.soldiers.find(s=>!s.dead);g.blast(s.root.position.clone(),1.5);});
 assert.ok(await page.evaluate(()=>tankz.game.ragdolls.items.some(r=>r.parts.length===11)));
 await page.evaluate(()=>{const g=tankz.game,s=g.soldiers.find(s=>!s.dead);s.body.setTranslation(g.player.body.translation(),true);g.player.speed=5;g.player.grounded=6;g.infantry.sync();});
 assert.ok(await page.evaluate(()=>tankz.game.infantryKills>=2));
 assert.ok(await page.evaluate(()=>tankz.game.ragdolls.items.some(r=>r.runOver&&r.age===0)),'run-over first creates a ragdoll');
 await page.evaluate(()=>{const g=tankz.game;for(let i=0;i<12;i++){g.world.step();g.ragdolls.update(1/60,g.player);}});
 assert.ok(await page.evaluate(()=>tankz.game.ragdolls.items.some(r=>r.runOver)),'body persists during initial tumble');
 await page.evaluate(()=>{const g=tankz.game;for(let i=0;i<60;i++){g.world.step();g.ragdolls.update(1/60,g.player);}});
 assert.equal(await page.evaluate(()=>tankz.game.ragdolls.items.filter(r=>r.runOver).length),0,'crushed body dismembers after tumbling');assert.ok(await page.evaluate(()=>tankz.game.ragdolls.items.some(r=>r.limb)),'detached physical limbs remain');

 await page.screenshot({path:'test-artifacts/infantry-ragdolls.png'});assert.deepEqual(errors,[]);console.log('Infantry browser passed: squad sizes, roaming movement, explosion ragdolls, run-over deaths, and rendering.');
}finally{await browser.close();}
