import {WIDTH,HEIGHT,BALL_RADIUS} from "./tables.js";
import {LOWER_RAILS,UPPER_RAILS,SLINGSHOTS,DRAIN_ZONES} from "./geometry.js";
import {drawSprite} from "./sprites.js";
import {makeRampTrack,DECK_Z} from "./rampGeometry.js";
import {modeActive,modeRemaining} from "./modes.js";
import {questStatus} from "./quests.js";

const SCALE=50;
const PI=Math.PI;
const cachedTracks=new WeakMap();
function trackFor(part){
  if(!cachedTracks.has(part))cachedTracks.set(part,makeRampTrack(part));
  return cachedTracks.get(part);
}
function line(ctx,x1,y1,x2,y2,color="#7f9eb6",size=.1){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
  ctx.lineCap="round";ctx.strokeStyle=color;ctx.lineWidth=size;ctx.stroke();
}
function circle(ctx,x,y,r,color,stroke=null,w=.05){
  ctx.beginPath();ctx.arc(x,y,r,0,2*PI);
  ctx.fillStyle=color;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}
}
function chromeRail(ctx,x1,y1,x2,y2,accent=false){
  line(ctx,x1+.045,y1+.06,x2+.045,y2+.06,"#020818a6",.19);
  line(ctx,x1,y1,x2,y2,"#243e59",.17);
  line(ctx,x1,y1,x2,y2,accent?"#7fdcf8":"#92acbc",.105);
  line(ctx,x1-.013,y1-.015,x2-.013,y2-.015,"#e9f7ff",.028);
}
function signatureArtwork(ctx,table){
  // Original table-specific screen printing. No collision surfaces or copied art.
  ctx.save();
  ctx.globalAlpha=.29;
  ctx.lineWidth=.045;ctx.strokeStyle=table.accent;ctx.fillStyle=table.accent;
  if(table.id==="lab"){
    for(const r of [1.2,1.85,2.5]){
      ctx.beginPath();ctx.arc(5.25,6.9,r,0,Math.PI*2);ctx.stroke();
    }
    for(const [x,y] of [[2,7.7],[8.5,7.7],[5.25,3.1]]){
      circle(ctx,x,y,.13,table.accent);
      line(ctx,x,y,5.25,6.9,table.accent,.02);
    }
    ctx.font="bold .26px monospace";ctx.textAlign="center";
    ctx.fillText("LAB / 369",5.25,7);
  }else if(table.id==="btm"){
    ctx.setLineDash([.15,.20]);
    for(let i=0;i<5;i++){
      const yy=3+i*1.6;
      line(ctx,1.3,yy,4.1,yy,table.accent,.06);
      line(ctx,6.4,yy,9.0,yy,table.accent,.06);
    }
    ctx.setLineDash([]);
    for(let i=0;i<6;i++){
      const x=2+i*1.25;
      ctx.strokeRect(x,7.0,.45,.45);
    }
    ctx.textAlign="center";ctx.font="bold .24px monospace";
    ctx.fillText("SECURITY GRID / 04",5.25,8.15);
  }else if(table.id==="arclight"){
    ctx.beginPath();ctx.ellipse(5.3,5.1,3.1,1.85,-.25,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(5.3,5.1,2.1,1.12,-.25,0,Math.PI*2);ctx.stroke();
    for(const a of [0,Math.PI*.67,Math.PI*1.33]){
      const x=5.3+3*Math.cos(a),y=5.1+1.65*Math.sin(a);
      circle(ctx,x,y,.12,table.accent);
    }
    ctx.font="bold .25px monospace";ctx.textAlign="center";
    ctx.fillText("REACTOR · DECK 33",5.2,7.35);
  }
  ctx.restore();
}
function background(ctx,table,game){
  const sky=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
  sky.addColorStop(0,"#203554");sky.addColorStop(.43,"#102138");
  sky.addColorStop(.78,"#121c34");sky.addColorStop(1,"#080e21");
  ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
  const vignette=ctx.createRadialGradient(5.25,7,1,5.25,7,10);
  vignette.addColorStop(0,"#6db3c00e");vignette.addColorStop(1,"#000713a9");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.strokeStyle="#80b5ea12";ctx.lineWidth=.014;
  for(let i=1;i<21;i++){line(ctx,i*.5,0,i*.5,HEIGHT,"#8ab8dc10",.014);}
  for(let i=1;i<35;i++){line(ctx,0,i*.5,WIDTH,i*.5,"#8ab8dc10",.014);}
  signatureArtwork(ctx,table);
  // Screen-printed original playfield details, separate from mechanical parts.
  ctx.save();ctx.globalAlpha=.18;
  ctx.strokeStyle=table.accent;ctx.lineWidth=.038;
  ctx.beginPath();ctx.ellipse(5.2,7.8,3.2,2.45,.15,0,2*PI);ctx.stroke();
  ctx.beginPath();ctx.ellipse(5.2,7.8,2.6,1.85,.15,0,2*PI);ctx.stroke();
  const branding={
    lab:["Φ BALL","THE PHYSICS ARCADE"],
    btm:["SYSTEM BREACH","NO GODS IN THE MACHINE"],
    arclight:["ARCLIGHT 3333","STARSHIP DECKS · ACTIVE"],
    custom:["CUSTOM TABLE","BUILT IN THE WORKSHOP"]
  }[table.id]??["CUSTOM TABLE","BUILT IN THE WORKSHOP"];
  ctx.font="900 .91px system-ui";ctx.fillStyle=table.accent;
  ctx.textAlign="center";ctx.fillText(branding[0],5.2,9.0,7.5);
  ctx.font="bold .25px monospace";ctx.fillText(branding[1],5.2,9.5,7.4);
  ctx.restore();
  // Gameplay-triggered lamp sequences sit on the playfield artwork only.
  const cue=game.lastEffect;
  const flash=cue?Math.max(0,1-(game.elapsed-cue.at)/.68):0;
  for(let i=0;i<12;i++){
    const x=1.2+i%6*1.55,y=i<6?11.45:12.12;
    const cadence=(Math.sin(game.elapsed*4+i*.64)+1)*.5;
    const selected=cue?.sequence===undefined?false:(i+cue.sequence)%4===0;
    const lit=Math.max(.21,cadence*.55,selected?flash:0);
    const color=(i%3===0?"#ffc57f":table.accent);
    circle(ctx,x,y,.13,"#101c30","#99b4c8",.033);
    if(lit>.65){
      ctx.save();ctx.shadowColor=color;ctx.shadowBlur=8;
      circle(ctx,x,y,.10,color);
      ctx.restore();
    }else circle(ctx,x,y,.07,color);
    circle(ctx,x,y,.09,"#ffffff"+Math.round(Math.min(.5,lit*.5)*255).toString(16).padStart(2,"0"));
  }
  if(flash>0){
    ctx.save();
    ctx.globalAlpha=Math.min(.45,flash*.40);
    ctx.strokeStyle=table.accent;ctx.lineWidth=.10;
    ctx.strokeRect(.24,.3,10,16.85);
    ctx.restore();
  }
  ctx.strokeStyle="#e6fbff66";ctx.lineWidth=.08;
  ctx.strokeRect(.20,.26,10.1,16.98);
  ctx.strokeStyle="#070b16";ctx.lineWidth=.13;
  ctx.strokeRect(.26,.30,9.98,16.85);
  if(game.tilted){
    ctx.fillStyle="#ff4a5f1a";ctx.fillRect(0,0,WIDTH,HEIGHT);
  }
  if(modeActive(game.modeState,game.elapsed)){
    const alpha=.13+.07*(1+Math.sin(game.elapsed*11))*.5;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=table.accent;ctx.lineWidth=.17;
    ctx.strokeRect(.24,.32,10.0,16.80);
    ctx.restore();
  }
}
function rails(ctx){
  for(const r of LOWER_RAILS)chromeRail(ctx,...r);
  // Genuine-looking fasteners along the outside rail guides.
  for(const [x,y] of [[.37,.75],[10.13,.75],[.37,12.4],[10.13,12.4],[9.25,5.1],[9.25,14.5]]){
    circle(ctx,x,y,.13,"#b0c9d8","#234259",.06);
    circle(ctx,x-.036,y-.036,.033,"#ffffffb8");
  }
  ctx.fillStyle="#081629";ctx.fillRect(9.37,14.72,.49,2.04);
  const plunger=ctx.createLinearGradient(9.4,0,9.85,0);
  plunger.addColorStop(0,"#203956");plunger.addColorStop(.5,"#bad5e9");
  plunger.addColorStop(1,"#304c65");
  ctx.fillStyle=plunger;ctx.fillRect(9.49,15.15,.18,1.37);
  ctx.fillStyle="#bddbe9";ctx.font="bold .19px monospace";
  ctx.textAlign="center";ctx.fillText("PLUNGER",9.64,14.5);
}
function upperDeck(ctx){
  const g=ctx.createLinearGradient(2,2,8,10);
  g.addColorStop(0,"#a2eafa2c");g.addColorStop(.5,"#2b58782c");g.addColorStop(1,"#91dffa1a");
  ctx.fillStyle=g;ctx.fillRect(2,2.05,6.6,7.95);
  ctx.strokeStyle="#ddfbff88";ctx.lineWidth=.05;
  ctx.setLineDash([.10,.12]);ctx.strokeRect(2,2.05,6.6,7.95);ctx.setLineDash([]);
  for(const r of UPPER_RAILS)chromeRail(ctx,...r,true);
  ctx.fillStyle="#e1f9ff";ctx.font="bold .23px monospace";
  ctx.fillText("UPPER DECK / L2",2.42,2.49);
  for(const [x,y] of [[2,2.05],[8.6,2.05],[2,10],[8.6,10]])
    circle(ctx,x,y,.15,"#d3edff","#31597d",.05);
}
function bounceFlash(game,layer,id){
  const t=game.lastHit?.get(layer+"-"+id);
  if(t===undefined)return 0;
  return Math.max(0,1-(game.elapsed-t)/.25);
}
function drawRaisedRamp(ctx,part,table){
  const track=trackFor(part),nodes=track.nodes;
  const left=[],right=[];
  for(let i=0;i<nodes.length;i++){
    const p=nodes[i],prev=nodes[Math.max(0,i-1)],
      next=nodes[Math.min(nodes.length-1,i+1)];
    const dx=next.x-prev.x,dy=next.y-prev.y;
    const len=Math.max(.001,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len;
    const half=.27;
    left.push({x:p.x+nx*half,y:p.y+ny*half,z:p.z});
    right.push({x:p.x-nx*half,y:p.y-ny*half,z:p.z});
  }
  // Vertical supports make elevation physically legible in the top-down view.
  ctx.save();
  for(const i of [10,30,50,70]){
    const p=nodes[i];
    if(p.z<.2)continue;
    line(ctx,p.x,p.y,p.x,p.y+p.z*.20,"#092035",.20);
    line(ctx,p.x-.035,p.y,p.x-.035,p.y+p.z*.20,"#b9e4f8",.035);
    circle(ctx,p.x,p.y,.13,"#102337","#91a9c4",.035);
  }
  // Cast a soft displacement shadow. The actual rails stay directly above
  // their X/Y collision centerline, so overhead art remains accurate.
  ctx.beginPath();
  nodes.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y+p.z*.20):ctx.lineTo(p.x,p.y+p.z*.20));
  ctx.strokeStyle="#000a1f80";ctx.lineWidth=.72;ctx.stroke();
  ctx.beginPath();
  left.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y);
  ctx.closePath();
  ctx.fillStyle="#0c2945b5";ctx.fill();
  ctx.strokeStyle=table.accent+"55";ctx.lineWidth=.045;ctx.stroke();
  for(const rail of [left,right]){
    ctx.beginPath();
    rail.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle="#08192c";ctx.lineWidth=.14;ctx.stroke();
    ctx.strokeStyle="#b8ddef";ctx.lineWidth=.08;ctx.stroke();
    ctx.strokeStyle="#f3ffff";ctx.lineWidth=.018;ctx.stroke();
  }
  ctx.beginPath();
  nodes.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.setLineDash([.10,.16]);ctx.strokeStyle=table.accent+"bb";
  ctx.lineWidth=.035;ctx.stroke();ctx.setLineDash([]);
  const r=part.r;
  circle(ctx,part.x,part.y,r+.10,table.accent+"2b");
  if(!drawSprite(ctx,"ramp",part.x-r,part.y-r,r*2,r*2))
    circle(ctx,part.x,part.y,r,"#264b65",table.accent,.07);
  ctx.fillStyle="#ffffff";ctx.textAlign="center";ctx.font="bold .19px monospace";
  ctx.fillText(part.toLayer===1?"UP":"DN",part.x,part.y+r*.70);
  const end=nodes[nodes.length-1];
  circle(ctx,end.x,end.y,.16,table.accent,"#e5fcff",.035);
  ctx.restore();
}
function pieces(ctx,table,layer,game,opacity=1){
  ctx.save();ctx.globalAlpha=opacity;
  if(layer===1)upperDeck(ctx);
  for(const part of table.objects.filter(o=>o.layer===layer)){
    if(part.type==="wall"){
      chromeRail(ctx,part.x1,part.y1,part.x2,part.y2);
    } else if(part.type==="bumper"){
      const f=bounceFlash(game,layer,part.id);
      circle(ctx,part.x,part.y,part.r+.25,table.accent+(f>0?"88":"16"));
      if(!drawSprite(ctx,"bumper",part.x-part.r*1.55,part.y-part.r*1.55,part.r*3.1,part.r*3.1)){
        circle(ctx,part.x,part.y,part.r,"#376b86",table.accent,.1);
      }
      if(f>0)circle(ctx,part.x,part.y,part.r*.8,"#ecffff"+Math.round(f*55).toString(16).padStart(2,"0"));
    } else if(part.type==="target"){
      const f=bounceFlash(game,layer,part.id),radius=part.r*1.8;
      if(f>0)circle(ctx,part.x,part.y,radius,"#fda4b780");
      if(!drawSprite(ctx,"target",part.x-radius,part.y-radius,radius*2,radius*2))
        circle(ctx,part.x,part.y,part.r,"#d65173","#fff",.05);
    } else if(part.type==="ramp"){
      drawRaisedRamp(ctx,part,table);

    }
  }
  // Only highlight a stage's exact physical target. The next stage stays
  // visually locked until its predecessor is completed.
  for(const quest of game.ledger.quests){
    const status=questStatus(game.ledger,quest);
    if(!status.staged||status.completed||!status.partId)continue;
    const part=table.objects.find(p=>p.id===status.partId&&p.layer===layer);
    if(!part)continue;
    const phase=(Math.sin(game.elapsed*6)+1)/2;
    const radius=(part.r??.44)+.31+phase*.09;
    ctx.save();
    ctx.strokeStyle=table.accent;ctx.lineWidth=.055;
    ctx.setLineDash([.13,.10]);
    ctx.beginPath();ctx.arc(part.x,part.y,radius,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle="#e9ffff";ctx.font="bold .18px monospace";
    ctx.textAlign="center";
    ctx.fillText("MISSION "+(status.stageIndex+1),part.x,part.y-radius-.14);
    ctx.restore();
  }
  ctx.restore();
}
function slings(ctx,table,game){
  for(const sling of SLINGSHOTS){
    const flash=bounceFlash(game,0,sling.id);
    ctx.save();ctx.translate(sling.x,sling.y);
    if(sling.side==="right")ctx.scale(-1,1);
    if(flash>0)circle(ctx,0,0,1.02,table.accent+"66");
    if(!drawSprite(ctx,"sling",-1.01,-.73,2.05,1.47)){
      ctx.beginPath();ctx.moveTo(-.78,-.32);ctx.lineTo(.77,.2);ctx.lineTo(-.58,.44);
      ctx.closePath();ctx.fillStyle="#41688b";ctx.fill();
    }
    ctx.restore();
  }
}
function flippers(ctx,game){
  for(const flipper of game.scenes[0].flippers){
    const p=flipper.body.getPosition();
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(flipper.body.getAngle());
    if(!flipper.left)ctx.scale(-1,1);
    const name=flipper.left?"flipperLeft":"flipperRight";
    if(!drawSprite(ctx,name,-.24,-.36,2.22,.73)){
      line(ctx,0,0,1.82,0,flipper.left?"#f7788a":"#80dafa",.30);
      circle(ctx,0,0,.21,"#c9e9ff");
    }
    ctx.restore();
  }
}
function shooter(ctx,game){
  if(game.status==="ready"&&game.charge>0){
    const fill=Math.min(1,game.charge);
    ctx.fillStyle="#122841";ctx.fillRect(9.41,15.12,.31,1.5);
    ctx.fillStyle=fill>.8?"#ffc07b":"#75efff";
    ctx.fillRect(9.41,16.62-1.5*fill,.31,1.5*fill);
  }
  if(game.tilted){
    ctx.textAlign="center";ctx.font="900 .70px system-ui";
    ctx.fillStyle="#ff6077";ctx.fillText("TILT",5.22,12.8);
  }
}
function ball(ctx,game){
  const moving=game.rampMotion;
  if(!game.ball&&!moving)return;
  const p=moving?moving.point:game.ball.getPosition();
  const z=moving?p.z:DECK_Z[game.layer];
  // Top-down ball center always matches actual solver XY. Height is conveyed
  // by the displacement and spread of the shadow, not a false sprite offset.
  const shadowY=p.y+.15+z*.16;
  const shadow=ctx.createRadialGradient(p.x+.055,shadowY,.02,p.x+.055,shadowY,.37+z*.10);
  shadow.addColorStop(0,"#00070fb9");shadow.addColorStop(1,"#00070f00");
  circle(ctx,p.x+.055,shadowY,.37+z*.10,shadow);
  if(moving) {
    circle(ctx,p.x,p.y,.31,"#78f2ff28");
  }
  if(!drawSprite(ctx,"ball",p.x-.275,p.y-.275,.55,.55)){
    const g=ctx.createRadialGradient(p.x-.085,p.y-.085,.02,p.x,p.y,BALL_RADIUS);
    g.addColorStop(0,"#fff");g.addColorStop(.5,"#aac8db");g.addColorStop(1,"#162a40");
    circle(ctx,p.x,p.y,BALL_RADIUS,g,"#eafaff",.025);
  }
}

function modeBanner(ctx,game,table){
  if(!modeActive(game.modeState,game.elapsed))return;
  const remaining=modeRemaining(game.modeState,game.elapsed);
  ctx.save();ctx.textAlign="center";
  ctx.fillStyle="#051b31de";ctx.fillRect(2.65,12.20,5.25,.62);
  ctx.strokeStyle=table.accent;ctx.lineWidth=.035;
  ctx.strokeRect(2.65,12.20,5.25,.62);
  ctx.fillStyle="#f0fcff";ctx.font="bold .26px monospace";
  ctx.fillText(game.modeState.config.label+" · "+remaining.toFixed(1)+"s",5.25,12.60,4.95);
  ctx.restore();
}
function diagnostic(ctx,game){
  ctx.save();
  for(const zone of DRAIN_ZONES){
    ctx.fillStyle="#ff51642c";ctx.fillRect(zone.x,zone.y,zone.w,zone.h);
    ctx.strokeStyle="#ff748aa0";ctx.lineWidth=.028;
    ctx.strokeRect(zone.x,zone.y,zone.w,zone.h);
  }
  for(const sling of SLINGSHOTS){
    ctx.beginPath();
    sling.vertices.forEach(([x,y],i)=>{
      if(!i)ctx.moveTo(sling.x+x,sling.y+y);else ctx.lineTo(sling.x+x,sling.y+y);
    });
    ctx.closePath();ctx.lineWidth=.035;ctx.strokeStyle="#edff91";ctx.stroke();
  }
  if(game.rampMotion){
    const m=game.rampMotion,p=m.point;
    ctx.fillStyle="#fff";ctx.font="bold .22px monospace";ctx.textAlign="left";
    ctx.fillText("RAMP X "+p.x.toFixed(2)+" Y "+p.y.toFixed(2)+" Z "+p.z.toFixed(2),.6,16.83);
    ctx.fillText("TRACK "+Math.round(m.distance/m.track.totalLength*100)+"%  SPEED "+m.speed.toFixed(2),.6,17.15);
  }else if(game.ball){
    const p=game.ball.getPosition(),v=game.ball.getLinearVelocity();
    line(ctx,p.x,p.y,p.x+v.x*.14,p.y+v.y*.14,"#fff17e",.055);
    ctx.fillStyle="#fff";ctx.font="bold .23px monospace";ctx.textAlign="left";
    ctx.fillText("X "+p.x.toFixed(2)+"  Y "+p.y.toFixed(2),.6,16.85);
    ctx.fillText("SPEED "+v.length().toFixed(2)+" / STUCK "+game.stuckSeconds.toFixed(1),.6,17.20);
  }
  ctx.fillStyle="#ffe89c";ctx.font="bold .22px monospace";
  ctx.fillText("DEBUG COLLISION / DRAIN ZONES",.6,.53);
  ctx.restore();
}
export function drawPinball(ctx,game,table,editor=false,editLayer=0,pending=null,debug=false){
  if(!ctx||!game)return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.save();ctx.scale(SCALE,SCALE);
  background(ctx,table,game);rails(ctx);
  if(editor){
    pieces(ctx,table,0,game,editLayer===0?1:.25);
    slings(ctx,table,game);
    pieces(ctx,table,1,game,editLayer===1?1:.18);
    if(pending)circle(ctx,pending.x,pending.y,.18,"#fff3b2","#ffffff",.04);
  }else{
    pieces(ctx,table,0,game,1);
    slings(ctx,table,game);
    flippers(ctx,game);
    pieces(ctx,table,1,game,game.layer===1?1:.26);
    shooter(ctx,game);ball(ctx,game);
    modeBanner(ctx,game,table);
  }
  if(debug)diagnostic(ctx,game);
  ctx.restore();
}
