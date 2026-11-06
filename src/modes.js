// Small, deterministic mission-mode engine. Uses simulation time instead of
// wall-clock timers so pause and throttled tabs do not burn mode duration.
export const MODE_KINDS=Object.freeze(["bumperHits","targetHits","rampRuns"]);
const allowed=new Set(MODE_KINDS);
export const BASE_EVENT_POINTS=Object.freeze({
  bumperHits:100,targetHits:500,rampRuns:1200
});
export function makeModeState(config){
  if(!config||!allowed.has(config.triggerKind)||!allowed.has(config.bonusKind))return null;
  return {config,progress:0,activeUntil:null,activations:0};
}
export function modeActive(state,now){
  return Boolean(state&&state.activeUntil!==null&&now<state.activeUntil);
}
export function modeRemaining(state,now){
  return modeActive(state,now)?Math.max(0,state.activeUntil-now):0;
}
export function onModeEvent(state,kind,now){
  if(!state||!allowed.has(kind))return {activated:false,bonus:0};
  const active=modeActive(state,now);
  const bonus=active&&kind===state.config.bonusKind?
    BASE_EVENT_POINTS[kind]*(state.config.multiplier-1):0;
  if(active)return {activated:false,bonus};
  if(state.activeUntil!==null&&now>=state.activeUntil){
    state.activeUntil=null;
    state.progress=0;
  }
  if(kind!==state.config.triggerKind)return {activated:false,bonus};
  state.progress++;
  if(state.progress<state.config.threshold)return {activated:false,bonus};
  state.progress=0;
  state.activeUntil=now+state.config.duration;
  state.activations++;
  return {activated:true,bonus};
}
export function expireMode(state,now){
  if(!state||state.activeUntil===null||now<state.activeUntil)return false;
  state.activeUntil=null;
  state.progress=0;
  return true;
}
export function endActiveMode(state){
  if(!state)return false;
  const had=state.activeUntil!==null;
  state.activeUntil=null;state.progress=0;
  return had;
}
