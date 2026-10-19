import {useEffect} from 'react';
import {rankIndex,ranks} from './session-rank';
export type Reward={points:number;before:number;after:number;caseId:string};
export default function RewardCelebration({reward,onDismiss}:{reward:Reward;onDismiss:()=>void}){
 const oldRank=rankIndex(reward.before),newRank=rankIndex(reward.after),promoted=newRank>oldRank;
 useEffect(()=>{const timer=setTimeout(onDismiss,promoted?10000:6500);return()=>clearTimeout(timer)},[reward,onDismiss,promoted]);
 return <div className="reward-layer"><section className={`reward-celebration ${promoted?'rank-promoted':''}`} aria-label="Case reward"><button className="reward-close" aria-label="Dismiss reward" onClick={onDismiss}>×</button><div role="status" aria-live="polite" aria-atomic="true"><span className="reward-kicker">CASE REWARD SECURED</span><strong className="reward-points">+{reward.points.toLocaleString()}<small>POINTS</small></strong>{promoted&&<div className="rank-promotion"><span className="promotion-emblem" aria-hidden="true">⌖</span><div><b>RANK UP · {newRank+1} / 10</b><strong>{ranks[newRank][1]}</strong><small>{oldRank<0?'Recruit':ranks[oldRank][1]} → {ranks[newRank][1]}</small></div></div>}<p>Session total: {reward.after.toLocaleString()} points</p></div></section></div>;
}
