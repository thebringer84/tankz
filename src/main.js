import './style.css';
import {Game} from './game.js';
import {UI} from './ui.js';
const loading=document.querySelector('#loading');
try{
 const game=new Game(document.querySelector('#world'));
 await game.init();
 const ui=new UI(game,document.querySelector('#ui'));
 // Local diagnostics for profiling and integration tests, not part of player state.
 window.tankz={game,ui};
 loading.classList.add('hidden');setTimeout(()=>loading.remove(),700);
}catch(error){console.error(error);loading.querySelector('span').textContent='Unable to prepare the battlefield. Reload to retry.';const detail=document.createElement('p');detail.textContent=error.message;detail.style.cssText='max-width:600px;padding:20px;color:#eabf9b;font:13px monospace';loading.append(detail);loading.querySelector('i').remove();}
