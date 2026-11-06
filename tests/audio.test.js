import test from "node:test";
import assert from "node:assert/strict";
import {ArcadeAudio,SOUND_EVENTS,SOUND_THEMES,soundPlan} from "../src/audio.js";

test("every arcade event has a bounded original procedural tone recipe",()=>{
  for(const id of SOUND_EVENTS){
    const result=soundPlan(id,"lab",1);
    assert.ok(result.length>=1&&result.length<=3,id);
    for(const voice of result){
      assert.ok(["triangle","sine","square","sawtooth"].includes(voice.wave));
      assert.ok(voice.gain>0&&voice.gain<=.21,id);
      assert.ok(voice.from>=35&&voice.to>=35);
      assert.ok(voice.duration>0&&voice.duration<.5);
      assert.ok(voice.delay>=0&&voice.delay<.5);
    }
  }
});
test("volume clamps and unknown effect types are silent",()=>{
  assert.deepEqual(soundPlan("unknown"),[]);
  assert.ok(soundPlan("bumper","lab",-100).every(x=>x.gain===0));
  assert.deepEqual(soundPlan("target","lab",NaN).map(x=>x.gain),[0,0]);
  const max=soundPlan("flipper","lab",10),normal=soundPlan("flipper","lab",1);
  assert.deepEqual(max,normal);
});
test("themes sound distinct without changing physics state",()=>{
  assert.ok(SOUND_THEMES.lab);
  assert.notEqual(soundPlan("bumper","btm",.55)[0].from,soundPlan("bumper","arclight",.55)[0].from);
});
test("audio starts disabled without constructing a browser AudioContext",()=>{
  const audio=new ArcadeAudio();
  assert.equal(audio.enabled,false);
  assert.equal(audio.context,null);
  assert.equal(audio.play({type:"bumper"}),false);
  audio.setVolume(5);
  assert.equal(audio.volume,1);
  audio.setMuted(true);
  assert.equal(audio.muted,true);
});
