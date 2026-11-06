import test from "node:test";
import assert from "node:assert/strict";
import {PRESETS,findPreset} from "../src/tables.js";
import {PinballGame} from "../src/physics.js";
import {makeModeState,modeActive,modeRemaining,onModeEvent,expireMode} from "../src/modes.js";
import {normalizeTable} from "../src/validation.js";

test("three machine layouts have independent hardware rather than shared geometry",()=>{
  assert.equal(PRESETS.length,3);
  const signatures=new Set();
  for(const table of PRESETS){
    const normalized=normalizeTable(table);
    assert.equal(normalized.objects.length,table.objects.length);
    assert.ok(table.mode && normalized.mode);
    assert.ok(table.objects.some(o=>o.type==="ramp"&&o.layer===0&&o.toLayer===1));
    assert.ok(table.objects.some(o=>o.type==="ramp"&&o.layer===1&&o.toLayer===0));
    assert.ok(table.objects.some(o=>o.type==="bumper"&&o.layer===1));
    assert.ok(table.objects.some(o=>o.type==="target"&&o.layer===0));
    const ids=new Set(table.objects.map(o=>o.id));
    assert.equal(ids.size,table.objects.length);
    const signature=table.objects.filter(o=>o.type==="bumper"||o.type==="ramp")
      .map(o=>o.type+":"+o.layer+":"+o.x+":"+o.y).join("|");
    assert.equal(signatures.has(signature),false);
    signatures.add(signature);
  }
});
test("preserves original Lab ramp ID used by existing sounds and tests",()=>{
  assert.ok(findPreset("lab").objects.some(o=>o.id==="up"&&o.type==="ramp"&&o.layer===0));
});
test("a mode builds toward activation and only later events receive multiplied bonus",()=>{
  const mode=findPreset("btm").mode;
  const state=makeModeState(mode);
  for(let i=0;i<mode.threshold-1;i++){
    assert.deepEqual(onModeEvent(state,mode.triggerKind,1),{activated:false,bonus:0});
  }
  assert.equal(state.progress,mode.threshold-1);
  const launch=onModeEvent(state,mode.triggerKind,2);
  assert.equal(launch.activated,true);
  assert.equal(launch.bonus,0);
  assert.equal(modeActive(state,2),true);
  assert.equal(modeRemaining(state,2),15);
  const jackpot=onModeEvent(state,mode.bonusKind,2.1);
  assert.equal(jackpot.bonus,1000);
  assert.equal(jackpot.activated,false);
  assert.equal(expireMode(state,18),true);
  assert.equal(modeActive(state,18),false);
  assert.equal(modeRemaining(state,18),0);
});
test("no double triggers while active and expiry requires recharging",()=>{
  const state=makeModeState(findPreset("lab").mode);
  for(let i=0;i<5;i++)onModeEvent(state,"bumperHits",1);
  assert.equal(state.activations,1);
  for(let i=0;i<10;i++)onModeEvent(state,"bumperHits",2);
  assert.equal(state.activations,1);
  assert.equal(onModeEvent(state,"bumperHits",14).activated,false);
  assert.equal(state.progress,1);
  for(let i=0;i<4;i++)onModeEvent(state,"bumperHits",14.1);
  assert.equal(state.activations,2);
});
test("real gameplay scoring triggers BTM mode, time-limited jackpot and game reset",()=>{
  const messages=[];
  const game=new PinballGame(findPreset("btm"),(message,event)=>{
    if(message)messages.push(message);
  });
  game.launch();
  for(let i=0;i<3;i++)game.advanceQuest("targetHits");
  assert.ok(modeActive(game.modeState,game.elapsed));
  assert.ok(messages.some(s=>s.includes("MODE ACTIVE")));
  const before=game.score;
  game.advanceQuest("targetHits");
  assert.ok(game.score>=before+1000);
  assert.ok(messages.some(s=>s.includes("SPECIAL JACKPOT")));
  game.drain();
  assert.equal(modeActive(game.modeState,game.elapsed),false);
  game.reset();
  assert.equal(game.modeState.activations,0);
});
test("ARCLight reactors and lab combos have distinct triggers and values",()=>{
  const game=new PinballGame(findPreset("arclight"));
  game.launch();
  game.advanceQuest("rampRuns");
  game.advanceQuest("rampRuns");
  assert.equal(modeActive(game.modeState,game.elapsed),true);
  const before=game.score;
  game.advanceQuest("bumperHits");
  assert.equal(game.score-before,200);
  const lab=new PinballGame(findPreset("lab"));
  lab.launch();
  for(let i=0;i<5;i++)lab.advanceQuest("bumperHits");
  assert.equal(modeActive(lab.modeState,lab.elapsed),true);
  const previous=lab.score;
  lab.advanceQuest("bumperHits");
  assert.equal(lab.score-previous,100+2000,"bonus plus one-time quest completion");
});
test("custom imported table mode is safely limited, preserving old formats",()=>{
  const legacy=normalizeTable({objects:[],quests:[]});
  assert.equal(legacy.mode,null);
  const evil=normalizeTable({objects:[],mode:{triggerKind:"evil",bonusKind:"targetHits"}});
  assert.equal(evil.mode,null);
  const table=normalizeTable({objects:[],mode:{
    id:"<script>",label:"<>MODE",description:"".padEnd(500,"x"),
    triggerKind:"targetHits",bonusKind:"bumperHits",
    threshold:1e6,duration:900,multiplier:900
  }});
  assert.equal(table.mode.threshold,30);
  assert.equal(table.mode.duration,60);
  assert.equal(table.mode.multiplier,5);
  assert.ok(!table.mode.label.includes("<"));
  assert.ok(table.mode.description.length<=180);
  assert.deepEqual(normalizeTable(table).mode,table.mode);
});
