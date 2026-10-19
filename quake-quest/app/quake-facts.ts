export const quakeMeaning=(magnitude:number)=>{
 if(magnitude>9.5)return {emoji:'🪐',label:'Impossible-Earth superquake',message:'This setting goes beyond earthquakes the Earth can physically produce. It is a scale experiment, not a real hazard scenario.'};
 if(magnitude>=9)return {emoji:'🌐',label:'Great megaquake',message:'One of the largest kinds of earthquakes Earth can produce, with catastrophic effects possible across a vast region.'};
 if(magnitude>=8)return {emoji:'🌊',label:'Great earthquake',message:'A devastating major event capable of causing severe regional destruction and, if offshore, a dangerous tsunami.'};
 if(magnitude>=7)return {emoji:'🏚️',label:'Major earthquake',message:'A major event capable of widespread serious damage, especially where buildings are vulnerable.'};
 if(magnitude<2)return {emoji:'🔬',label:'Tiny tremor',message:'Usually too small for people to feel—but sensitive seismometers can still catch it.'};
 if(magnitude<3)return {emoji:'🫧',label:'Micro earthquake',message:'Often not felt. Someone very close to the epicentre might notice a faint bump or rumble.'};
 if(magnitude<4)return {emoji:'🚚',label:'Small earthquake',message:'Often felt by people nearby, a little like a heavy lorry passing. Damage is rare.'};
 if(magnitude<5)return {emoji:'🪟',label:'Light earthquake',message:'Usually felt across a wider area. Windows and dishes may rattle; minor damage is possible close to the source.'};
 if(magnitude<6)return {emoji:'📚',label:'Moderate earthquake',message:'Objects may fall and poorly built structures can be damaged, especially near the source.'};
 return {emoji:'🏔️',label:'Strong earthquake',message:'Strong shaking can be damaging across a wide area. The effects still vary from place to place.'};
};
export const depthMeaning=(depth:number)=>depth<=5?'This was very shallow—its starting point was close to the surface.':depth<=15?'This was a shallow earthquake in the upper crust.':depth<=70?'This was a shallow-focus earthquake, less than 70 km down.':'This earthquake began deep below the surface.';
