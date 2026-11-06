import test from "node:test";
import assert from "node:assert/strict";
import * as pl from "planck";
import {PinballGame} from "../src/physics.js";
import {findPreset} from "../src/tables.js";
import {LOWER_RAILS,UPPER_RAILS,SLINGSHOTS,drainZoneAt,deadCornerAt} from "../src/geometry.js";

test("outlanes are drain regions and shooter lane remains launchable",()=>{
  assert.equal(drainZoneAt(.55,15.99),"left-outlane");
  assert.equal(drainZoneAt(8.85,15.99),"right-outlane");
  assert.equal(drainZoneAt(5.25,16.80),"middle-drain");
  assert.equal(drainZoneAt(9.7,15.85),null);
  assert.equal(drainZoneAt(9.7,16.65),null);
  assert.equal(deadCornerAt(1.4,15.25),true);
  assert.equal(deadCornerAt(5.2,15.25),false);
});
test("shared geometry has no lower rail sealing off the outlanes",()=>{
  assert.equal(LOWER_RAILS.some(([a,b,c,d])=>b>15.4&&d>15.4&&a<2.5&&c<2.5),false);
  assert.equal(UPPER_RAILS.length>0,true);
  assert.equal(SLINGSHOTS.length,2);
});
test("left pocket from screenshot drains immediately rather than trapping ball",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch();
  game.ball.setTransform(pl.Vec2(.55,15.99),0);
  game.ball.setLinearVelocity(pl.Vec2(0,0));
  game.watchBall();
  assert.equal(game.status,"ready");
  assert.equal(game.balls,2);
  assert.match(game.lastRescue,/DRAIN/);
});
test("shooter lane stall reloads without a lost ball",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch(.15);
  game.ball.setTransform(pl.Vec2(9.7,16.52),0);
  game.ball.setLinearVelocity(pl.Vec2(0,0));
  for(let i=0;i<125;i++)game.watchBall();
  assert.equal(game.status,"ready");
  assert.equal(game.balls,3);
  assert.ok(game.ball);
});
test("slingshot impact kicks upward and scores without advancing target quests",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch();
  game.pendingHits.push({layer:0,id:"sling-left",kind:"sling",x:2.05,y:13.72,side:"left"});
  const before=game.ball.getLinearVelocity().y;
  game.processHits();
  assert.equal(game.score,75);
  assert.equal(game.ledger.counts.targetHits,0);
  assert.ok(game.ball.getLinearVelocity().y<before);
  game.pendingHits.push({layer:0,id:"sling-left",kind:"sling",x:2.05,y:13.72,side:"left"});
  game.processHits();
  assert.equal(game.score,75,"contact debounce prevents double scoring");
});
test("upper deck transfers and legacy quests still work",()=>{
  const game=new PinballGame(findPreset("lab"));
  game.launch();
  game.transfer({toLayer:1,toX:3.2,toY:4.1});
  assert.equal(game.layer,1);
  assert.equal(game.ledger.counts.rampRuns,1);
  game.transfer({toLayer:0,toX:7.35,toY:11});
  assert.equal(game.layer,0);
});
