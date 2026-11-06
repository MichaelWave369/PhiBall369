// Deterministic quest ledger with backwards-compatible category totals,
// exact-part sequences, and optional time-limited challenge rules.
const kinds=new Set(["bumperHits","targetHits","rampRuns"]);
export const MAX_STAGES=6;

const stageState=()=>({index:0,count:0,deadline:null,failures:0});
export function newQuestLedger(quests){
  const list=quests.map(q=>({...q,
    stages:Array.isArray(q.stages)?q.stages.map(s=>({...s})):undefined,
    ...(q.challenge?{challenge:{...q.challenge}}:{})
  }));
  return {
    counts:{bumperHits:0,targetHits:0,rampRuns:0},
    completed:[],
    quests:list,
    stageProgress:new Map(list.filter(q=>q.stages?.length)
      .map(q=>[q.id,stageState()])),
    stageEvents:[]
  };
}
export function questStatus(ledger,quest,now=0){
  const completed=ledger.completed.includes(quest.id);
  if(quest.stages?.length){
    const state=ledger.stageProgress.get(quest.id)??stageState();
    const index=Math.min(state.index,quest.stages.length-1);
    const stage=quest.stages[index];
    const deadline=state.deadline;
    const seconds=quest.challenge?.seconds??0;
    return {
      completed,staged:true,
      count:completed?stage.goal:Math.min(stage.goal,state.count),
      goal:stage.goal,stageIndex:index,stageCount:quest.stages.length,
      kind:stage.kind,partId:stage.partId??null,
      timed:seconds>0,
      running:!completed&&deadline!==null,
      remaining:deadline===null?seconds:Math.max(0,deadline-now),
      failures:state.failures,
      wrongHit:quest.challenge?.wrongHit??"ignore",
      rewardPoints:quest.challenge?.points??2000,
      extraBall:quest.challenge?.extraBall===true
    };
  }
  return {
    completed,staged:false,
    count:Math.min(quest.goal,ledger.counts[quest.kind]??0),
    goal:quest.goal,kind:quest.kind,stageIndex:0,stageCount:0,partId:null
  };
}
export function tickQuestTimers(ledger,now=0){
  const events=[];
  for(const quest of ledger.quests){
    if(!quest.stages?.length||ledger.completed.includes(quest.id))continue;
    const state=ledger.stageProgress.get(quest.id);
    if(state?.deadline===null||!state||now<state.deadline)continue;
    state.index=0;state.count=0;state.deadline=null;state.failures++;
    events.push({type:"timeout",questId:quest.id,label:quest.label,failures:state.failures});
  }
  return events;
}
export function recordQuestEvent(ledger,kind,partId=null,now=0){
  if(!kinds.has(kind))return [];
  ledger.counts[kind]++;
  ledger.stageEvents=[];
  const unlocked=[];
  for(const quest of ledger.quests){
    if(ledger.completed.includes(quest.id))continue;
    if(!quest.stages?.length){
      if(ledger.counts[quest.kind]>=quest.goal){
        ledger.completed.push(quest.id);unlocked.push(quest);
      }
      continue;
    }
    const state=ledger.stageProgress.get(quest.id);
    if(!state)continue;
    const stage=quest.stages[state.index];
    if(!stage||stage.kind!==kind)continue;
    if(stage.partId&&stage.partId!==partId){
      // Wrong-type collisions never reset this quest. Only a *competing*
      // part of the current expected kind can count as a wrong target.
      if(quest.challenge?.wrongHit==="reset"&&(state.index>0||state.count>0)){
        state.index=0;state.count=0;state.deadline=null;state.failures++;
        ledger.stageEvents.push({
          type:"wrongHit",questId:quest.id,label:quest.label,failures:state.failures
        });
      }
      continue;
    }
    if(quest.challenge?.seconds>0&&state.deadline===null)
      state.deadline=now+quest.challenge.seconds;
    state.count++;
    if(state.count<stage.goal)continue;
    state.count=0;state.index++;
    if(state.index===quest.stages.length){
      state.deadline=null;
      ledger.completed.push(quest.id);unlocked.push(quest);
    }else{
      ledger.stageEvents.push({
        type:"stage",questId:quest.id,label:quest.label,
        completedStage:state.index,nextStage:state.index+1,
        stageCount:quest.stages.length,next:quest.stages[state.index]
      });
    }
    // The same hit can never complete more than one stage of one quest.
  }
  return unlocked;
}
