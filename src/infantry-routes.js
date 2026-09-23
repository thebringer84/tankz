// Reuse a corridor only when both connecting segments are clear. Keep paths
// private to each soldier because steering consumes waypoints with shift().
export class InfantryRoutes {
 constructor(navigation){this.navigation=navigation;this.cache=new Map();this.version=-1;this.searches=0;this.hits=0;}
 route(from,to,allowSearch=true){
  const nav=this.navigation;nav.refresh();
  if(this.version!==nav.revision){this.cache.clear();this.version=nav.revision;}
  const key=Math.floor(to.x/8)+','+Math.floor(to.z/8),entries=this.cache.get(key)||[];
  for(const path of entries){
   if(!path.length||!nav.clearGrid(path.at(-1),to))continue;
   let join=-1;
   for(let i=0;i<Math.min(path.length,64);i++){
    const p=path[i];if(Math.hypot(from.x-p.x,from.z-p.z)>12)continue;
    if(nav.clearGrid(from,p))join=i;
   }
   if(join<0)continue;
   this.hits++;const result=path.slice(join).map(p=>p.clone());
   if(result.at(-1).distanceToSquared(to)>.01)result.push(to.clone());
   return result;
  }
  if(!allowSearch)return null;
  this.searches++;const path=nav.route(from,to);
  if(path.length){entries.push(path.map(p=>p.clone()));if(entries.length>4)entries.shift();this.cache.set(key,entries);}
  if(this.cache.size>64)this.cache.delete(this.cache.keys().next().value);
  return path;
 }
}
