export const TURBO={duration:3.5,recharge:9,delay:1.2,power:2.6,speed:1.7};
export function updateTurbo(t,cmd,dt){
 t.turboCharge??=1;t.turboDelay??=0;t.turboLocked??=false;
 const requested=!!cmd.boost&&cmd.throttle>0&&!t.dead;
 if(!cmd.boost)t.turboLocked=false;
 t.boosting=requested&&!t.turboLocked&&t.turboCharge>0;
 if(t.boosting){t.turboCharge=Math.max(0,t.turboCharge-dt/TURBO.duration);t.turboDelay=TURBO.delay;if(t.turboCharge===0)t.turboLocked=true;}
 else{t.turboDelay=Math.max(0,t.turboDelay-dt);if(t.turboDelay===0)t.turboCharge=Math.min(1,t.turboCharge+dt/TURBO.recharge);}
 return t.boosting;
}
