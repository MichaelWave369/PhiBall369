import test from "node:test";
import assert from "node:assert/strict";
import {PRESETS,findPreset,MAX_OBJECTS} from "../src/tables.js";
import {normalizeTable} from "../src/validation.js";
import {newQuestLedger,recordQuestEvent} from "../src/quests.js";

test("all starter tables are valid and have two elevations",()=>{
  for(const preset of PRESETS) {
    const table=normalizeTable(preset);
    assert.equal(table.objects.length,preset.objects.length);
    assert.ok(table.objects.some(o=>o.layer===0&&o.type==="ramp"&&o.toLayer===1));
    assert.ok(table.objects.some(o=>o.layer===1&&o.type==="ramp"&&o.toLayer===0));
  }
});
test("presets are deep copies, not mutable shared defaults",()=>{
  const a=findPreset("lab"),b=findPreset("lab");
  a.objects.pop();
  assert.notEqual(a.objects.length,b.objects.length);
});
test("rejects object flood and invalid root",()=>{
  assert.throws(()=>normalizeTable(null));
  assert.throws(()=>normalizeTable({objects:new Array(MAX_OBJECTS+1).fill({type:"bumper"})}));
});
test("sanitizes imports without executing scripts",()=>{
  const t=normalizeTable({title:"<script>x</script>",accent:"url(foo)",objects:[
    {type:"bumper",id:"a",x:Infinity,y:-200,r:99,layer:3},
    {type:"ramp",id:"r",x:2,y:5,toX:4,toY:6,layer:0,toLayer:0},
    {type:"hacker",id:"h",x:2,y:2},
    {type:"target",id:"a",x:4,y:4}
  ],quests:[{id:"ok",kind:"bumperHits",goal:10000,label:"<img>"}]});
  assert.equal(t.title,"scriptx/script");
  assert.equal(t.accent,"#72edff");
  assert.equal(t.objects.length,1);
  assert.equal(t.objects[0].r,.75);
  assert.equal(t.objects[0].layer,0);
  assert.equal(t.quests[0].goal,99);
});
test("quests complete only once even on repeated hits",()=>{
  const ledger=newQuestLedger([{id:"a",kind:"bumperHits",label:"test",goal:2}]);
  assert.deepEqual(recordQuestEvent(ledger,"bumperHits"),[]);
  assert.equal(recordQuestEvent(ledger,"bumperHits").length,1);
  assert.equal(recordQuestEvent(ledger,"bumperHits").length,0);
});
