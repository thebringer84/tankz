const severity={stealth:0,spotted:1,engaged:2};
export class PlayerAwareness {
 constructor(){this.state='stealth';this.searching=false;this.lastAttack=-Infinity;this.pending=null;this.quiet=0;this.alertLevel=0;this.alertQuiet=0;}
 attack(time){this.lastAttack=time;}
 update(game,dt){
  let sight=false,search=false,combat=game.time-this.lastAttack<2,pressure=0;
  for(const units of [game.tanks,game.soldiers||[]])for(const t of units){
   if(!t.enemy||t.dead||t.wounded||!t.ai)continue;
   sight ||= !!t.ai.sees;search ||= t.ai.state==='investigate';
   combat ||= !!t.ai.sees&&t.ai.state==='pursue';
   pressure+=t.ai.sees?(t.ai.state==='pursue'?2:.5+Math.min(1,(t.ai.noticed||0)/.75)):t.ai.state==='investigate'?.5:0;
  }
  search ||= !!game.director?.messages.some(m=>!m.recipient.dead&&!m.recipient.wounded);
  // Pending radio orders represent actual reinforcements; cumulative historical
  // transmissions do not permanently inflate the current alert level.
  const responders=new Set();for(const message of game.director?.messages||[])if(!message.recipient.dead&&!message.recipient.wounded&&message.recipient.ai?.state==='patrol')responders.add(message.recipient);
  pressure+=responders.size*.5;
  if(combat)pressure=Math.max(2,pressure);
  const level=[.5,2,6,14,28].filter(threshold=>pressure>=threshold).length;
  if(level>=this.alertLevel){this.alertLevel=level;this.alertQuiet=0;}else{this.alertQuiet+=dt;if(this.alertQuiet>=2){this.alertLevel--;this.alertQuiet=1;}}
  const desired=combat?'engaged':sight||search?'spotted':'stealth';this.searching=search&&!sight;
  if(severity[desired]>=severity[this.state]){this.state=desired;this.pending=null;this.quiet=0;}
  else{if(this.pending!==desired){this.pending=desired;this.quiet=0;}this.quiet+=dt;if(this.quiet>=1.25){this.state=desired;this.pending=null;this.quiet=0;}}
  if(this.state==='stealth'&&level===0){this.alertLevel=0;this.alertQuiet=0;}
  return this.state;
 }
}
