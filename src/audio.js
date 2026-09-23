export const AUDIO_ASSETS={music:'audio/music/machinery-waiting.mp3',victory:'audio/stingers/victory.mp3',defeat:'audio/stingers/defeat.mp3',explosionLarge:'audio/sfx/explosion-large.mp3',explosionDistant:'audio/sfx/explosion-distant.mp3',fireball1:'audio/sfx/explosion-fireball-01.mp3',fireball2:'audio/sfx/explosion-fireball-02.mp3'};
for(const size of ['light','medium','heavy'])for(const band of ['idle','cruise','fast'])AUDIO_ASSETS[`engine-${size}-${band}`]=`audio/sfx/engine-${size}-${band}.mp3`;
for(const size of ['medium','heavy'])for(const band of ['slow','fast'])AUDIO_ASSETS[`tracks-${size}-${band}`]=`audio/sfx/tracks-${size}-${band}.mp3`;
Object.assign(AUDIO_ASSETS,{cannon:'audio/sfx/cannon-fire.mp3',gear1:'audio/sfx/gear-shift-01.mp3',gear2:'audio/sfx/gear-shift-02.mp3'});

for(let i=1;i<=4;i++)AUDIO_ASSETS['agony'+i]=`audio/sfx/infantry-agony-0${i}.mp3`;
Object.assign(AUDIO_ASSETS,{pain1:'audio/sfx/infantry-pain-01.mp3',pain2:'audio/sfx/infantry-pain-02.mp3',explosionGrenade:'audio/sfx/grenade-explosion-close.mp3',explosionGrenadeDistant:'audio/sfx/grenade-explosion-distant.mp3',grenadePin:'audio/sfx/grenade-pin-pull.mp3',bodyImpact:'audio/sfx/body-impact.mp3',bodyCrush:'audio/sfx/body-crush.mp3'});

const volumeOr=(value,fallback)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
export function resolveAudioLevels(settings={}){
  const legacy=volumeOr(settings?.volume,.45);
  return {musicVolume:volumeOr(settings?.musicVolume,legacy),sfxVolume:volumeOr(settings?.sfxVolume,legacy)};
}
export class AudioEngine {
  constructor(){this.musicVolume=.45;this.sfxVolume=.45;this.ctx=null;this.musicWanted=true;this.musicLevel=.3;}
  prepare(){if(this.noise)return;this.noise=new Float32Array(38400);for(let i=0;i<this.noise.length;i++)this.noise[i]=(Math.random()*2-1)*Math.exp(-i/this.noise.length*5);}
  async loadAssets(baseURL,progress=()=>{}){
    const decoder=new OfflineAudioContext(2,1,48000);this.stingers={};this.explosionBuffers={};this.vehicleBuffers={};this.infantryBuffers={};let completed=0;
    for(const [name,path] of Object.entries(AUDIO_ASSETS)){
      const response=await fetch(baseURL+path);if(!response.ok)throw new Error('Unable to load audio: '+name);
      const buffer=await decoder.decodeAudioData(await response.arrayBuffer());
      if(name==='music')this.musicBuffer=buffer;else if(name==='victory'||name==='defeat')this.stingers[name]=buffer;else if(name.startsWith('explosion')||name.startsWith('fireball'))this.explosionBuffers[name]=buffer;else if(name.startsWith('agony')||name.startsWith('pain')||name==='grenadePin'||name.startsWith('body'))this.infantryBuffers[name]=buffer;else this.vehicleBuffers[name]=name.startsWith('engine-')||name.startsWith('tracks-')?blendLoop(decoder,buffer):buffer;
      progress(++completed/Object.keys(AUDIO_ASSETS).length);
    }
  }
  playResult(victory){
    this.setScene('results');this.drive(0,false);this.stopStinger();
    const buffer=this.stingers?.[victory?'victory':'defeat'];if(!this.ctx||!buffer)return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=false;gain.gain.value=.7;
    source.connect(gain);gain.connect(this.musicBus);this.stinger={source,gain};
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.stinger?.source===source)this.stinger=null;};source.start();
  }
  stopStinger(){
    const active=this.stinger;if(!active)return;this.stinger=null;
    active.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.025);active.source.stop(this.ctx.currentTime+.1);
  }
  setScene(mode){if(mode!=='results')this.stopStinger();const wanted=mode==='menu'||mode==='garage';if(wanted===this.musicWanted)return;this.musicWanted=wanted;this.fadeMusic();}
  fadeMusic(){if(!this.musicGain)return;const gain=this.musicGain.gain,time=this.ctx.currentTime;gain.cancelScheduledValues(time);gain.setTargetAtTime(this.musicWanted?this.musicLevel:0,time,.3);}
  start(){if(!this.ctx){this.prepare();this.ctx=new AudioContext();this.boomBuffer=this.ctx.createBuffer(1,this.noise.length,48000);this.boomBuffer.copyToChannel(this.noise,0);this.sfxBus=this.ctx.createGain();this.sfxBus.gain.value=this.sfxVolume;this.sfxBus.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.musicBus.gain.value=this.musicVolume;this.musicBus.connect(this.ctx.destination);this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;const filter=this.ctx.createBiquadFilter();filter.frequency.value=130;this.engine.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.sfxBus);this.engine.start();if(this.musicBuffer){this.musicGain=this.ctx.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.musicBus);this.musicSource=this.ctx.createBufferSource();this.musicSource.buffer=this.musicBuffer;this.musicSource.loop=true;this.musicSource.connect(this.musicGain);this.musicSource.start();this.fadeMusic();}}this.ctx.resume().catch(()=>{});}
  setVolumes(settings){
    Object.assign(this,resolveAudioLevels(settings));
    if(this.ctx){this.musicBus.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.015);this.sfxBus.gain.setTargetAtTime(this.sfxVolume,this.ctx.currentTime,.015);}
  }
  drive(speed,active,type='medium',maxSpeed=18){
    if(!this.ctx)return;
    const c=this.ctx,size=type==='scout'?'light':['light','medium','heavy'].includes(type)?type:'medium',ratio=Math.min(1,Math.abs(speed)/maxSpeed);
    if(this.vehicleBuffers?.['engine-'+size+'-idle']){
      this.engineGain.gain.setTargetAtTime(0,c.currentTime,.1);
      if(this.driveType!==size){
        for(const loop of this.driveLoops||[]){loop.gain.gain.setTargetAtTime(0,c.currentTime,.05);loop.source.stop(c.currentTime+.25);}
        this.driveType=size;this.driveGear=null;this.driveLoops=[];
        for(const key of ['engine-'+size+'-idle','engine-'+size+'-cruise','engine-'+size+'-fast','tracks-'+(size==='heavy'?'heavy':'medium')+'-slow','tracks-'+(size==='heavy'?'heavy':'medium')+'-fast']){
          const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.vehicleBuffers[key];source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.sfxBus);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();this.driveLoops.push({source,gain});
        }
      }
      const weights=[Math.max(0,1-ratio*3),Math.max(0,1-Math.abs(ratio-.5)*2),Math.max(0,(ratio-.5)*2),Math.min(1,Math.abs(speed)/2)*(1-ratio),ratio];
      this.driveLoops.forEach((loop,i)=>{loop.gain.gain.setTargetAtTime(active?weights[i]*(i<3?.16:.10):0,c.currentTime,.15);loop.source.playbackRate.setTargetAtTime(.92+ratio*.16,c.currentTime,.2);});
      const gear=ratio<.12?0:ratio<.4?1:ratio<.7?2:3;
      if(active&&this.driveGear!==null&&gear!==this.driveGear&&c.currentTime-(this.lastGearTime??-10)>1.2){this.playVehicleShot((this.gearIndex=(this.gearIndex||0)+1)%2?'gear1':'gear2',.12);this.lastGearTime=c.currentTime;}
      this.driveGear=active?gear:null;return;
    }
    this.engine.frequency.setTargetAtTime(28+Math.abs(speed)*2.3,c.currentTime,.1);this.engineGain.gain.setTargetAtTime(active?.018+Math.abs(speed)*.0015:0,c.currentTime,.15);
  }
  playVehicleShot(key,level,rate=1){
    if(!this.ctx||this.sfxVolume===0||!this.vehicleBuffers?.[key])return false;
    const voices=this.vehicleVoices??=new Set();if(voices.size>=6){const oldest=voices.values().next().value;oldest.stop();voices.delete(oldest);}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.vehicleBuffers[key];source.playbackRate.value=rate;gain.gain.value=level;source.connect(gain);gain.connect(this.sfxBus);voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start();return true;
  }
  cannon(distance=0,type='medium'){if(!this.playVehicleShot('cannon',.55/(1+distance*.045),type==='heavy'?.88:(type==='light'||type==='scout')?1.12:1))this.boom(.55,distance);}

  boom(strength=1,distance=0){if(!this.ctx)return;const c=this.ctx,t=c.currentTime,g=c.createGain(),f=c.createBiquadFilter(),b=this.boomBuffer;const n=c.createBufferSource();n.buffer=b;f.type='lowpass';f.frequency.setValueAtTime(1600,t);f.frequency.exponentialRampToValueAtTime(90,t+.6);g.gain.value=Math.min(.7,strength*.32)/(1+distance*.045);n.connect(f);f.connect(g);g.connect(this.sfxBus);n.start();n.stop(t+.8);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(100,t);o.frequency.exponentialRampToValueAtTime(24,t+.25);og.gain.setValueAtTime(g.gain.value*.8,t);og.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(og);og.connect(this.sfxBus);o.start();o.stop(t+.32);o.onended=()=>{o.disconnect();og.disconnect();};}
  explosion(strength=1,distance=0,variant='standard'){
    if(!this.ctx||this.sfxVolume===0)return;
    const fuel=variant==='jeep'||variant==='fuel',key=variant==='grenade'?(distance>=65?'explosionGrenadeDistant':'explosionGrenade'):distance>=65?'explosionDistant':fuel?((this.fireballIndex=(this.fireballIndex||0)+1)%2?'fireball1':'fireball2'):'explosionLarge';
    const buffer=this.explosionBuffers?.[key];if(!buffer){this.boom(strength,distance);return;}
    const level=Math.min(.75,.32+strength*.2)/(1+distance*.045),voices=this.explosionVoices??=new Set();
    if(voices.size>=8){const quietest=[...voices].reduce((a,b)=>a.level<b.level?a:b);if(quietest.level>level)return;quietest.source.stop();voices.delete(quietest);}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    source.buffer=buffer;source.playbackRate.value=Math.max(.88,Math.min(1.3,1.15-strength*.12));filter.type='lowpass';filter.frequency.value=distance>=65?6500:Math.max(2400,14000-distance*100);gain.gain.value=level;
    source.connect(filter);filter.connect(gain);gain.connect(this.sfxBus);const voice={source,level,key};voices.add(voice);
    source.onended=()=>{voices.delete(voice);source.disconnect();filter.disconnect();gain.disconnect();};source.start();
  }
  // Short recorded cries; bounded independently of weapon/explosion voices.
  scream(distance=0,variant=0,kind='agony'){
    if(!this.ctx||distance>35||this.sfxVolume===0||(this.screamVoices||0)>=2)return;
    const recent=(this.screamStarts||[]).filter(time=>this.ctx.currentTime-time<6);if(recent.length>=2)return;
    const count=kind==='pain'?2:4,index=this[`${kind}Index`]??Math.abs(variant)%count,key=kind+(index+1),buffer=this.infantryBuffers?.[key];
    if(!buffer)return;this.screamStarts=[...recent,this.ctx.currentTime];this[`${kind}Index`]=(index+1)%count;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.playbackRate.value=.96+(Math.abs(variant)%3)*.04;gain.gain.value=.32/(1+distance*.09);source.connect(gain);gain.connect(this.sfxBus);
    this.screamVoices=(this.screamVoices||0)+1;source.onended=()=>{source.disconnect();gain.disconnect();this.screamVoices--;};source.start();
  }
  bodyImpact(distance=0,crushed=false){
    if(!this.ctx||distance>25||this.sfxVolume===0||(this.bodyVoices||0)>=2||this.ctx.currentTime<(this.nextBodyImpact??0))return;
    const buffer=this.infantryBuffers?.[crushed?'bodyCrush':'bodyImpact'];if(!buffer)return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=(crushed?.28:.2)/(1+distance*.12);source.connect(gain);gain.connect(this.sfxBus);
    this.nextBodyImpact=this.ctx.currentTime+.3;this.bodyVoices=(this.bodyVoices||0)+1;source.onended=()=>{source.disconnect();gain.disconnect();this.bodyVoices--;};source.start();
  }
  grenadePin(distance=0){
    if(!this.ctx||distance>25||this.sfxVolume===0||!this.infantryBuffers?.grenadePin||(this.pinVoices||0)>=3)return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.infantryBuffers.grenadePin;gain.gain.value=.25/(1+distance*.18);source.connect(gain);gain.connect(this.sfxBus);this.pinVoices=(this.pinVoices||0)+1;source.onended=()=>{source.disconnect();gain.disconnect();this.pinVoices--;};source.start();
  }
  click(){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=520;g.gain.setValueAtTime(.08,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.06);o.connect(g);g.connect(this.sfxBus);o.start();o.stop(this.ctx.currentTime+.07);o.onended=()=>{o.disconnect();g.disconnect();};}
}

// Overlap the tail with the head to avoid hard waveform jumps at loop boundaries.
export function blendLoop(context,buffer){
 const overlap=Math.min(Math.floor(buffer.sampleRate*.15),Math.floor(buffer.length/4)),length=buffer.length-overlap;
 const out=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const input=buffer.getChannelData(channel),data=out.getChannelData(channel);
  for(let i=0;i<overlap;i++){const mix=i/overlap;data[i]=input[length+i]*(1-mix)+input[i]*mix;}
  data.set(input.subarray(overlap,length),overlap);
 }
 return out;
}
