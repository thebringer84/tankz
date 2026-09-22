import {TANKS,terrainHeight} from './config.js';
import {SHOWROOM_PLATFORM_HEIGHT} from './showroom.js';

export function prepareGarage(game){
 game.garageTanks=new Map([[game.player.type,game.player]]);
 for(const type of Object.keys(TANKS))if(!game.garageTanks.has(type))game.garageTanks.set(type,game.spawnTank(type,0,19,false));
 for(const tank of game.garageTanks.values()){
  tank.body.setTranslation({x:0,y:terrainHeight(0,19)+1.04*tank.cfg.scale,z:19},true);
  tank.body.setRotation({x:0,y:1,z:0,w:0},true);tank.body.setEnabled(false);tank.yaw=tank.turretYaw=Math.PI;game.syncTank(tank);
 }
 selectGarageTank(game,game.selected);
}
export function selectGarageTank(game,type){
 const tank=game.garageTanks?.get(type);if(!tank)return false;
 for(const t of game.garageTanks.values())t.root.visible=t===tank;
 game.selected=type;game.player=tank;game.autoTarget=null;
 if(game.showroom){game.showroom.position.y=tank.root.position.y-.99*tank.cfg.scale-SHOWROOM_PLATFORM_HEIGHT;tank.root.rotation.set(0,Math.PI+(game.showroom.userData.turntable?.rotation.y||0),0);}
 return true;
}
// Cached models remain GPU-resident when the rest of a match is discarded.
export function detachGarageCache(game){
 const geometries=new Set(),materials=new Set();
 for(const model of game.garageModels?.values()||[]){model.root.removeFromParent();model.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});}
 const collect=value=>{if(value?.isMaterial)materials.add(value);else if(value&&typeof value==='object'&&!value.isTexture)for(const v of Object.values(value))collect(v);};collect(game.materials);
 return {geometries,materials};
}
