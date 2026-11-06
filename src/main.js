import "./styles.css";
import {PinballGame} from "./physics.js";
import {PRESETS,findPreset,WIDTH,HEIGHT,MAX_OBJECTS,copyTable} from "./tables.js";
import {normalizeTable} from "./validation.js";

const $ = id => document.getElementById(id);
const canvas=$("table"),ctx=canvas.getContext("2d");
const SCALE=50;
const key={left:false,right:false};
let table=findPreset("lab"),editor=false,editLayer=0,pending=null,history=[];
let notice="READY FOR LAUNCH";
const storageKey="phiball369-table-v1";
let stored=null;
try {const raw=localStorage.getItem(storageKey);if(raw)stored=normalizeTable(JSON.parse(raw));}catch(e){console.warn("Saved table unavailable",e);}
const select=$("preset");
for(const p of PRESETS) {
  const option=document.createElement("option");option.value=p.id;option.textContent=p.title;select.append(option);
}
if(stored) addCustomOption();
const game=new PinballGame(table,text=>{notice=text;});

function addCustomOption() {
  if(select.querySelector('option[value="custom"]'))return;
  const option=document.createElement("option");option.value="custom";option.textContent="MY WORKSHOP TABLE";
  select.append(option);
}
function selectTable(id) {
  if(id==="custom" && stored)table=copyTable(stored);
  else table=findPreset(id);
  pending=null;history=[];
  game.setTable(table);notice="READY FOR LAUNCH";
  refreshInfo();
}
select.addEventListener("change",()=>selectTable(select.value));

function refreshInfo() {
  $("machine-title").textContent=table.title;
  $("machine-subtitle").textContent=table.subtitle;
  document.documentElement.style.setProperty("--accent",table.accent);
  refreshHUD();
}
function refreshHUD() {
  $("score").textContent=String(game.score).padStart(7,"0");
  $("balls").textContent=String(game.balls).padStart(2,"0");
  $("live-layer").textContent=editor?(editLayer===0?"EDIT LOWER · L1":"EDIT UPPER · L2"):
    (game.layer===0?"LOWER · L1":"UPPER · L2");
  $("announcement").textContent=notice;
  $("play-state").textContent=editor?"✎ WORKSHOP":game.paused?"Ⅱ PAUSED":
    game.status==="playing"?"● BALL IN PLAY":game.status==="gameover"?"■ GAME OVER":"● READY";
  $("launch").disabled=editor||game.status!=="ready";
  $("touch-launch").disabled=editor||game.status!=="ready";
  $("pause").disabled=editor||game.status!=="playing";
  $("pause").textContent=game.paused?"RESUME":"PAUSE";
  const root=$("missions");root.replaceChildren();
  for(const quest of game.ledger.quests) {
    const done=game.ledger.completed.includes(quest.id);
    const count=Math.min(quest.goal,game.ledger.counts[quest.kind]||0);
    const line=document.createElement("div");line.className="mission"+(done?" complete":"");
    const text=document.createElement("span");text.textContent=(done?"✓ ":"○ ")+quest.label;
    const value=document.createElement("b");value.textContent=count+" / "+quest.goal;
    line.append(text,value);root.append(line);
  }
}
function setEdit(next) {
  editor=next;pending=null;
  $("builder").classList.toggle("hidden",!editor);
  $("toggle-edit").textContent=editor?"PLAY THIS TABLE":"ENTER BUILD MODE";
  $("toggle-edit").classList.toggle("active",editor);
  if(editor) {
    game.paused=true;notice="WORKSHOP · CLICK TO PLACE PARTS";
  } else {
    game.setTable(table);notice="READY FOR LAUNCH";
  }
  refreshHUD();
}
$("toggle-edit").addEventListener("click",()=>setEdit(!editor));
$("launch").addEventListener("click",()=>game.launch());
$("touch-launch").addEventListener("click",()=>game.launch());
$("pause").addEventListener("click",()=>game.togglePause());
$("restart").addEventListener("click",()=>{game.reset();notice="FRESH GAME · PRESS SPACE";});
function editLayerSelect(layer) {
  editLayer=layer;pending=null;
  $("layer0").classList.toggle("selected",layer===0);
  $("layer1").classList.toggle("selected",layer===1);
  updateHint();
}
$("layer0").addEventListener("click",()=>editLayerSelect(0));
$("layer1").addEventListener("click",()=>editLayerSelect(1));
function updateHint() {
  const tips={
    bumper:"Click to place a spring-loaded pop bumper.",
    target:"Click to place a scoring target.",
    wall:"Click the start and end points of a solid rail.",
    ramp:"Click the entrance, then the destination on the other layer.",
    erase:"Click near an existing part to erase it."
  };
  $("builder-hint").textContent=pending?
    (pending.type==="ramp"?"Now click the destination on the OTHER layer.":"Click the rail endpoint."):
    tips[$("tool").value];
}
$("tool").addEventListener("change",()=>{pending=null;updateHint();});
function remember() {history.push(copyTable(table.objects));if(history.length>40)history.shift();}
function persist() {
  table.id="custom";
  stored=normalizeTable(table);
  table=copyTable(stored);
  addCustomOption();select.value="custom";
  try {localStorage.setItem(storageKey,JSON.stringify(table));}
  catch(e) {notice="LOCAL STORAGE UNAVAILABLE · USE EXPORT";}
}
function editAt(x,y) {
  if(x<0.65||x>WIDTH-0.65||y<1||y>HEIGHT-1.1) return;
  const tool=$("tool").value;
  if(tool==="erase") {
    const index=table.objects.findIndex(o=>o.layer===editLayer&&
      (o.type==="wall"?
        segmentDistance(x,y,o.x1,o.y1,o.x2,o.y2)<0.4:
        Math.hypot(o.x-x,o.y-y)<0.6));
    if(index>=0){remember();table.objects.splice(index,1);persist();}
    return;
  }
  if(table.objects.length>=MAX_OBJECTS){notice="PART LIMIT REACHED";return;}
  const id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  if(tool==="wall"||tool==="ramp") {
    if(!pending) {
      pending={type:tool,x,y,layer:editLayer};
      if(tool==="ramp")editLayerSelect(1-editLayer);
      // Retain the pending entrance after switching layers.
      if(tool==="ramp")pending={type:tool,x,y,layer:1-editLayer};
      updateHint();return;
    }
    if(tool!==pending.type)return;
    if(tool==="ramp"&&editLayer===pending.layer){
      notice="RAMP DESTINATION MUST BE ON OTHER LEVEL";return;
    }
    remember();
    if(tool==="wall")table.objects.push({id,type:"wall",layer:editLayer,
      x1:pending.x,y1:pending.y,x2:x,y2:y});
    else table.objects.push({id,type:"ramp",layer:pending.layer,toLayer:editLayer,
      x:pending.x,y:pending.y,toX:x,toY:y,r:0.62});
    const returnLayer=pending.layer;pending=null;
    if(tool==="ramp")editLayerSelect(returnLayer);
  } else {
    remember();table.objects.push({id,type:tool,layer:editLayer,
      x,y,r:tool==="bumper"?0.44:0.3});
  }
  persist();updateHint();notice="TABLE UPDATED · EXPORT TO SHARE";
}
function segmentDistance(px,py,ax,ay,bx,by) {
  const dx=bx-ax,dy=by-ay,sq=dx*dx+dy*dy;
  const t=sq?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/sq)):0;
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
canvas.addEventListener("pointerdown",event=>{
  if(!editor)return;
  const r=canvas.getBoundingClientRect();
  editAt((event.clientX-r.left)*WIDTH/r.width,(event.clientY-r.top)*HEIGHT/r.height);
});
$("undo").addEventListener("click",()=>{
  if(!history.length)return;
  table.objects=history.pop();persist();notice="UNDID LAST PART";
});
$("clear").addEventListener("click",()=>{
  remember();table.objects=[];persist();notice="WORKSHOP PARTS CLEARED";
});
$("export-table").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(normalizeTable(table),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="phiball369-table.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("import-table").addEventListener("change",async(event)=>{
  const file=event.target.files?.[0];if(!file)return;
  try {
    if(file.size>1000000)throw new Error("File exceeds the 1MB import limit.");
    const parsed=normalizeTable(JSON.parse(await file.text()));
    table=parsed;history=[];pending=null;persist();
    game.setTable(table);game.paused=editor;
    refreshInfo();notice="TABLE IMPORTED SUCCESSFULLY";
  }catch(error){notice="IMPORT FAILED: "+error.message;}
  event.target.value="";
});
function handleKey(e,pressed) {
  if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;
  const k=e.key.toLowerCase();
  if(["arrowleft","arrowright"," ","a","d","n"].includes(k))e.preventDefault();
  if(k==="arrowleft"||k==="a")key.left=pressed;
  if(k==="arrowright"||k==="d")key.right=pressed;
  if(pressed&&!e.repeat&&!editor) {
    if(k===" ")game.launch();
    if(k==="n")game.nudge();
  }
}
window.addEventListener("keydown",e=>handleKey(e,true));
window.addEventListener("keyup",e=>handleKey(e,false));
window.addEventListener("blur",()=>{key.left=false;key.right=false;});
function flipperButton(id,which) {
  const b=$(id);
  b.addEventListener("pointerdown",e=>{e.preventDefault();key[which]=true;b.setPointerCapture(e.pointerId);});
  for(const evt of ["pointerup","pointercancel","lostpointercapture"])
    b.addEventListener(evt,()=>{key[which]=false;});
}
flipperButton("left-flip","left");flipperButton("right-flip","right");

function drawBoard() {
  const gradient=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
  gradient.addColorStop(0,"#101d38");gradient.addColorStop(0.55,"#0b1026");gradient.addColorStop(1,"#15142a");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.strokeStyle="rgba(105,155,221,0.10)";ctx.lineWidth=0.014;
  for(let x=0.5;x<WIDTH;x+=0.5){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
  for(let y=0.5;y<HEIGHT;y+=0.5){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
  ctx.save();ctx.globalAlpha=0.11;ctx.fillStyle=table.accent;ctx.font="bold 1.05px system-ui";
  ctx.textAlign="center";ctx.fillText("ΦBALL",5.15,8.8);ctx.restore();
}
function line(x1,y1,x2,y2,color="#4e80b3",width=0.1) {
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=width;
  ctx.lineCap="round";ctx.strokeStyle=color;ctx.stroke();
}
function circle(x,y,r,fill,stroke,lineWidth=0.07) {
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function drawFixedRails() {
  const steel="#4e789e",shine="#a9d2ed";
  const segments=[
    [.37,.65,10.13,.65],[.37,.65,.37,16.25],[10.13,.65,10.13,16.93],
    [.37,16.25,2.6,15.5],[10.13,16.5,7.9,15.5],[9.25,3.12,9.25,16.8],
    [9.25,16.86,10.13,16.86],[1.15,13.13,3.23,14.22],[9.28,13.13,7.25,14.22],
    [.9,3.8,1.7,2.15],[8.7,2.15,9.22,3.2]
  ];
  for(const s of segments){line(...s,steel,0.13);line(...s,shine,0.035);}
  // Plunger assembly
  ctx.fillStyle="#263655";ctx.fillRect(9.38,14.8,.51,1.9);
  line(9.65,15.9,9.65,16.7,table.accent,.1);
  ctx.font="bold .25px system-ui";ctx.fillStyle="#91aaca";ctx.fillText("SHOOT",9.42,14.65);
}
function drawLayer(layer,opacity=1) {
  ctx.save();ctx.globalAlpha=opacity;
  if(layer===1){
    ctx.fillStyle="rgba(65,101,153,.23)";ctx.fillRect(2,2.05,6.6,7.95);
    ctx.setLineDash([.2,.15]);ctx.strokeStyle=table.accent;ctx.lineWidth=.09;
    ctx.strokeRect(2,2.05,6.6,7.95);ctx.setLineDash([]);
    line(2,2.05,8.6,2.05,"#7aa3c2",.14);line(2,2.05,2,10,"#7aa3c2",.14);
    line(8.6,2.05,8.6,10,"#7aa3c2",.14);line(2,10,8.6,10,"#7aa3c2",.14);
    line(2.15,7.1,3.05,8.7,"#7aa3c2",.13);line(7.6,7.45,8.2,8.95,"#7aa3c2",.13);
    ctx.font="bold .32px system-ui";ctx.fillStyle="#d1e5fa";
    ctx.fillText("UPPER PLAYFIELD · L2",3.2,2.52);
  }
  for(const part of table.objects.filter(p=>p.layer===layer)) {
    if(part.type==="wall") {
      line(part.x1,part.y1,part.x2,part.y2,"#386384",.19);
      line(part.x1,part.y1,part.x2,part.y2,"#bee3fb",.055);
    } else if(part.type==="ramp") {
      circle(part.x,part.y,part.r,"rgba(72,175,255,.16)",table.accent,.10);
      circle(part.x,part.y,part.r*.5,"#1c3e5c","#daf9ff",.08);
      ctx.fillStyle="#e8faff";ctx.font="bold .30px system-ui";ctx.textAlign="center";
      ctx.fillText(part.toLayer===1?"UP":"DN",part.x,part.y+.105);
      ctx.setLineDash([.12,.12]);line(part.x,part.y,part.toX,part.toY,"rgba(155,236,255,.36)",.06);
      ctx.setLineDash([]);
    } else if(part.type==="bumper") {
      circle(part.x,part.y,part.r+.13,"rgba(82,209,255,.09)");
      circle(part.x,part.y,part.r,"#0b2143",table.accent,.14);
      circle(part.x-.08,part.y-.11,part.r*.57,"#67a8cd","#cbf7ff",.06);
      circle(part.x-.14,part.y-.19,part.r*.17,"#f3ffff");
    } else if(part.type==="target") {
      ctx.save();ctx.translate(part.x,part.y);ctx.rotate(Math.PI/4);
      ctx.fillStyle="#c14c68";ctx.fillRect(-part.r*.8,-part.r*.8,part.r*1.6,part.r*1.6);
      ctx.strokeStyle="#ffe2e8";ctx.lineWidth=.065;ctx.strokeRect(-part.r*.8,-part.r*.8,part.r*1.6,part.r*1.6);
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawFlippers() {
  for(const f of game.scenes[0].flippers) {
    const p=f.body.getPosition(),a=f.body.getAngle(),dir=f.left?1:-1;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
    line(0,0,dir*1.8,0,"#10162b",.46);
    line(0,0,dir*1.8,0,f.left?"#f07e80":"#74d5f5",.32);
    line(0,0,dir*1.8,0,"#ffffff",.055);
    circle(0,0,.22,"#ecf7ff","#34536f");
    ctx.restore();
  }
}
function drawBall() {
  if(!game.ball)return;
  const p=game.ball.getPosition();
  circle(p.x+.075,p.y+.1,BALL_RADIUS+0.06,"rgba(0,0,0,.45)");
  const grad=ctx.createRadialGradient(p.x-.07,p.y-.07,.015,p.x,p.y,BALL_RADIUS);
  grad.addColorStop(0,"#ffffff");grad.addColorStop(.34,"#d8e7f5");
  grad.addColorStop(.7,"#6c859b");grad.addColorStop(1,"#1a263f");
  circle(p.x,p.y,BALL_RADIUS,grad,"#bfeaff",.025);
}
function render() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.scale(SCALE,SCALE);
  drawBoard();drawFixedRails();
  if(editor) {
    if(editLayer===0){drawLayer(0,1);drawLayer(1,0.18);}
    else{drawLayer(0,0.3);drawLayer(1,1);}
    if(pending)circle(pending.x,pending.y,.18,"#f8e9aa","#ffffff");
  } else {
    drawLayer(0,1);
    drawFlippers();
    drawLayer(1,game.layer===1?1:0.27);
    drawBall();
  }
  ctx.restore();
}
let last=performance.now();
function frame(now) {
  const dt=(now-last)/1000;last=now;
  if(!editor)game.stepFrame(dt,key);
  render();refreshHUD();requestAnimationFrame(frame);
}
refreshInfo();updateHint();requestAnimationFrame(frame);
