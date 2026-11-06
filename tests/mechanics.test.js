import test from "node:test";
import assert from "node:assert/strict";
import * as planck from "planck";
import {PinballGame} from "../src/physics.js";
import {findPreset} from "../src/tables.js";

test("plunger starts on hold, accumulates spring strength, and fires on release",()=>{
  const game=new PinballGame(findPreset("lab"));
  assert.equal(game.beginCharge(),true);
  assert.equal(game.beginCharge(),false,"holding twice should not restart charge");
  for(let i=0;i<70;i++)game.stepFrame(1/60,{});
  assert.ok(game.charge>.8 && game.charge<1);
  const captured=game.charge;
  assert.equal(game.releaseCharge(),true);
  assert.equal(game.status,"playing");
  assert.equal(game.charging,false);
  assert.equal(game.charge,0);
  assert.ok(Math.abs(game.launchStrength-captured)<1e-9);
  assert.ok(game.ball.getLinearVelocity().y<-12.3);
  assert.equal(game.releaseCharge(),false,"cannot double-launch");
});

test("charge is capped and cancel is safe",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.beginCharge();
  for(let i=0;i<400;i++)game.stepFrame(1/60,{});
  assert.equal(game.charge,1);
  game.cancelCharge();
  assert.equal(game.charge,0);
  assert.equal(game.charging,false);
  assert.equal(game.status,"ready");
  assert.equal(game.releaseCharge(),false);
  assert.equal(game.launch(),true,"quick launch remains supported");
});

test("medium power shooter exit awards skill shot once",()=>{
  const game=new PinballGame(findPreset("lab"));
  assert.equal(game.launch(.7),true);
  game.ball.setTransform(planck.Vec2(9.55,2.82),0);
  game.ball.setLinearVelocity(planck.Vec2(0,-5));
  game.stepFrame(1/120,{});
  assert.equal(game.score,1500);
  assert.equal(game.skillShotClaimed,true);
  game.stepFrame(1/120,{});
  assert.equal(game.score,1500,"skill shot cannot pay twice");
});

test("strong repeat nudges eventually tilt; scoring locks until ball drains",()=>{
  const events=[];
  const game=new PinballGame(findPreset("lab"),message=>events.push(message));
  game.launch();
  assert.equal(game.nudge(),true);
  game.elapsed+=.55;
  assert.equal(game.nudge(),true);
  game.elapsed+=.55;
  assert.equal(game.nudge(),true);
  assert.equal(game.tilted,true);
  assert.equal(game.nudge(),false);
  assert.ok(events.some(m=>m.startsWith("TILT!")));
  game.pendingHits.push({layer:0,id:"b1",kind:"bumper",x:3,y:5});
  game.processHits();
  assert.equal(game.score,0,"tilt prevents scoring");
  game.drain();
  assert.equal(game.tilted,false,"a fresh ball resets tilt");
  assert.equal(game.tiltMeter,0);
  assert.equal(game.balls,2);
});

test("tilt prevents upper-deck bonus but allows ramp motion",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch();
  game.tilted=true;
  game.transfer({toLayer:1,toX:3.2,toY:4.1});
  assert.equal(game.layer,1);
  assert.equal(game.score,0);
  assert.equal(game.ledger.counts.rampRuns,0);
});

test("switching machines resets spring and tilt state",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.beginCharge();
  game.stepFrame(.05);
  assert.ok(game.charge>0);
  game.setTable(findPreset("btm"));
  assert.equal(game.charge,0);
  assert.equal(game.tiltMeter,0);
  assert.equal(game.tilted,false);
});
