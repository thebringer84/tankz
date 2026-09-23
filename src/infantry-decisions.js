// Reserve part of each render frame for FIFO work so a continuous stream of
// close threats cannot starve the rest of the crowd. Catch-up ticks share this
// budget; movement, aiming and weapon timers do not go through this queue.
export class InfantryDecisions {
 constructor(){this.pending=new Map();this.budget=null;}
 beginFrame(){this.budget={priority:96,fair:32};}
 endFrame(){this.budget=null;}
 request(s,priority){this.pending.set(s,priority);}
 run(decide){
  const budget=this.budget||{priority:96,fair:32};
  const visit=(s,slot)=>{
   this.pending.delete(s);
   if(s.dead||s.wounded||s.burning)return;
   budget[slot]--;decide(s);
  };
  for(const [s] of this.pending)if(s.dead||s.wounded||s.burning)this.pending.delete(s);
  for(let priority=0;priority<3&&budget.priority>0;priority++){
   for(const [s,rank] of this.pending){
    if(budget.priority<=0)break;
    if(rank===priority)visit(s,'priority');
   }
  }
  for(const [s] of this.pending){if(budget.fair<=0)break;visit(s,'fair');}
 }
}
