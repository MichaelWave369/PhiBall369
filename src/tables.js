export const WIDTH = 10.5;
export const HEIGHT = 17.5;
export const BALL_RADIUS = 0.19;
export const MAX_OBJECTS = 120;

export function copyTable(table) {
  return JSON.parse(JSON.stringify(table));
}

const core = [
  {id:"b1",type:"bumper",layer:0,x:3.0,y:5.2,r:0.48},
  {id:"b2",type:"bumper",layer:0,x:5.25,y:3.85,r:0.53},
  {id:"b3",type:"bumper",layer:0,x:7.45,y:5.3,r:0.48},
  {id:"t1",type:"target",layer:0,x:2.05,y:9.8,r:0.30},
  {id:"t2",type:"target",layer:0,x:5.2,y:10.0,r:0.3},
  {id:"t3",type:"target",layer:0,x:8.1,y:9.5,r:0.3},
  {id:"w1",type:"wall",layer:0,x1:1.25,y1:11.7,x2:2.45,y2:12.35},
  {id:"w2",type:"wall",layer:0,x1:9.0,y1:11.7,x2:7.8,y2:12.35},
  {id:"up",type:"ramp",layer:0,toLayer:1,x:2.25,y:7.7,toX:3.15,toY:4.15,r:0.58},
  {id:"ub1",type:"bumper",layer:1,x:4.4,y:5.2,r:0.43},
  {id:"ub2",type:"bumper",layer:1,x:6.15,y:6.55,r:0.42},
  {id:"ut",type:"target",layer:1,x:5.3,y:3.1,r:0.27},
  {id:"down",type:"ramp",layer:1,toLayer:0,x:7.2,y:8.95,toX:7.35,toY:11.0,r:0.7}
];
const baseQuests = [
  {id:"q-bump",label:"Wake the pop bumpers",kind:"bumperHits",goal:6},
  {id:"q-target",label:"Tag any three targets",kind:"targetHits",goal:3},
  {id:"q-ramp",label:"Ride the upper playfield",kind:"rampRuns",goal:1}
];
const lab = {
  id:"lab",title:"PHIBALL LAB",subtitle:"Classic metal, gravity, and a suspicious amount of neon.",accent:"#72edff",
  objects:copyTable(core), quests:copyTable(baseQuests)
};
const btm = {
  id:"btm",title:"SYSTEM BREACH",subtitle:"A Break the Matrix machine. Hit nodes to breach the system.",accent:"#ff6b7d",
  objects:copyTable(core).map(o => o.type==="bumper" ? {...o,r:Math.max(0.28,o.r-0.04)} : o),
  quests:[
    {id:"q-bump",label:"Disrupt six security nodes",kind:"bumperHits",goal:6},
    {id:"q-target",label:"Disable four sentries",kind:"targetHits",goal:4},
    {id:"q-ramp",label:"Access the upper sector",kind:"rampRuns",goal:1}
  ]
};
const arc = {
  id:"arclight",title:"ARCLIGHT 3333",subtitle:"Launch into a two-deck starship and unlock the upper corridor.",accent:"#e7bcff",
  objects:copyTable(core).map(o => o.type==="target" ? {...o,y:o.y-0.6} : o),
  quests:[
    {id:"q-bump",label:"Charge the reactor coils",kind:"bumperHits",goal:9},
    {id:"q-ramp",label:"Traverse the second deck",kind:"rampRuns",goal:2},
    {id:"q-target",label:"Activate navigation beacons",kind:"targetHits",goal:5}
  ]
};
export const PRESETS = [lab,btm,arc];
export function findPreset(id) {
  return copyTable(PRESETS.find(t=>t.id===id) || lab);
}
