import './style.css';
import './mission-briefing.css';
import {Game} from './game.js';
import {UI} from './ui.js';
import {profileGame} from './performance-profile.js';
import {LoadingScreen,preloadInterface,nextPaint} from './loading.js';
const loading=new LoadingScreen();loading.show();
try{
 await nextPaint();await preloadInterface(f=>loading.update('Loading field interface',f*.04));
 const game=new Game(document.querySelector('#world'));game.loadingScreen=loading;
 await game.init((label,progress)=>loading.update(label,progress));
 const ui=new UI(game,document.querySelector('#ui'));
 window.tankz={game,ui,profile:(durationMs)=>profileGame(game,durationMs)};const unlock=()=>{game.audio.start();window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);loading.hide();
}catch(error){loading.fail(error);}
