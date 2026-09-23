import {MISSIONS,getMission} from './missions.js';
const asset=(m,name)=>`${import.meta.env.BASE_URL}${m.art}${name}.png`;
export function missionMarkup(game,id='dev-map'){
 const m=getMission(id);
 return `<main class="mission-screen" aria-label="Mission selection">
  <div class="mission-art" aria-hidden="true">${['sky','ridges','refinery','dust','tank','foreground'].map((name,i)=>`<img class="mission-layer mission-${name}" style="--travel:${[1,4,8,11,0,16][i]}vw" src="${asset(m,name)}" alt="" draggable="false">`).join('')}<div class="mission-art-shade"></div></div>
  <header class="mission-header"><button data-action="mission-back" class="text-button">← MAIN MENU</button><span>OPERATIONS / MISSION SELECT</span><span class="mission-availability">${String(MISSIONS.length).padStart(2,'0')} AVAILABLE</span></header>
  <nav class="mission-selector" aria-label="Available missions">${MISSIONS.map(mission=>`<button data-action="mission" data-value="${mission.id}" aria-pressed="${mission.id===id}"><small>${mission.number}</small><span>${mission.name}</span><i>↗</i></button>`).join('')}</nav>
  <section class="mission-overview" aria-labelledby="mission-title"><div class="mission-copy"><p class="mission-kicker">OPERATION ${m.number} <span> / ${m.region}</span></p><h1 id="mission-title">${m.name}</h1><p class="mission-tagline">${m.tagline}</p><p class="mission-description">${m.description}</p><p class="mission-objective">${m.objective}</p><div class="mission-facts"><div><b>${m.jeepCount}</b><span>JEEP TARGETS</span></div><div><b>${m.duration/60}<small> MIN</small></b><span>TIME LIMIT</span></div><div><b>${m.infantryCount}</b><span>SUPPORTING INFANTRY</span></div></div></div><span class="mission-scene-label">DRY REFINERY<br><b>HOSTILE PATROL ZONE</b></span></section>
  <footer class="mission-launchbar"><div><span>SELECTED MISSION</span><strong>${m.name}</strong></div><button class="primary" data-action="launch-mission" data-value="${m.id}">LAUNCH MISSION <b>↗</b></button></footer>
 </main>`;
}
// Decode the actual image nodes before mounting, so even a cold cache cannot
// reveal individual layers late. Keep these nodes when revealing the screen.
export async function prepareMissionBriefing(game,id,progress=()=>{}){
 const staging=document.createElement('div');staging.innerHTML=missionMarkup(game,id);
 const images=[...staging.querySelectorAll('img')];let loaded=0;
 await Promise.all(images.map(async image=>{await image.decode();progress(++loaded/images.length);}));
 return staging.firstElementChild;
}
export function mountMissionBriefing(root){
 root.querySelector('[data-action="mission-back"]').focus({preventScroll:true});
 return ()=>{};
}
