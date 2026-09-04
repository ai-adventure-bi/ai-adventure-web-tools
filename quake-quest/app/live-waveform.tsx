'use client';

import { useMemo } from 'react';

const demoPoints=(seed:string)=>Array.from({length:180},(_,i)=>{const n=seed.split('').reduce((sum,c)=>sum+c.charCodeAt(0),0);const pulse=Math.exp(-Math.pow((i-105)/23,2));return Math.sin(i*.31+n)*.07+Math.sin(i*1.71+n*.2)*.025+pulse*Math.sin(i*1.08)*.62});
const line=(points:number[],width=300,height=72)=>points.map((value,index)=>`${(index/(points.length-1||1))*width},${height/2-value*(height*.42)}`).join(' ');

export default function LiveWaveform({network,station,eventTime}:{network:string;station:string;eventTime?:string;autoGain?:boolean}){
 const eventMode=Boolean(eventTime);const points=useMemo(()=>eventMode?Array(180).fill(0):demoPoints(`${network}.${station}`),[network,station,eventMode]);
 return <section className="live-waveform" aria-label={`${eventMode?'Event-time':'Demonstration'} waveform for ${station}`}><header><b><i/>STATIC DEMONSTRATION TRACE</b></header><svg viewBox="0 0 300 72" role="img" aria-label={eventMode?'No event-time waveform is cached':'Demonstration seismic trace'} preserveAspectRatio="none"><path d="M0 36H300"/><polyline points={line(points)}/></svg><footer><span>{eventMode?'No event-time recording is stored in this snapshot':'An illustrative trace—not a live measurement'}</span></footer><small className="event-wave-note">GitHub updates earthquake and station information three times daily; it cannot request a waveform on demand.</small></section>;
}
