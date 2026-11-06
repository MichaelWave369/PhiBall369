import {normalizeTable} from "./validation.js";
import {MAX_STAGES} from "./quests.js";

export const MAX_QUESTS=8;
export const EVENT_OPTIONS=Object.freeze([
  {value:"bumperHits",label:"Pop bumper hits"},
  {value:"targetHits",label:"Target hits"},
  {value:"rampRuns",label:"Successful upper-deck ascents"}
]);
const editableQuestFields=new Set(["label","kind","goal"]);
const editableModeFields=new Set(["label","description","triggerKind","threshold",
  "bonusKind","multiplier","duration"]);
const numericQuestFields=new Set(["goal"]);
const numericModeFields=new Set(["threshold","multiplier","duration"]);

export function missionDraft(table) {
  return {
    title:table?.title??"CUSTOM TABLE",
    subtitle:table?.subtitle??"Build your own pinball adventure.",
    accent:table?.accent??"#72edff",
    quests:(Array.isArray(table?.quests)?table.quests:[]).map(q=>({
      ...q,...(q.stages?{stages:q.stages.map(stage=>({...stage}))}:{})
    })),
    mode:table?.mode?{...table.mode}:null
  };
}
export function nextQuestId(quests) {
  const taken=new Set((quests??[]).map(q=>q.id));
  for(let i=1;i<=1000;i++){
    const id="mission-"+i;
    if(!taken.has(id))return id;
  }
  throw new Error("Too many mission IDs.");
}
export function addQuest(quests) {
  if(!Array.isArray(quests)||quests.length>=MAX_QUESTS)return quests;
  return [...quests,{
    id:nextQuestId(quests),
    label:"New pinball objective",
    kind:"targetHits",
    goal:3
  }];
}
export function updateQuest(quests,id,field,value) {
  if(!editableQuestFields.has(field))return quests;
  return quests.map(q=>q.id!==id?q:{
    ...q,
    [field]:numericQuestFields.has(field)?Number(value):value
  });
}
export function toggleQuestSequence(quests,id,enabled){
  return quests.map(q=>{
    if(q.id!==id)return q;
    if(!enabled){
      const {stages,...simple}=q;
      return simple;
    }
    if(q.stages?.length)return q;
    return {...q,stages:[
      {kind:q.kind,goal:1,partId:null},
      {kind:q.kind,goal:1,partId:null}
    ]};
  });
}
export function addQuestStage(quests,id){
  return quests.map(q=>{
    if(q.id!==id||!q.stages?.length||q.stages.length>=MAX_STAGES)return q;
    return {...q,stages:[
      ...q.stages,{kind:"targetHits",goal:1,partId:null}
    ]};
  });
}
export function editQuestStage(quests,id,index,field,value){
  if(!["kind","goal","partId"].includes(field))return quests;
  return quests.map(q=>{
    if(q.id!==id||!q.stages?.[index])return q;
    return {...q,stages:q.stages.map((stage,i)=>i!==index?stage:{
      ...stage,[field]:field==="goal"?Number(value):field==="partId"?(value||null):value,
      ...(field==="kind"?{partId:null}:{})
    })};
  });
}
export function removeQuestStage(quests,id,index){
  return quests.map(q=>{
    if(q.id!==id||!q.stages?.[index]||q.stages.length<=1)return q;
    return {...q,stages:q.stages.filter((_,i)=>i!==index)};
  });
}
export function moveQuestStage(quests,id,index,direction){
  return quests.map(q=>{
    if(q.id!==id||!q.stages?.[index])return q;
    const next=index+(direction<0?-1:1);
    if(next<0||next>=q.stages.length)return q;
    const stages=q.stages.slice();
    [stages[index],stages[next]]=[stages[next],stages[index]];
    return {...q,stages};
  });
}
export function removeQuest(quests,id) {
  return quests.filter(q=>q.id!==id);
}
export function moveQuest(quests,id,direction) {
  const current=quests.findIndex(q=>q.id===id);
  const next=current+(direction<0?-1:1);
  if(current<0||next<0||next>=quests.length)return quests;
  const result=[...quests];
  [result[current],result[next]]=[result[next],result[current]];
  return result;
}
export function defaultMode(){
  return {
    id:"custom-mode",
    label:"JACKPOT MODE",
    description:"Hit three targets to activate double bumper scoring.",
    triggerKind:"targetHits",
    threshold:3,
    bonusKind:"bumperHits",
    multiplier:2,
    duration:15
  };
}
export function updateMode(mode,field,value) {
  if(!mode||!editableModeFields.has(field))return mode;
  return {...mode,[field]:numericModeFields.has(field)?Number(value):value};
}
export function applyMissionDraft(table,draft) {
  if(!table||typeof table!=="object")throw new Error("A playable table is required.");
  if(!draft||typeof draft!=="object")throw new Error("Mission design must be an object.");
  return normalizeTable({...table,
    title:draft.title,
    subtitle:draft.subtitle,
    accent:draft.accent,
    quests:draft.quests,
    mode:draft.mode
  });
}
