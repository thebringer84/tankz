import * as THREE from 'three';
import {createBurningFlame} from './fire.js';
export class WreckFires {
 constructor(game){this.game=game;this.items=[];this.lights=game.fx.lights.slice(-3).map(slot=>{slot.reserved=true;return slot.light;});}
 start(target,burning=this.game.rand()<.6){
  if(this.items.some(item=>item.target===target))return;
  if(this.items.length>=3)this.remove(this.items[0]);
  const group=new THREE.Group();group.name='wreck-fire';this.game.root.add(group);
  const flames=[];if(burning)for(let i=0;i<3;i++){const flame=createBurningFlame(this.game.textures.fireAtlas,i*.81);flame.geometry.scale(.8,.8,1);flame.position.set((i-1)*.3,.35,(i%2)*.5-.25);group.add(flame);flames.push(flame);}
  const light=this.lights.find(light=>!this.items.some(item=>item.light===light));
  const burn=burning?12+this.game.rand()*10:0;
  this.items.push({target,group,flames,light,burn,duration:burn+(burning?9:5),age:0,emission:0});
 }
 remove(item){item.light.intensity=0;item.group.removeFromParent();for(const flame of item.flames){flame.geometry.dispose();flame.material.dispose();}this.items.splice(this.items.indexOf(item),1);}
 update(dt){for(const item of [...this.items]){
  item.age+=dt;if(item.age>=item.duration){this.remove(item);continue;}
  item.group.position.copy(item.target.body.translation());item.group.visible=item.target.visibleToPlayer!==false;
  const fire=Math.max(0,Math.min(1,(item.burn-item.age)/4)),tail=Math.max(0,(item.duration-item.age)/(item.duration-item.burn));
  for(const flame of item.flames){flame.visible=fire>0;flame.material.uniforms.time.value=item.age;flame.material.uniforms.intensity.value=fire;}
  item.light.position.copy(item.group.position).y+=1.1;item.light.intensity=(item.group.visible?fire:0)*(48+Math.sin(item.age*13)*9+Math.sin(item.age*21)*5);
  item.emission+=dt;const interval=fire>0?.14:.22/Math.max(.2,tail);
  while(item.emission>=interval){item.emission-=interval;if(!item.group.visible)continue;
   const p=item.group.position.clone().add(new THREE.Vector3((this.game.fx.rand()-.5)*.6,.9,(this.game.fx.rand()-.5)*.6));
   this.game.fx.emit(p,new THREE.Vector3(.5,fire>0?2.4:.9,.15),fire>0?0x393633:0x72716b,fire>0?1.25:.9,fire>0?11:6,'smoke');this.game.fx.particles.at(-1).plume=true;
  }
 }}
}
