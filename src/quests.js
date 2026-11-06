// Pinball quest ledger. Classic category quests stay backwards-compatible.
// Advanced quests are ordered stages, optionally tied to exact physical IDs.
const kinds=new Set(["bumperHits","targetHits","rampRuns"]);
export const MAX_STAGES=6;

export function newQuestLedger(quests){
  const list=quests.map(q=>({
    ...q,stages:Array.isArray(q.stages)?q.stages.map(s=>({...s})):undefined
  }));
  return {
    counts:{bumperHits:0,targetHits:0,rampRuns:0},
    completed:[],
    quests:list,
    stageProgress:new Map(list.filter(q=>q.stages?.length).map(q=>[
      q.id,{index:0,count:0}
    ])),
    stageEvents:[]
  };
}
export function questStatus(ledger,quest){
  const complete=ledger.completed.includes(quest.id);
  if(quest.stages?.length){
    const state=ledger.stageProgress.get(quest.id)??{index:0,count:0};
    const index=Math.min(state.index,quest.stages.length-1);
    const stage=quest.stages[index];
    return {
      completed:complete,staged:true,
      count:complete?stage.goal:Math.min(stage.goal,state.count),
      goal:stage.goal,stageIndex:index,
      stageCount:quest.stages.length,kind:stage.kind,
      partId:stage.partId??null
    };
  }
  return {
    completed:complete,staged:false,
    count:Math.min(quest.goal,ledger.counts[quest.kind]??0),
    goal:quest.goal,kind:quest.kind,
    stageIndex:0,stageCount:0,partId:null
  };
}
export function recordQuestEvent(ledger,kind,partId=null){
  if(!kinds.has(kind))return [];
  ledger.counts[kind]++;
  ledger.stageEvents=[];
  const unlocked=[];
  for(const quest of ledger.quests){
    if(ledger.completed.includes(quest.id))continue;
    if(!quest.stages?.length){
      // Historical behavior: category totals also count before this quest
      // would be explicitly selected, and each quest finishes only once.
      if(ledger.counts[quest.kind]>=quest.goal){
        ledger.completed.push(quest.id);
        unlocked.push(quest);
      }
      continue;
    }
    const state=ledger.stageProgress.get(quest.id);
    if(!state)continue;
    const stage=quest.stages[state.index];
    if(!stage||stage.kind!==kind)continue;
    if(stage.partId && stage.partId!==partId)continue;
    state.count++;
    if(state.count<stage.goal)continue;
    state.count=0;
    state.index++;
    if(state.index===quest.stages.length){
      ledger.completed.push(quest.id);
      unlocked.push(quest);
    }else{
      ledger.stageEvents.push({
        questId:quest.id,label:quest.label,
        completedStage:state.index,nextStage:state.index+1,
        stageCount:quest.stages.length,
        next:quest.stages[state.index]
      });
    }
    // A single collision can never satisfy more than one stage of a
    // particular quest, even if consecutive stages use the same kind.
  }
  return unlocked;
}
