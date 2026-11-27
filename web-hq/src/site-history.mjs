const keys=['source','css','kind','title','description'];
const copy=value=>Object.fromEntries(keys.map(key=>[key,value[key]??'']));
const equal=(a,b)=>a&&b&&keys.every(key=>a[key]===b[key]);
export function createSiteHistory(limit=80){
 let current=null,past=[],future=[],lastGroup=null,lastTime=0;
 const flags=()=>({canUndo:past.length>0,canRedo:future.length>0});
 return {
  reset(value){current=copy(value);past=[];future=[];lastGroup=null;lastTime=0;return flags();},
  record(value,{group=null,time=Date.now()}={}){const next=copy(value);if(equal(next,current))return flags();if(current&&!(group&&group===lastGroup&&time-lastTime<700&&future.length===0))past=[...past.slice(-(limit-1)),current];current=next;future=[];lastGroup=group;lastTime=time;return flags();},
  undo(){if(!past.length)return null;future.push(current);current=past.pop();lastGroup=null;return copy(current);},
  redo(){if(!future.length)return null;past=[...past.slice(-(limit-1)),current];current=future.pop();lastGroup=null;return copy(current);},
  flags
 };
}
