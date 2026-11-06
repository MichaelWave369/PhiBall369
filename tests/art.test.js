import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const names=["ball","bumper","flipper-red","flipper-blue","target","slingshot","ramp-gate"];
test("all original chrome sprites are complete, local SVG images",()=>{
  for(const name of names){
    const xml=readFileSync(join(process.cwd(),"src","assets",name+".svg"),"utf8");
    assert.match(xml,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(xml,/viewBox=/);
    assert.match(xml,/<\/svg>/);
    assert.doesNotMatch(xml,/<script|<foreignObject|(?:xlink:)?href=["']https?:/i);
    assert.ok(xml.length>500);
  }
});
test("renderer and the solver use shared geometry",()=>{
  const renderer=readFileSync(join(process.cwd(),"src","render.js"),"utf8");
  const physics=readFileSync(join(process.cwd(),"src","physics.js"),"utf8");
  assert.match(renderer,/from "\.\/geometry\.js"/);
  assert.match(physics,/from "\.\/geometry\.js"/);
  assert.match(renderer,/drawSprite/);
});
