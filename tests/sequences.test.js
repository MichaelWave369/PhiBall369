import test from "node:test";
import assert from "node:assert/strict";
import {findPreset,PRESETS} from "../src/tables.js";
import {newQuestLedger,recordQuestEvent,questStatus,MAX_STAGES} from "../src/quests.js";
import {normalizeTable} from "../src/validation.js";
import {PinballGame} from "../src/physics.js";
import {missionDraft,applyMissionDraft,toggleQuestSequence,addQuestStage,
  editQuestStage,removeQuestStage,moveQuestStage} from "../src/workshop.js";

const sequence={
  id:"secret",label:"Open the Vault",kind:"targetHits",goal:3,
  stages:[
    {kind:"targetHits",partId:"t1",goal:1},
    {kind:"targetHits",partId:"t3",goal:1},
    {kind:"rampRuns",partId:"up",goal:1}
  ]
};

test("classic quest total behavior is unchanged by the new sequence ledger",()=>{
  const ledger=newQuestLedger([{id:"legacy",label:"Classic",kind:"targetHits",goal:2}]);
  assert.equal(recordQuestEvent(ledger,"targetHits","t1").length,0);
  assert.equal(recordQuestEvent(ledger,"targetHits","t1").length,1);
  assert.equal(recordQuestEvent(ledger,"targetHits","t3").length,0);
  assert.equal(ledger.counts.targetHits,3);
  assert.equal(questStatus(ledger,ledger.quests[0]).completed,true);
});

test("targeted stages ignore wrong parts, unlock in order, and cannot double-use one hit",()=>{
  const ledger=newQuestLedger([sequence]);
  assert.deepEqual(recordQuestEvent(ledger,"targetHits","t3"),[],"future target can't bypass first stage");
  assert.equal(questStatus(ledger,sequence).stageIndex,0);
  assert.deepEqual(recordQuestEvent(ledger,"targetHits","t1"),[]);
  assert.equal(questStatus(ledger,sequence).stageIndex,1);
  assert.equal(ledger.stageEvents.length,1);
  assert.equal(ledger.stageEvents[0].completedStage,1);
  assert.deepEqual(recordQuestEvent(ledger,"targetHits","t1"),[],"previous target cannot advance");
  assert.equal(questStatus(ledger,sequence).stageIndex,1);
  assert.deepEqual(recordQuestEvent(ledger,"targetHits","t3"),[]);
  assert.equal(questStatus(ledger,sequence).stageIndex,2);
  assert.deepEqual(recordQuestEvent(ledger,"rampRuns","down"),[],"other ramp doesn't count");
  assert.equal(recordQuestEvent(ledger,"rampRuns","up").length,1);
  assert.equal(questStatus(ledger,sequence).completed,true);
  assert.equal(recordQuestEvent(ledger,"rampRuns","up").length,0,"completion only pays once");
});

test("two identical adjacent stages still require two independent collisions",()=>{
  const q={id:"two",label:"Two exact hits",kind:"bumperHits",goal:2,
    stages:[{kind:"bumperHits",partId:"b1",goal:1},{kind:"bumperHits",partId:"b1",goal:1}]};
  const ledger=newQuestLedger([q]);
  assert.deepEqual(recordQuestEvent(ledger,"bumperHits","b1"),[]);
  assert.equal(questStatus(ledger,q).stageIndex,1);
  assert.deepEqual(recordQuestEvent(ledger,"bumperHits","b1").map(q=>q.id),["two"]);
});

test("stage goals are per-stage, and aggregate score counters continue through stages",()=>{
  const q={...sequence,stages:[
    {kind:"bumperHits",partId:"b1",goal:2},{kind:"targetHits",partId:"t1",goal:1}
  ]};
  const ledger=newQuestLedger([q]);
  recordQuestEvent(ledger,"bumperHits","b1");
  assert.equal(questStatus(ledger,q).count,1);
  recordQuestEvent(ledger,"bumperHits","b2");
  assert.equal(questStatus(ledger,q).count,1,"wrong part doesn't increment");
  recordQuestEvent(ledger,"bumperHits","b1");
  assert.equal(questStatus(ledger,q).stageIndex,1);
  assert.equal(questStatus(ledger,q).count,0);
  recordQuestEvent(ledger,"targetHits","t1");
  assert.equal(ledger.counts.bumperHits,3);
  assert.equal(ledger.counts.targetHits,1);
  assert.equal(ledger.completed.length,1);
});

test("preset secret quests reference actual physical parts and upper-ascents",()=>{
  for(const table of PRESETS){
    const normalized=normalizeTable(table);
    for(const quest of normalized.quests.filter(q=>q.stages?.length)){
      assert.ok(quest.stages.length>=2);
      for(const stage of quest.stages){
        const part=table.objects.find(p=>p.id===stage.partId);
        assert.ok(part,quest.label+" has a real part");
        if(stage.kind==="rampRuns")assert.ok(part.type==="ramp"&&part.toLayer===1);
        else assert.equal(part.type,stage.kind==="bumperHits"?"bumper":"target");
      }
    }
  }
  assert.equal(findPreset("btm").quests.some(q=>q.id==="btm-secret"),true);
  assert.equal(findPreset("arclight").quests.some(q=>q.id==="arc-sequence"),true);
});

test("game physics sends exact collision IDs to stage quests and awards points on completion",()=>{
  const table=findPreset("lab");table.quests=[sequence];table.mode=null;
  const messages=[];
  const game=new PinballGame(table,(message)=>{if(message)messages.push(message);});
  game.launch();
  game.pendingHits.push({id:"t3",kind:"target",layer:0,x:8.1,y:9.5});
  game.processHits();
  assert.equal(game.ledger.completed.length,0);
  game.pendingHits.push({id:"t1",kind:"target",layer:0,x:2.05,y:9.8});
  game.processHits();
  assert.equal(questStatus(game.ledger,sequence).stageIndex,1);
  assert.ok(messages.some(s=>s.includes("NEXT OBJECTIVE")));
  game.pendingHits.push({id:"t3",kind:"target",layer:0,x:8.1,y:9.5});
  // Debounce hit was at elapsed zero; advance simulation clock before reusing t3.
  game.elapsed+=.3;
  game.processHits();
  assert.equal(questStatus(game.ledger,sequence).stageIndex,2);
  const before=game.score;
  game.advanceQuest("rampRuns","up");
  assert.equal(game.ledger.completed.length,1);
  assert.equal(game.score-before,2000);
});

test("mission stage editing is immutable and saves exact IDs through JSON",()=>{
  const original=findPreset("lab");
  let draft=missionDraft(original);
  const id=draft.quests[0].id;
  draft.quests=toggleQuestSequence(draft.quests,id,true);
  assert.equal(draft.quests[0].stages.length,2);
  draft.quests=editQuestStage(draft.quests,id,0,"kind","targetHits");
  draft.quests=editQuestStage(draft.quests,id,0,"partId","t1");
  draft.quests=editQuestStage(draft.quests,id,1,"kind","rampRuns");
  draft.quests=editQuestStage(draft.quests,id,1,"partId","up");
  draft.quests=addQuestStage(draft.quests,id);
  draft.quests=editQuestStage(draft.quests,id,2,"kind","targetHits");
  draft.quests=editQuestStage(draft.quests,id,2,"partId","t3");
  draft.quests=moveQuestStage(draft.quests,id,2,-1);
  assert.equal(draft.quests[0].stages[1].partId,"t3");
  draft.quests=moveQuestStage(draft.quests,id,2,-1);
  draft.quests=removeQuestStage(draft.quests,id,1);
  assert.equal(draft.quests[0].stages.length,2);
  const saved=applyMissionDraft(original,draft);
  assert.equal(original.quests[0].stages,undefined,"presets not modified");
  assert.equal(saved.quests[0].stages[0].partId,"t1");
  assert.equal(saved.quests[0].stages[1].partId,"t3");
  assert.deepEqual(normalizeTable(JSON.parse(JSON.stringify(saved))),saved);
  assert.notEqual(missionDraft(saved).quests[0].stages,saved.quests[0].stages,
    "authoring draft must not alias saved nested stage arrays");
});

test("import validation clamps stages and goals; unknown parts cannot trap a mission",()=>{
  const lab=findPreset("lab");
  const raw={...lab,quests:[{id:"bad",label:"mystery",kind:"targetHits",goal:2,
    stages:Array.from({length:12},(_,i)=>({
      kind:"targetHits",partId:i%2?"missing":"b1",goal:10000
    }))}]};
  const table=normalizeTable(raw);
  assert.equal(table.quests[0].stages.length,MAX_STAGES);
  assert.equal(table.quests[0].stages[0].partId,null);
  assert.equal(table.quests[0].stages[1].partId,null);
  assert.equal(table.quests[0].stages[0].goal,99);
  const g=new PinballGame(table);g.launch();
  for(let i=0;i<99;i++)g.advanceQuest("targetHits");
  assert.equal(questStatus(g.ledger,table.quests[0]).stageIndex,1);
  assert.equal(table.objects.length,lab.objects.length);
});

test("switching event type clears stale exact-part selection",()=>{
  const quests=[{id:"q",kind:"targetHits",goal:2,
    stages:[{kind:"targetHits",goal:1,partId:"t1"}]}];
  const changed=editQuestStage(quests,"q",0,"kind","bumperHits");
  assert.equal(changed[0].stages[0].partId,null);
  assert.equal(changed[0].stages[0].kind,"bumperHits");
  assert.equal(quests[0].stages[0].partId,"t1");
});
