import {JEEP_COUNT,INFANTRY_COUNT,MATCH_DURATION,MAP_SIZE} from './config.js';

// Mission definitions own briefing content and identify the playable world.
// Dev Map uses the existing desert battlefield and its current balance settings.
export const MISSIONS=Object.freeze([Object.freeze({
 id:'dev-map',name:'Dev Map',region:'Dry refinery / Enemy territory',world:'desert',number:'01',
 tagline:'Break the patrol. Take back the territory.',
 description:'Enemy machine-gun jeeps control the refinery approaches. Cross the desert, hunt down their patrols, and clear the territory before time runs out.',
 objective:`Destroy all ${JEEP_COUNT} machine-gun jeeps.`,
 jeepCount:JEEP_COUNT,infantryCount:INFANTRY_COUNT,duration:MATCH_DURATION,mapSize:MAP_SIZE,
 threat:'Patrol jeeps are backed by infantry, RPG teams, flamethrowers, and grenadiers. Use the ridgelines to break sight and keep moving when the enemy closes in.',
 advice:'AP for the jeeps. HE for clustered enemies. Bring a recon drone into the fight to find the next patrol.',
 art:'assets/missions/dev-map/'
})]);
export function getMission(id='dev-map'){
 const mission=MISSIONS.find(m=>m.id===id);if(!mission)throw new RangeError(`Unknown mission: ${id}`);return mission;
}
