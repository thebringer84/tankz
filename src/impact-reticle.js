const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Presentation-only, critically damped motion. About 200 ms to settle 90% of
// a jump, without restarting a CSS transition every rendered frame.
export class ImpactReticle {
 update(point,dt,width,height,source,locked=false){
  // Keep the hunting marker in the central view, clear of both screen edges
  // and the HUD. Clamp the destination before smoothing so distant ballistic
  // predictions never build up motion toward an off-screen position.
  if(locked&&point.visible&&Number.isFinite(point.x)&&Number.isFinite(point.y)){
   this.position={x:point.x,y:point.y,visible:true};this.vx=this.vy=0;this.source=source;this.width=width;this.height=height;return this.position;
  }
  const left=width*.2,right=width*.8;
  const top=Math.min(Math.max(100,height*.25),height/2);
  const bottom=Math.max(top,Math.min(height-175,height*.72));
  const finite=Number.isFinite(point.x)&&Number.isFinite(point.y);
  const x=finite?clamp(point.x,left,right):width/2;
  const y=finite?clamp(point.y,top,bottom):(top+bottom)/2;
  if(!this.position||this.source!==source||this.width!==width||this.height!==height){
   this.position={x,y,visible:true};this.vx=this.vy=0;this.source=source;this.width=width;this.height=height;
  }else if(finite){
   const time=Math.max(0,dt),omega=20,decay=Math.exp(-omega*time);
   for(const [axis,velocity,target] of [['x','vx',x],['y','vy',y]]){
    const offset=this.position[axis]-target,term=this[velocity]+omega*offset;
    this.position[axis]=target+(offset+term*time)*decay;
    this[velocity]=(this[velocity]-omega*term*time)*decay;
   }
   // Keep the marker central even if its existing velocity carries past a
   // newly reversed target. It remains visible while the solution changes.
   const px=clamp(this.position.x,left,right),py=clamp(this.position.y,top,bottom);
   if(px!==this.position.x)this.vx=0;if(py!==this.position.y)this.vy=0;
   this.position.x=px;this.position.y=py;
  }
  return this.position;
 }
}
