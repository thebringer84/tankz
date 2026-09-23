export const AUDIO_ASSETS={music:'audio/music/machinery-waiting.mp3',victory:'audio/stingers/victory.mp3',defeat:'audio/stingers/defeat.mp3'};
const volumeOr=(value,fallback)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
export function resolveAudioLevels(settings={}){
  const legacy=volumeOr(settings?.volume,.45);
  return {musicVolume:volumeOr(settings?.musicVolume,legacy),sfxVolume:volumeOr(settings?.sfxVolume,legacy)};
}
export class AudioEngine {
  constructor(){this.musicVolume=.45;this.sfxVolume=.45;this.ctx=null;this.musicWanted=true;this.musicLevel=.3;}
  prepare(){if(this.noise)return;this.noise=new Float32Array(38400);for(let i=0;i<this.noise.length;i++)this.noise[i]=(Math.random()*2-1)*Math.exp(-i/this.noise.length*5);}
  async loadAssets(baseURL,progress=()=>{}){
    const decoder=new OfflineAudioContext(2,1,48000);this.stingers={};let completed=0;
    for(const [name,path] of Object.entries(AUDIO_ASSETS)){
      const response=await fetch(baseURL+path);if(!response.ok)throw new Error('Unable to load audio: '+name);
      const buffer=await decoder.decodeAudioData(await response.arrayBuffer());
      if(name==='music')this.musicBuffer=buffer;else this.stingers[name]=buffer;
      progress(++completed/3);
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
  drive(speed,active){if(!this.ctx)return;this.engine.frequency.setTargetAtTime(28+Math.abs(speed)*2.3,this.ctx.currentTime,.1);this.engineGain.gain.setTargetAtTime(active?.018+Math.abs(speed)*.0015:0,this.ctx.currentTime,.15);}
  boom(strength=1,distance=0){if(!this.ctx)return;const c=this.ctx,t=c.currentTime,g=c.createGain(),f=c.createBiquadFilter(),b=this.boomBuffer;const n=c.createBufferSource();n.buffer=b;f.type='lowpass';f.frequency.setValueAtTime(1600,t);f.frequency.exponentialRampToValueAtTime(90,t+.6);g.gain.value=Math.min(.7,strength*.32)/(1+distance*.045);n.connect(f);f.connect(g);g.connect(this.sfxBus);n.start();n.stop(t+.8);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(100,t);o.frequency.exponentialRampToValueAtTime(24,t+.25);og.gain.setValueAtTime(g.gain.value*.8,t);og.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(og);og.connect(this.sfxBus);o.start();o.stop(t+.32);o.onended=()=>{o.disconnect();og.disconnect();};}
  // Short synthesized vocal cries; cap simultaneous voices for large crowds.
  scream(distance=0,variant=0){
    if(!this.ctx||distance>65||this.sfxVolume===0||(this.screamVoices||0)>=4)return;
    const c=this.ctx,t=c.currentTime,duration=.75+variant*.12,voice=c.createOscillator(),gain=c.createGain(),vibrato=c.createOscillator(),depth=c.createGain();
    voice.type='sawtooth';voice.frequency.setValueAtTime(310+variant*65,t);voice.frequency.exponentialRampToValueAtTime(530+variant*50,t+.18);voice.frequency.exponentialRampToValueAtTime(180+variant*35,t+duration);
    vibrato.frequency.value=11+variant*2;depth.gain.value=24;vibrato.connect(depth);depth.connect(voice.frequency);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.075/(1+distance*.09),t+.07);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    const filters=[750,1250,2700].map(frequency=>{const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=frequency;f.Q.value=5;voice.connect(f);f.connect(gain);return f;});
    gain.connect(this.sfxBus);this.screamVoices=(this.screamVoices||0)+1;voice.start();vibrato.start();voice.stop(t+duration);vibrato.stop(t+duration);
    voice.onended=()=>{voice.disconnect();vibrato.disconnect();depth.disconnect();filters.forEach(f=>f.disconnect());gain.disconnect();this.screamVoices--;};
  }
  click(){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=520;g.gain.setValueAtTime(.08,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.06);o.connect(g);g.connect(this.sfxBus);o.start();o.stop(this.ctx.currentTime+.07);o.onended=()=>{o.disconnect();g.disconnect();};}
}
