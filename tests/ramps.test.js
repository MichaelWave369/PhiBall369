import test from "node:test";
import assert from "node:assert/strict";
import {PinballGame} from "../src/physics.js";
import {findPreset} from "../src/tables.js";
import {makeRampTrack,sampleRamp,DECK_Z} from "../src/rampGeometry.js";
import {normalizeTable} from "../src/validation.js";

const upward=()=>findPreset("lab").objects.find(o=>o.type==="ramp"&&o.layer===0);
const downward=()=>findPreset("lab").objects.find(o=>o.type==="ramp"&&o.layer===1);

test("ramp track has continuously sampled x/y/z, preserves endpoints and deck heights",()=>{
  const part=upward(),track=makeRampTrack(part);
  assert.equal(track.nodes.length,81);
  assert.ok(track.totalLength>3);
  const begin=sampleRamp(track,0);
  const end=sampleRamp(track,track.totalLength);
  assert.equal(begin.x,part.x);
  assert.equal(begin.y,part.y);
  assert.equal(begin.z,DECK_Z[0]);
  assert.ok(Math.abs(end.x-part.toX)<1e-9);
  assert.ok(Math.abs(end.y-part.toY)<1e-9);
  assert.ok(Math.abs(end.z-DECK_Z[1])<1e-9);
  let prior=begin;
  for(let i=1;i<=80;i++) {
    const p=sampleRamp(track,track.totalLength*i/80);
    assert.ok(p.z>=prior.z-1e-8,"ascent height never jumps backward");
    assert.ok(Math.hypot(p.x-prior.x,p.y-prior.y,p.z-prior.z)<.10,
      "neighboring samples must be spatially continuous");
    prior=p;
  }
});

test("downward ramp height is monotonically decreasing",()=>{
  const track=makeRampTrack(downward());
  assert.equal(sampleRamp(track,0).z,DECK_Z[1]);
  assert.ok(Math.abs(sampleRamp(track,track.totalLength).z-DECK_Z[0])<1e-9);
  let prior=DECK_Z[1];
  for(let i=1;i<=80;i++){
    const p=sampleRamp(track,track.totalLength*i/80);
    assert.ok(p.z<=prior+1e-8);
    prior=p.z;
  }
});
test("curved path and straight path have different centerlines",()=>{
  const part=upward();
  const flat=makeRampTrack({...part,curve:0});
  const curved=makeRampTrack({...part,curve:1.3});
  const p=sampleRamp(flat,flat.totalLength*.5);
  const q=sampleRamp(curved,curved.totalLength*.5);
  assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>.2);
});
test("old JSON ramps import with defaults, and curve values are bounded",()=>{
  const up=upward();
  const legacy=normalizeTable({objects:[{...up,curve:undefined}]});
  assert.equal(legacy.objects[0].curve,.4);
  const invalid=normalizeTable({objects:[{...up,curve:Infinity}]});
  assert.equal(invalid.objects[0].curve,.4);
  const extremes=normalizeTable({objects:[{...up,curve:1000}]});
  assert.equal(extremes.objects[0].curve,1.5);
  const sanitized=normalizeTable({objects:[{...up,curve:-1000}]});
  assert.equal(sanitized.objects[0].curve,-1.5);
});
test("entering a ramp removes active rigid-body ball, advances continuously and returns it",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch(.72);
  const previousScore=game.score;
  const up=upward();
  assert.equal(game.enterRamp(up),true);
  assert.equal(game.ball,null);
  assert.equal(game.layer,0);
  assert.ok(game.rampMotion);
  let lastZ=game.rampMotion.point.z;
  let middleSamples=0;
  for(let i=0;i<700&&game.rampMotion;i++){
    game.stepFrame(1/120,{});
    if(game.rampMotion){
      assert.ok(game.rampMotion.point.z>=lastZ-1e-8);
      lastZ=game.rampMotion.point.z;
      middleSamples++;
    }
  }
  assert.ok(middleSamples>5,"ball travels along ramp over multiple simulation frames");
  assert.equal(game.rampMotion,null);
  assert.equal(game.layer,1);
  assert.ok(game.ball);
  assert.equal(game.ledger.counts.rampRuns,1);
  assert.ok(game.score>previousScore);
});
test("ramp rollback returns the ball to the source deck without quest rewards",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch(.7);
  game.enterRamp(upward());
  game.rampMotion.speed=-2;
  game.stepFrame(1/120,{});
  assert.equal(game.rampMotion,null);
  assert.equal(game.layer,0);
  assert.ok(game.ball);
  assert.equal(game.ledger.counts.rampRuns,0);
});
test("restart and nudge while guided on ramp are safe",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch(.7);
  game.enterRamp(upward());
  assert.equal(game.nudge(),false);
  game.reset();
  assert.equal(game.rampMotion,null);
  assert.equal(game.status,"ready");
  assert.ok(game.ball);
  assert.equal(game.layer,0);
});
