import test from "node:test";
import assert from "node:assert/strict";
import {findPreset} from "../src/tables.js";
import {newQuestLedger,questStatus,recordQuestEvent,tickQuestTimers} from "../src/quests.js";
import {PinballGame} from "../src/physics.js";
import {normalizeTable} from "../src/validation.js";
import {missionDraft,applyMissionDraft,defaultChallenge,
  toggleQuestChallenge,editQuestChallenge,toggleQuestSequence} from "../src/workshop.js";

const base={
  id:"q-secret",label:"Safety override",kind:"targetHits",goal:2,
  stages:[
    {kind:"targetHits",partId:"t1",goal:1},
    {kind:"targetHits",partId:"t3",goal:1}
  ],
  challenge:{seconds:12,wrongHit:"reset",points:5000,extraBall:true}
};
test("clock starts only on first correct hit, not an incorrect hit",()=>{
  const ledger=newQuestLedger([base]);
  recordQuestEvent(ledger,"targetHits","t3",2);
  assert.equal(questStatus(ledger,base,2).running,false);
  recordQuestEvent(ledger,"targetHits","t1",5);
  assert.equal(questStatus(ledger,base,5).running,true);
  assert.equal(questStatus(ledger,base,5).remaining,12);
  assert.equal(questStatus(ledger,base,12).remaining,5);
});
test("wrong target resets the whole sequence and cancels its timer",()=>{
  const ledger=newQuestLedger([base]);
  recordQuestEvent(ledger,"targetHits","t1",1);
  assert.equal(questStatus(ledger,base,1).stageIndex,1);
  recordQuestEvent(ledger,"targetHits","t2",2);
  const status=questStatus(ledger,base,2);
  assert.equal(status.stageIndex,0);
  assert.equal(status.running,false);
  assert.equal(status.failures,1);
  assert.equal(ledger.stageEvents[0].type,"wrongHit");
  recordQuestEvent(ledger,"targetHits","t1",3);
  assert.equal(questStatus(ledger,base,3).remaining,12);
});
test("unrelated kind doesn't reset, and ignore behavior preserves progress",()=>{
  const ignore={...base,challenge:{...base.challenge,wrongHit:"ignore"}};
  const ledger=newQuestLedger([ignore]);
  recordQuestEvent(ledger,"targetHits","t1",1);
  recordQuestEvent(ledger,"bumperHits","b1",2);
  recordQuestEvent(ledger,"targetHits","t2",3);
  assert.equal(questStatus(ledger,ignore,3).stageIndex,1);
  assert.equal(questStatus(ledger,ignore,3).failures,0);
  assert.equal(questStatus(ledger,ignore,3).remaining,10);
});
test("expired sequence restarts without undoing regular score totals",()=>{
  const ledger=newQuestLedger([base]);
  recordQuestEvent(ledger,"targetHits","t1",3);
  assert.deepEqual(tickQuestTimers(ledger,14.99),[]);
  const expired=tickQuestTimers(ledger,15);
  assert.equal(expired.length,1);
  assert.equal(expired[0].type,"timeout");
  assert.equal(questStatus(ledger,base,15).stageIndex,0);
  assert.equal(questStatus(ledger,base,15).failures,1);
  assert.equal(ledger.counts.targetHits,1);
  assert.deepEqual(tickQuestTimers(ledger,16),[],"only one timeout per attempt");
  recordQuestEvent(ledger,"targetHits","t1",20);
  recordQuestEvent(ledger,"targetHits","t3",21);
  assert.deepEqual(ledger.completed,["q-secret"]);
});
test("a real game awards points and a capped extra ball at final stage",()=>{
  const table=findPreset("lab");table.quests=[base];table.mode=null;
  const messages=[];const game=new PinballGame(table,m=>{if(m)messages.push(m);});
  game.launch();
  game.advanceQuest("targetHits","t1");
  assert.equal(game.ledger.completed.length,0);
  assert.equal(game.balls,3);
  game.advanceQuest("targetHits","t3");
  assert.equal(game.ledger.completed.length,1);
  assert.equal(game.score,5000);
  assert.equal(game.balls,4);
  assert.ok(messages.some(m=>m.includes("EXTRA BALL")));
  const next=game.score;
  game.advanceQuest("targetHits","t3");
  assert.equal(game.score,next,"reward pays only once");
});
test("classic quests and unconfigured staged quests still pay 2000",()=>{
  const table=findPreset("lab");
  table.quests=[{id:"classic",label:"two",kind:"bumperHits",goal:2},{
    id:"stage",label:"ordered",kind:"targetHits",goal:1,
    stages:[{kind:"targetHits",partId:"t1",goal:1}]
  }];
  table.mode=null;
  const g=new PinballGame(table);g.launch();
  g.advanceQuest("bumperHits","b1");
  g.advanceQuest("bumperHits","b2");
  assert.equal(g.score,2000);
  g.advanceQuest("targetHits","t1");
  assert.equal(g.score,4000);
});
test("validator bounds untrusted mission challenge values, and ignores it on classic quests",()=>{
  const table=findPreset("lab");
  table.quests=[{...base,challenge:{
    seconds:9999,wrongHit:"__proto__",points:10000000,extraBall:"yes"
  }},{id:"simple",kind:"bumperHits",label:"simple",goal:2,challenge:base.challenge}];
  const safe=normalizeTable(table);
  assert.deepEqual(safe.quests[0].challenge,
    {seconds:120,wrongHit:"ignore",points:20000,extraBall:false});
  assert.equal(safe.quests[1].challenge,undefined);
  const legacy=normalizeTable({...table,quests:[{...base,challenge:undefined}]});
  assert.equal(legacy.quests[0].challenge,undefined);
});
test("visual editor changes challenge data and JSON roundtrips without mutation",()=>{
  const lab=findPreset("lab");let draft=missionDraft(lab);
  const id=draft.quests[0].id;
  draft.quests=toggleQuestSequence(draft.quests,id,true);
  draft.quests=toggleQuestChallenge(draft.quests,id,true);
  assert.deepEqual(draft.quests[0].challenge,defaultChallenge());
  draft.quests=editQuestChallenge(draft.quests,id,"seconds",33);
  draft.quests=editQuestChallenge(draft.quests,id,"wrongHit","reset");
  draft.quests=editQuestChallenge(draft.quests,id,"points",8800);
  draft.quests=editQuestChallenge(draft.quests,id,"extraBall",true);
  const stored=applyMissionDraft(lab,draft);
  assert.equal(stored.quests[0].challenge.seconds,33);
  assert.equal(stored.quests[0].challenge.points,8800);
  assert.equal(stored.quests[0].challenge.extraBall,true);
  assert.deepEqual(normalizeTable(JSON.parse(JSON.stringify(stored))),stored);
  assert.equal(lab.quests[0].challenge,undefined);
  draft.quests=toggleQuestChallenge(draft.quests,id,false);
  assert.equal(draft.quests[0].challenge,undefined);
  draft.quests=toggleQuestChallenge(draft.quests,id,true);
  draft.quests=toggleQuestSequence(draft.quests,id,false);
  assert.equal(draft.quests[0].challenge,undefined);
});
test("challenge is suppressed on completed quest after timer passes",()=>{
  const ledger=newQuestLedger([base]);
  recordQuestEvent(ledger,"targetHits","t1",1);
  recordQuestEvent(ledger,"targetHits","t3",2);
  assert.equal(ledger.completed.length,1);
  assert.deepEqual(tickQuestTimers(ledger,999),[]);
  assert.equal(questStatus(ledger,base,999).completed,true);
});
test("timed challenge in preset refers to playable secret sequence",()=>{
  const btm=findPreset("btm"),arc=findPreset("arclight");
  const q=btm.quests.find(x=>x.id==="btm-secret");
  assert.equal(q.challenge.seconds,45);
  assert.equal(q.challenge.extraBall,true);
  assert.equal(q.stages.length,3);
  assert.equal(arc.quests.find(x=>x.id==="arc-sequence").challenge.points,7500);
});
