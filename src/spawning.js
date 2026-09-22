import * as THREE from 'three';
import {terrainHeight} from './config.js';
export function offCameraSpawn(game,x,z,radius=5){
 if(!game.camera)return true;
 if(game.player&&Math.hypot(x-game.player.body.translation().x,z-game.player.body.translation().z)<35)return false;
 game.camera.updateMatrixWorld();const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(game.camera.projectionMatrix,game.camera.matrixWorldInverse));
 return !frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(x,terrainHeight(x,z)+1.5,z),radius+5));
}
