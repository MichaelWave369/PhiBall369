import * as pl from "planck";
import {WIDTH,HEIGHT,BALL_RADIUS} from "./tables.js";
import {newQuestLedger,recordQuestEvent} from "./quests.js";

const V = pl.Vec2;
const STEP = 1/120;
// The launcher stores a normalized spring compression. Calibration to real
// cabinet dimensions remains future work, but every launch is deterministic.
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
function edge(world,x1,y1,x2,y2) {
  if (Math.hypot(x2-x1,y2-y1) < 0.06) return;
  const b = world.createBody();
  b.createFixture(new pl.Edge(V(x1,y1),V(x2,y2)),{friction:0.28,restitution:0.73});
}
function rails(world,layer) {
  if (layer === 0) {
    edge(world,0.37,0.65,WIDTH-0.37,0.65);
    edge(world,0.37,0.65,0.37,16.25);
    edge(world,10.13,0.65,10.13,16.93);
    edge(world,0.37,16.25,2.6,15.5);
    edge(world,10.13,16.5,7.9,15.5);
    edge(world,9.25,3.12,9.25,16.80);
    edge(world,9.25,16.86,10.13,16.86);
    edge(world,1.15,13.13,3.23,14.22);
    edge(world,9.28,13.13,7.25,14.22);
    edge(world,0.9,3.8,1.7,2.15);
    edge(world,8.7,2.15,9.22,3.2);
  } else {
    edge(world,2.0,2.05,8.6,2.05);
    edge(world,2.0,2.05,2.0,10.0);
    edge(world,8.6,2.05,8.6,10.0);
    edge(world,2.0,10.0,8.6,10.0);
    edge(world,2.15,7.1,3.05,8.7);
    edge(world,7.6,7.45,8.2,8.95);
  }
}
function addFlipper(world,side) {
  const left=side==="left";
  const x=left?2.68:7.82,y=15.55;
  const b=world.createDynamicBody({position:V(x,y),angularDamping:1.1});
  b.createFixture(new pl.Box(0.91,0.16,V(left?0.91:-0.91,0),0),{
    density:6,friction:0.65,restitution:0.5
  });
  const hinge=world.createJoint(new pl.RevoluteJoint({
    enableMotor:true,maxMotorTorque:850,enableLimit:true,motorSpeed:0,
    lowerAngle:left?-0.76:0,upperAngle:left?0:0.76
  },world.createBody(),b,V(x,y)));
  return {body:b,hinge,left};
}
function addPart(world,part) {
  if (part.type==="ramp") return;
  if (part.type==="wall") {
    edge(world,part.x1,part.y1,part.x2,part.y2); return;
  }
  const b=world.createBody({position:V(part.x,part.y)});
  b.createFixture(new pl.Circle(part.r),{
    friction:0.2,restitution:part.type==="bumper"?0.95:0.65,
    userData:{kind:part.type,id:part.id,x:part.x,y:part.y}
  });
}
function makeScene(layer,table,onHit) {
  const world=new pl.World({gravity:V(0,5.1)});
  rails(world,layer);
  for (const part of table.objects.filter(o=>o.layer===layer)) addPart(world,part);
  const flippers=layer===0?[addFlipper(world,"left"),addFlipper(world,"right")]:[];
  world.on("begin-contact",contact=>{
    for (const fixture of [contact.getFixtureA(),contact.getFixtureB()]) {
      const data=fixture.getUserData();
      if (data && (data.kind==="bumper" || data.kind==="target")) onHit(layer,data);
    }
  });
  return {world,flippers};
}
function addBall(world,x,y) {
  const body=world.createDynamicBody({
    position:V(x,y),bullet:true,linearDamping:0.055,angularDamping:0.65
  });
  body.createFixture(new pl.Circle(BALL_RADIUS),{density:3.2,friction:0.17,restitution:0.67});
  return body;
}

export class PinballGame {
  constructor(table,onEvent=()=>{}) {this.onEvent=onEvent;this.setTable(table);}
  setTable(table) {
    // Drop the previous scene before rebuilding; a body cannot be destroyed in a different world.
    this.ball=null;
    this.layer=0;
    this.table=table;
    this.pendingHits=[];
    this.scenes=[0,1].map(layer=>makeScene(layer,table,(l,d)=>this.pendingHits.push({layer:l,...d})));
    this.reset();
  }
  reset() {
    if (this.ball && this.scenes[this.layer]) this.scenes[this.layer].world.destroyBody(this.ball);
    this.score=0; this.balls=3;this.layer=0;this.status="ready";this.paused=false;
    this.charging=false;this.charge=0;this.launchStrength=0;this.skillShotClaimed=false;
    this.tiltMeter=0;this.tilted=false;
    this.accumulator=0;this.elapsed=0;this.lastRamp=-10;this.lastNudge=-10;
    this.upperTime=0;this.lastHit=new Map();this.ledger=newQuestLedger(this.table.quests);
    this.ball=addBall(this.scenes[0].world,9.7,15.85);
    this.pendingHits.length=0;
  }
  beginCharge() {
    if(this.paused || this.status!=="ready" || this.charging)return false;
    this.charging=true;
    this.onEvent("CHARGING PLUNGER · RELEASE TO LAUNCH");
    return true;
  }
  cancelCharge() {this.charging=false;this.charge=0;}
  releaseCharge() {
    if(this.paused || this.status!=="ready" || !this.charging)return false;
    const strength=Math.max(.15,this.charge);
    return this.launch(strength);
  }
  launch(strength=.56) {
    if (this.paused || this.status!=="ready") return false;
    const power=clamp(Number.isFinite(strength)?strength:.56,.15,1);
    this.charge=0;this.charging=false;this.launchStrength=power;
    this.skillShotClaimed=false;this.status="playing";
    // Shooter starts in its own gated right-hand channel.
    this.ball.setLinearVelocity(V(-.05,-(12.3+9.5*power)));
    this.onEvent(power>=.85?"FULL POWER LAUNCH!":"BALL LAUNCHED · "+Math.round(power*100)+"% POWER");
    return true;
  }
  togglePause() { if (this.status==="playing") this.paused=!this.paused;return this.paused; }
  nudge() {
    if (this.status!=="playing"||this.paused||this.tilted||this.elapsed-this.lastNudge<.45) return false;
    this.lastNudge=this.elapsed;
    this.tiltMeter=clamp(this.tiltMeter+.40,0,1);
    this.ball.applyLinearImpulse(V(-.35,-.95),this.ball.getWorldCenter(),true);
    if(this.tiltMeter>=1) {
      this.tilted=true;
      this.onEvent("TILT! FLIPPERS AND SCORING DISABLED UNTIL NEXT BALL");
    } else this.onEvent(this.tiltMeter>=.65?"DANGER · TILT WARNING":"NUDGE · WATCH YOUR TILT");
    return true;
  }
  stepFrame(dt,keys={}) {
    const delta=clamp(Number.isFinite(dt)?dt:0,0,.05);
    if(this.status==="ready" && !this.paused) {
      if(this.charging)this.charge=clamp(this.charge+delta*.78,0,1);
      return;
    }
    if (this.status!=="playing"||this.paused) return;
    this.accumulator+=delta;
    let count=0;
    while(this.accumulator>=STEP && count<7) {
      this.step(keys);this.accumulator-=STEP;count++;
      if(this.status!=="playing")break;
    }
  }
  step(keys) {
    this.elapsed+=STEP;
    if(!this.tilted)this.tiltMeter=Math.max(0,this.tiltMeter-STEP*.06);
    const scene=this.scenes[this.layer];
    for(const f of this.scenes[0].flippers) {
      const on=!this.tilted&&(f.left?keys.left:keys.right);
      f.hinge.setMotorSpeed(f.left?(on?-24:14):(on?24:-14));
    }
    scene.world.step(STEP,8,3);
    this.processHits();
    if (!this.ball || this.status!=="playing") return;
    let p=this.ball.getPosition();
    // Shooter lane feeds the upper-left arc after it clears the lane divider.
    if(this.layer===0 && p.x>9.3 && p.y<2.9 && this.ball.getLinearVelocity().y<0) {
      this.ball.setLinearVelocity(V(-5.4,-2.8));
      if(!this.skillShotClaimed && !this.tilted && this.launchStrength>=.60 && this.launchStrength<=.80) {
        this.score+=1500;
        this.onEvent("SKILL SHOT · +1,500");
      }
      this.skillShotClaimed=true;
    }
    if(this.layer===1) this.upperTime+=STEP;else this.upperTime=0;
    if(this.elapsed-this.lastRamp>0.65) {
      const ramp=this.table.objects.find(o=>
        o.type==="ramp"&&o.layer===this.layer &&
        Math.hypot(p.x-o.x,p.y-o.y)<o.r+BALL_RADIUS);
      if(ramp) {
        this.transfer(ramp);
        return;
      }
    }
    p=this.ball.getPosition();
    if(this.layer===0 && (p.y>17.1 || p.x<0 || p.x>WIDTH+0.8)) this.drain();
    // A recovery chute prevents user-built upper tables from trapping the ball forever.
    if(this.layer===1 && this.upperTime>18) {
      this.transfer({toLayer:0,toX:7.6,toY:11.0});
      this.onEvent("UPPER DECK RECOVERY CHUTE");
    }
  }
  processHits() {
    if(this.tilted){this.pendingHits.length=0;return;}
    for(const hit of this.pendingHits.splice(0)) {
      if(hit.layer!==this.layer)continue;
      const key=hit.layer+"-"+hit.id;
      if(this.elapsed-(this.lastHit.get(key)??-10)<0.16)continue;
      this.lastHit.set(key,this.elapsed);
      this.score+=hit.kind==="bumper"?100:500;
      if(hit.kind==="bumper") {
        const p=this.ball?.getPosition();
        if(p) {
          const dx=p.x-hit.x,dy=p.y-hit.y;
          const dist=Math.max(0.1,Math.hypot(dx,dy));
          this.ball.applyLinearImpulse(V(dx/dist*0.31,dy/dist*0.31),this.ball.getWorldCenter(),true);
        }
      }
      this.advanceQuest(hit.kind==="bumper"?"bumperHits":"targetHits");
    }
  }
  advanceQuest(kind) {
    for(const quest of recordQuestEvent(this.ledger,kind)) {
      this.score+=2000;
      this.onEvent("QUEST COMPLETE: "+quest.label.toUpperCase());
    }
  }
  transfer(ramp) {
    const v=this.ball.getLinearVelocity();
    this.scenes[this.layer].world.destroyBody(this.ball);
    this.layer=ramp.toLayer;
    this.ball=addBall(this.scenes[this.layer].world,ramp.toX,ramp.toY);
    this.ball.setLinearVelocity(this.layer===1?V(1.5,2.2):V(v.x*0.6,Math.max(2.5,v.y)));
    this.lastRamp=this.elapsed;
    if(this.layer===1) {
      if(!this.tilted){
        this.score+=1200;
        this.advanceQuest("rampRuns");
        this.onEvent("UPPER PLAYFIELD · +1200");
      }else this.onEvent("UPPER PLAYFIELD · TILT ACTIVE");
    } else this.onEvent("RETURN TO LOWER DECK");
  }
  drain() {
    this.scenes[this.layer].world.destroyBody(this.ball);
    this.ball=null;
    this.balls--;
    this.tiltMeter=0;this.tilted=false;this.charging=false;this.charge=0;
    if(this.balls===0) {
      this.status="gameover";this.onEvent("GAME OVER · FINAL SCORE "+this.score.toLocaleString());
    } else {
      this.status="ready";this.layer=0;
      this.ball=addBall(this.scenes[0].world,9.7,15.85);
      this.onEvent("BALL LOST · PRESS SPACE TO LAUNCH");
    }
  }
}
