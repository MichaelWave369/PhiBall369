import test from "node:test";
import assert from "node:assert/strict";
import {findPreset} from "../src/tables.js";
import {normalizeTable} from "../src/validation.js";
import {PinballGame} from "../src/physics.js";
import {addQuest,applyMissionDraft,defaultMode,missionDraft,moveQuest,removeQuest,
  updateQuest,updateMode,MAX_QUESTS} from "../src/workshop.js";

test("mission designer adds eight objectives max with stable unique IDs",()=>{
  let quests=[];
  for(let i=0;i<12;i++)quests=addQuest(quests);
  assert.equal(quests.length,MAX_QUESTS);
  assert.equal(new Set(quests.map(q=>q.id)).size,8);
  assert.equal(addQuest(quests),quests,"limit preserves existing quest array");
  const first=quests[0].id;
  quests=removeQuest(quests,first);
  quests=addQuest(quests);
  assert.equal(new Set(quests.map(q=>q.id)).size,8);
});
test("mission edits are immutable and cannot silently change quest IDs",()=>{
  const original=missionDraft(findPreset("lab")).quests;
  const updated=updateQuest(original,original[0].id,"goal",11);
  assert.equal(updated[0].goal,11);
  assert.equal(original[0].goal,6);
  const blocked=updateQuest(original,original[0].id,"id","steal");
  assert.equal(blocked,original);
  const moved=moveQuest(original,original[0].id,1);
  assert.equal(moved[1].id,original[0].id);
  assert.equal(moveQuest(original,original[0].id,-1),original);
});
test("mission design roundtrips through validated existing table JSON",()=>{
  const source=findPreset("btm");
  const draft=missionDraft(source);
  draft.title="A new table";
  draft.subtitle="A custom story";
  draft.quests=addQuest(draft.quests);
  draft.quests=updateQuest(draft.quests,draft.quests[3].id,"label","Overload the core");
  draft.quests=updateQuest(draft.quests,draft.quests[3].id,"kind","bumperHits");
  draft.mode=updateMode(defaultMode(),"duration",27);
  const result=applyMissionDraft(source,draft);
  assert.equal(result.objects.length,source.objects.length);
  assert.equal(result.quests[3].label,"Overload the core");
  assert.equal(result.mode.duration,27);
  assert.deepEqual(normalizeTable(JSON.parse(JSON.stringify(result))),result);
  const game=new PinballGame(result);
  assert.equal(game.ledger.quests.length,4);
  assert.equal(game.modeState.config.duration,27);
});
test("legacy tables without missions or special modes remain valid",()=>{
  const source=normalizeTable({objects:[],quests:[]});
  const draft=missionDraft(source);
  assert.equal(draft.quests.length,0);
  assert.equal(draft.mode,null);
  const saved=applyMissionDraft(source,draft);
  assert.equal(saved.mode,null);
  assert.equal(saved.quests.length,0);
});
test("mission editor uses validators for unsafe text, counts and mode values",()=>{
  const source=findPreset("lab");
  const draft=missionDraft(source);
  draft.title="<script>title";
  draft.quests[0].label="<img>wall";
  draft.quests[0].goal=2000;
  draft.mode=updateMode(defaultMode(),"multiplier",123);
  const saved=applyMissionDraft(source,draft);
  assert.ok(!saved.title.includes("<"));
  assert.ok(!saved.quests[0].label.includes("<"));
  assert.equal(saved.quests[0].goal,99);
  assert.equal(saved.mode.multiplier,5);
});
test("duplicate imported quest IDs cannot share completion bookkeeping",()=>{
  const raw={objects:[],quests:[
    {id:"same",label:"one",kind:"bumperHits",goal:2},
    {id:"same",label:"two",kind:"bumperHits",goal:3},
    {id:"same",label:"three",kind:"targetHits",goal:1}
  ]};
  const table=normalizeTable(raw);
  assert.equal(table.quests.length,3);
  assert.equal(new Set(table.quests.map(q=>q.id)).size,3);
  const game=new PinballGame(table);
  game.launch();
  game.advanceQuest("bumperHits");
  game.advanceQuest("bumperHits");
  assert.equal(game.ledger.completed.length,1);
  game.advanceQuest("bumperHits");
  assert.equal(game.ledger.completed.length,2);
});
