export const WIDTH = 10.5;
export const HEIGHT = 17.5;
export const BALL_RADIUS = 0.19;
export const MAX_OBJECTS = 120;

export function copyTable(table) {
  return JSON.parse(JSON.stringify(table));
}

// These are different physical layouts, not palette swaps. Shooter lane,
// main flippers, fixed slings and drain geometry remain shared and calibrated.
const labParts=[
  {id:"lab-b1",type:"bumper",layer:0,x:3.0,y:5.2,r:.48},
  {id:"lab-b2",type:"bumper",layer:0,x:5.25,y:3.85,r:.53},
  {id:"lab-b3",type:"bumper",layer:0,x:7.45,y:5.3,r:.48},
  {id:"lab-t1",type:"target",layer:0,x:2.05,y:9.8,r:.30},
  {id:"lab-t2",type:"target",layer:0,x:5.2,y:10.0,r:.30},
  {id:"lab-t3",type:"target",layer:0,x:8.1,y:9.5,r:.30},
  {id:"lab-w1",type:"wall",layer:0,x1:1.25,y1:11.7,x2:2.45,y2:12.35},
  {id:"lab-w2",type:"wall",layer:0,x1:9.0,y1:11.7,x2:7.8,y2:12.35},
  {id:"lab-up",type:"ramp",layer:0,toLayer:1,x:2.25,y:7.7,toX:3.15,toY:4.15,r:.58,curve:.8},
  {id:"lab-ub1",type:"bumper",layer:1,x:4.4,y:5.2,r:.43},
  {id:"lab-ub2",type:"bumper",layer:1,x:6.15,y:6.55,r:.42},
  {id:"lab-ut",type:"target",layer:1,x:5.3,y:3.1,r:.27},
  {id:"lab-down",type:"ramp",layer:1,toLayer:0,x:7.2,y:8.95,toX:7.35,toY:11.0,r:.7,curve:-.65}
];
const breachParts=[
  {id:"btm-node1",type:"bumper",layer:0,x:2.65,y:4.15,r:.44},
  {id:"btm-node2",type:"bumper",layer:0,x:5.45,y:5.35,r:.46},
  {id:"btm-node3",type:"bumper",layer:0,x:8.05,y:3.88,r:.43},
  {id:"btm-sentry1",type:"target",layer:0,x:2.15,y:8.8,r:.31},
  {id:"btm-sentry2",type:"target",layer:0,x:3.84,y:10.10,r:.31},
  {id:"btm-sentry3",type:"target",layer:0,x:6.47,y:9.95,r:.31},
  {id:"btm-sentry4",type:"target",layer:0,x:8.10,y:8.6,r:.31},
  {id:"btm-deflect1",type:"wall",layer:0,x1:1.75,y1:6.55,x2:3.4,y2:7.2},
  {id:"btm-deflect2",type:"wall",layer:0,x1:7.1,y1:7.2,x2:8.65,y2:6.4},
  {id:"btm-deflect3",type:"wall",layer:0,x1:4.5,y1:11.65,x2:5.30,y2:12.15},
  {id:"btm-up",type:"ramp",layer:0,toLayer:1,x:2.6,y:7.85,toX:3.15,toY:3.82,r:.62,curve:-.55},
  {id:"btm-upper-node",type:"bumper",layer:1,x:4.05,y:5.7,r:.42},
  {id:"btm-upper-sentry1",type:"target",layer:1,x:6.9,y:3.3,r:.28},
  {id:"btm-upper-sentry2",type:"target",layer:1,x:5.9,y:7.75,r:.28},
  {id:"btm-down",type:"ramp",layer:1,toLayer:0,x:7.35,y:8.72,toX:7.15,toY:10.75,r:.65,curve:.8}
];
const arclightParts=[
  {id:"arc-reactor1",type:"bumper",layer:0,x:4.02,y:4.45,r:.47},
  {id:"arc-reactor2",type:"bumper",layer:0,x:5.4,y:3.3,r:.53},
  {id:"arc-reactor3",type:"bumper",layer:0,x:6.77,y:4.45,r:.47},
  {id:"arc-reactor4",type:"bumper",layer:0,x:5.4,y:6.0,r:.41},
  {id:"arc-beacon1",type:"target",layer:0,x:2.05,y:9.10,r:.28},
  {id:"arc-beacon2",type:"target",layer:0,x:3.68,y:10.15,r:.28},
  {id:"arc-beacon3",type:"target",layer:0,x:6.67,y:10.15,r:.28},
  {id:"arc-beacon4",type:"target",layer:0,x:8.12,y:9.10,r:.28},
  {id:"arc-guide1",type:"wall",layer:0,x1:1.35,y1:7.0,x2:2.5,y2:7.45},
  {id:"arc-guide2",type:"wall",layer:0,x1:7.92,y1:7.45,x2:8.88,y2:6.95},
  {id:"arc-up",type:"ramp",layer:0,toLayer:1,x:7.95,y:7.48,toX:6.9,toY:4.2,r:.60,curve:-.92},
  {id:"arc-deck-b1",type:"bumper",layer:1,x:3.70,y:5.7,r:.40},
  {id:"arc-deck-b2",type:"bumper",layer:1,x:6.10,y:6.55,r:.38},
  {id:"arc-deck-beacon1",type:"target",layer:1,x:5.3,y:3.2,r:.27},
  {id:"arc-deck-beacon2",type:"target",layer:1,x:5.25,y:8.25,r:.27},
  {id:"arc-down",type:"ramp",layer:1,toLayer:0,x:3.25,y:8.67,toX:3.2,toY:11.1,r:.62,curve:.55}
];
const lab={
  id:"lab",title:"PHIBALL LAB",
  subtitle:"A chrome physics laboratory with a triangular bumper cluster.",
  accent:"#72edff",
  objects:labParts,
  quests:[
    {id:"lab-bump",label:"Wake the pop bumpers",kind:"bumperHits",goal:6},
    {id:"lab-target",label:"Calibrate three targets",kind:"targetHits",goal:3},
    {id:"lab-ramp",label:"Test the upper playfield",kind:"rampRuns",goal:1}
  ],
  mode:{
    id:"quantum-combo",label:"QUANTUM COMBO",description:"Chain five bumper hits to power a 12-second bumper multiplier.",
    triggerKind:"bumperHits",threshold:5,bonusKind:"bumperHits",
    multiplier:2,duration:12
  }
};
const btm={
  id:"btm",title:"SYSTEM BREACH",
  subtitle:"Asymmetric defenses, four sentries, and a guarded upper sector.",
  accent:"#ff6b7d",
  objects:breachParts,
  quests:[
    {id:"btm-nodes",label:"Disrupt six security nodes",kind:"bumperHits",goal:6},
    {id:"btm-sentries",label:"Disable four sentries",kind:"targetHits",goal:4},
    {id:"btm-access",label:"Infiltrate upper sector",kind:"rampRuns",goal:1}
  ],
  mode:{
    id:"security-breach",label:"SECURITY BREACH",description:"Tag three sentries to open a 15-second target jackpot window.",
    triggerKind:"targetHits",threshold:3,bonusKind:"targetHits",
    multiplier:3,duration:15
  }
};
const arclight={
  id:"arclight",title:"ARCLIGHT 3333",
  subtitle:"Reactor core, navigation beacons, and a starboard ascent ramp.",
  accent:"#e7bcff",
  objects:arclightParts,
  quests:[
    {id:"arc-reactor",label:"Charge the reactor coils",kind:"bumperHits",goal:9},
    {id:"arc-decks",label:"Traverse the upper deck twice",kind:"rampRuns",goal:2},
    {id:"arc-beacons",label:"Activate navigation beacons",kind:"targetHits",goal:5}
  ],
  mode:{
    id:"reactor-overdrive",label:"REACTOR OVERDRIVE",description:"Complete two upper-deck ascents for 18 seconds of boosted reactor scoring.",
    triggerKind:"rampRuns",threshold:2,bonusKind:"bumperHits",
    multiplier:3,duration:18
  }
};
export const PRESETS=[lab,btm,arclight];
export function findPreset(id){
  return copyTable(PRESETS.find(t=>t.id===id)||lab);
}
