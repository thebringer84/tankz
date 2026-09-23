import * as THREE from 'three';
// Dense iteration plus an intrusive emission-order list: expiry and oldest
// eviction are O(1). The free list reuses particle vectors/colors as well.
export class ParticlePool {
 constructor(active,max){this.active=active;this.max=max;this.free=[];this.first=null;this.last=null;}
 remove(index){const a=this.active,p=a[index];if(!p)return;if(p.older)p.older.newer=p.newer;else this.first=p.newer;if(p.newer)p.newer.older=p.older;else this.last=p.older;const tail=a.pop();if(index<a.length){a[index]=tail;tail.index=index;}p.older=p.newer=null;this.free.push(p);}
 acquire(){if(this.active.length>=this.max)this.remove(this.first.index);const p=this.free.pop()||{p:new THREE.Vector3(),v:new THREE.Vector3(),color:new THREE.Color()};
  for(const key of ['stain','trail','vehicleDust','wake','landing','flameJet','plume','damageSmoke','screen','blast','blastDust','blastFire'])p[key]=false;
  p.density=undefined;p.spread=1;p.wind=0;p.jetDir=p.jetSide=null;p.phase=0;
  p.older=this.last;p.newer=null;if(this.last)this.last.newer=p;else this.first=p;this.last=p;p.index=this.active.length;this.active.push(p);return p;
 }
 clear(){while(this.active.length)this.remove(this.active.length-1);}
}
