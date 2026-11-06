import {WIDTH, HEIGHT, BALL_RADIUS} from "./tables.js";

const SCALE=50;
const neon="#baf6ff";
function stroke(ctx,x1,y1,x2,y2,color="#6091b6",size=.10) {
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
  ctx.lineWidth=size;ctx.lineCap="round";ctx.strokeStyle=color;ctx.stroke();
}
function disk(ctx,x,y,r,fill,outline=null,thickness=.06) {
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();
  if(outline){ctx.strokeStyle=outline;ctx.lineWidth=thickness;ctx.stroke();}
}
function staticRails(ctx) {
  const segments=[
    [.37,.65,10.13,.65],[.37,.65,.37,16.25],[10.13,.65,10.13,16.93],
    [.37,16.25,2.6,15.5],[10.13,16.5,7.9,15.5],[9.25,3.12,9.25,16.8],
    [9.25,16.86,10.13,16.86],[1.15,13.13,3.23,14.22],
    [9.28,13.13,7.25,14.22],[.9,3.8,1.7,2.15],[8.7,2.15,9.22,3.2]
  ];
  for(const line of segments) {
    stroke(ctx,...line,"#365676",.16);stroke(ctx,...line,"#c6e5ff",.04);
  }
  ctx.fillStyle="#223755";ctx.fillRect(9.36,14.7,.60,2.05);
  ctx.fillStyle="#9ee8ff";ctx.font="bold .23px monospace";
  ctx.fillText("SHOOTER",9.24,14.43);
}
function background(ctx,accent) {
  const g=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
  g.addColorStop(0,"#102543");g.addColorStop(.5,"#0b132c");g.addColorStop(1,"#161831");
  ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.strokeStyle="rgba(144,188,236,.085)";ctx.lineWidth=.01;
  for(let x=.5;x<WIDTH;x+=.5)stroke(ctx,x,0,x,HEIGHT,"#314a6655",.012);
  for(let y=.5;y<HEIGHT;y+=.5)stroke(ctx,0,y,WIDTH,y,"#314a6655",.012);
  ctx.save();ctx.globalAlpha=.12;ctx.textAlign="center";
  ctx.font="bold 1.16px system-ui";ctx.fillStyle=accent;
  ctx.fillText("ΦBALL",5.15,8.9);ctx.restore();
}
function deck(ctx) {
  ctx.fillStyle="#4776a128";ctx.fillRect(2,2.05,6.6,7.95);
  ctx.setLineDash([.16,.14]);ctx.strokeStyle="#7ce6ff";
  ctx.lineWidth=.06;ctx.strokeRect(2,2.05,6.6,7.95);ctx.setLineDash([]);
  for(const seg of [[2,2.05,8.6,2.05],[2,2.05,2,10],[8.6,2.05,8.6,10],[2,10,8.6,10],[2.15,7.1,3.05,8.7],[7.6,7.45,8.2,8.95]]) stroke(ctx,...seg,"#82a6c7",.13);
  ctx.fillStyle="#d6efff";ctx.font="bold .25px monospace";
  ctx.fillText("DECK TWO · L2",2.36,2.50);
}
function pieces(ctx,table,layer,opacity=1) {
  ctx.save();ctx.globalAlpha=opacity;
  if(layer===1)deck(ctx);
  for(const p of table.objects.filter(part=>part.layer===layer)) {
    if(p.type==="wall") {
      stroke(ctx,p.x1,p.y1,p.x2,p.y2,"#366487",.18);
      stroke(ctx,p.x1,p.y1,p.x2,p.y2,"#e4f8ff",.045);
    } else if(p.type==="bumper") {
      disk(ctx,p.x,p.y,p.r+.16,"#36e6ff16");
      disk(ctx,p.x,p.y,p.r,"#123659",table.accent,.11);
      disk(ctx,p.x-.07,p.y-.09,p.r*.64,"#5d9fc2",neon,.055);
      disk(ctx,p.x-.13,p.y-.15,p.r*.17,"#efffff");
    } else if(p.type==="target") {
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);
      ctx.fillStyle="#cf5377";ctx.fillRect(-p.r*.86,-p.r*.86,p.r*1.72,p.r*1.72);
      ctx.strokeStyle="#ffe1ed";ctx.lineWidth=.06;
      ctx.strokeRect(-p.r*.86,-p.r*.86,p.r*1.72,p.r*1.72);ctx.restore();
    } else if(p.type==="ramp") {
      ctx.setLineDash([.14,.14]);
      stroke(ctx,p.x,p.y,p.toX,p.toY,"#9cdfff99",.09);ctx.setLineDash([]);
      disk(ctx,p.x,p.y,p.r,"#52abff24",table.accent,.095);
      disk(ctx,p.x,p.y,p.r*.53,"#1e4969","#e0faff",.065);
      ctx.fillStyle="#efffff";ctx.font="bold .24px monospace";ctx.textAlign="center";
      ctx.fillText(p.toLayer===1?"UP":"DN",p.x,p.y+.09);
    }
  }
  ctx.restore();
}
function flippers(ctx,game) {
  for(const f of game.scenes[0].flippers) {
    const position=f.body.getPosition(),direction=f.left?1:-1;
    ctx.save();ctx.translate(position.x,position.y);ctx.rotate(f.body.getAngle());
    stroke(ctx,0,0,direction*1.8,0,"#070f21",.43);
    stroke(ctx,0,0,direction*1.8,0,f.left?"#ff8192":"#74dbfa",.31);
    stroke(ctx,0,0,direction*1.8,0,"#efffff",.052);
    disk(ctx,0,0,.21,"#e9f5ff","#385c7d");ctx.restore();
  }
}
function shooterCharge(ctx,game) {
  if(game.status==="ready" && game.charge>0) {
    const fill=Math.min(1,game.charge);
    ctx.fillStyle="#142a46";ctx.fillRect(9.40,15.1,.30,1.5);
    ctx.fillStyle=fill>.8?"#ffb95e":"#69edfd";
    ctx.fillRect(9.40,16.6-1.5*fill,.30,1.5*fill);
  }
  if(game.tilted) {
    ctx.fillStyle="#ff5e77";ctx.font="bold .58px system-ui";
    ctx.textAlign="center";ctx.fillText("TILT",5.25,12.6);
  }
}
function ball(ctx,game) {
  if(!game.ball)return;
  const p=game.ball.getPosition();
  disk(ctx,p.x+.075,p.y+.11,BALL_RADIUS+.06,"#00000066");
  const g=ctx.createRadialGradient(p.x-.065,p.y-.065,.008,p.x,p.y,BALL_RADIUS);
  g.addColorStop(0,"#fff");g.addColorStop(.3,"#e0eeff");
  g.addColorStop(.72,"#71879d");g.addColorStop(1,"#28354f");
  disk(ctx,p.x,p.y,BALL_RADIUS,g,"#c8edff",.024);
}
export function drawPinball(ctx,game,table,editor=false,editLayer=0,pending=null) {
  if(!ctx || !game)return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.save();ctx.scale(SCALE,SCALE);
  background(ctx,table.accent);staticRails(ctx);
  if(editor) {
    pieces(ctx,table,0,editLayer===0?1:.25);
    pieces(ctx,table,1,editLayer===1?1:.16);
    if(pending)disk(ctx,pending.x,pending.y,.2,"#fff0bb","#fff",.045);
  }else {
    pieces(ctx,table,0,1);flippers(ctx,game);
    pieces(ctx,table,1,game.layer===1?1:.26);
    shooterCharge(ctx,game);
    ball(ctx,game);
  }
  ctx.restore();
}
