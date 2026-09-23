import * as THREE from 'three';
import {Game} from '../src/game.js';
import {seededRandom} from '../src/config.js';

// Real world/physics without a WebGL context; used for population and jump tests.
export function worldFixture(populate=true){
 const game=Object.create(Game.prototype);
 const textures=Object.fromEntries(['sceneryWood','sand','normal','height','armor','concrete','rock','smoke','fire','sparks','crater','fireAtlas','cannonMuzzle'].map(key=>[key,new THREE.Texture()]));
 Object.assign(game,{scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(43,1.4,.2,650),textures,selected:'medium',mode:'playing',time:0,rand:seededRandom(36),aim:new THREE.Vector3(),cursorAim:new THREE.Vector3(),prediction:new THREE.Vector3(),zoom:1,shake:0,shakeSetting:0,keys:new Set(),ammo:'ap',inventory:{he:0,canister:0},credits:0,audio:{start(){},boom(){},drive(){}},onEvent(){},renderer:{},hemi:new THREE.HemisphereLight(),skyFill:new THREE.DirectionalLight(),sun:new THREE.DirectionalLight(),showroomLights:new THREE.Group(),showroomKey:new THREE.DirectionalLight(),showroomFill:new THREE.DirectionalLight()});
 game.scene.background=new THREE.Color();game.scene.fog=new THREE.FogExp2();
 // Match Game.init's shared material setup without loading bitmap assets.
 return import('../src/models.js').then(({makeMaterials})=>{game.materials=makeMaterials(textures);if(populate)game.deploy();else game.buildWorld('low');return game;});
}
export function freeWorld(game){game.visibility.dispose();game.environment.ruts.dispose();game.events.free();game.world.free();}
