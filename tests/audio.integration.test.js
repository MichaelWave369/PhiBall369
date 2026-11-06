import test from "node:test";
import assert from "node:assert/strict";
import {ArcadeAudio} from "../src/audio.js";
import {PinballGame} from "../src/physics.js";
import {findPreset} from "../src/tables.js";

test("game physics emits structured sound effects and preserves string announcements",()=>{
  const events=[],messages=[];
  const game=new PinballGame(findPreset("lab"),(message,event)=>{
    assert.equal(typeof message,"string");
    if(message)messages.push(message);
    if(event)events.push(event);
  });
  game.launch(.68);
  game.pendingHits.push({kind:"bumper",id:"b1",layer:0,x:3,y:5.2});
  game.processHits();
  for(let i=0;i<6;i++)game.advanceQuest("bumperHits");
  assert.equal(game.enterRamp(findPreset("lab").objects.find(p=>p.id==="up")),true);
  assert.ok(events.some(e=>e.type==="launch"));
  assert.ok(events.some(e=>e.type==="hit"&&e.kind==="bumper"));
  assert.ok(events.some(e=>e.type==="quest"));
  assert.ok(events.some(e=>e.type==="ramp"));
  assert.ok(messages.some(x=>x.includes("RAMP ASCENT")));
  game.drain();
  assert.ok(events.some(e=>e.type==="drain"));
  assert.ok(events.every(e=>Number.isFinite(e.at)&&Number.isInteger(e.sequence)));
});

test("audio playback is safely opt-in, throttled and uses local oscillators",()=>{
  const sounds=[];
  class FakeOsc{
    constructor(){this.frequency={setValueAtTime(){},exponentialRampToValueAtTime(){}};this.type="sine";}
    connect(){} disconnect(){}
    start(t){sounds.push(["start",t]);}
    stop(t){sounds.push(["stop",t]);}
  }
  class FakeGain{
    constructor(){this.gain={setValueAtTime(){},exponentialRampToValueAtTime(){}};}
    connect(){} disconnect(){}
  }
  const audio=new ArcadeAudio();
  audio.enabled=true;audio.context={
    state:"running",currentTime:1.0,destination:{},
    createOscillator:()=>new FakeOsc(),
    createGain:()=>new FakeGain()
  };
  assert.equal(audio.play({type:"hit",kind:"bumper"}),true);
  assert.equal(audio.play({type:"hit",kind:"bumper"}),false);
  assert.ok(sounds.some(([type])=>type==="start"));
  audio.context.currentTime+=.4;
  audio.setMuted(true);
  assert.equal(audio.play({type:"tilt"}),false);
  audio.setMuted(false);
  assert.equal(audio.play({type:"tilt"}),true);
});
