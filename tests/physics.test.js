import test from "node:test";
import assert from "node:assert/strict";
import {PinballGame} from "../src/physics.js";
import {findPreset} from "../src/tables.js";

test("world constructs with revolute flippers and launches a real dynamic ball",()=>{
  const game=new PinballGame(findPreset("lab"));
  assert.equal(game.scenes.length,2);
  assert.equal(game.scenes[0].flippers.length,2);
  assert.equal(game.ball.getType(),"dynamic");
  const before=game.ball.getPosition().y;
  assert.equal(game.launch(),true);
  for(let i=0;i<20;i++)game.stepFrame(1/120,{left:i%2===0,right:false});
  assert.equal(game.status,"playing");
  assert.notEqual(game.ball.getPosition().y,before);
});

test("a ramp can transfer between independently stepped physics layers",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch();
  game.transfer({toLayer:1,toX:3.2,toY:4.1});
  assert.equal(game.layer,1);
  assert.equal(game.ledger.counts.rampRuns,1);
  assert.ok(game.score>=1200);
  game.transfer({toLayer:0,toX:7.3,toY:11});
  assert.equal(game.layer,0);
});

test("switching to another machine resets safely",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch();
  game.stepFrame(1/60,{left:false,right:false});
  game.setTable(findPreset("btm"));
  assert.equal(game.status,"ready");
  assert.equal(game.score,0);
  assert.equal(game.table.id,"btm");
});
