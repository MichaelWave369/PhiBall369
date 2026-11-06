import * as pl from "planck";
import {WIDTH,HEIGHT,BALL_RADIUS} from "./tables.js";
import {newQuestLedger,recordQuestEvent} from "./quests.js";
import {LOWER_RAILS,UPPER_RAILS,SLINGSHOTS,drainZoneAt,deadCornerAt} from "./geometry.js";
import {makeRampTrack,sampleRamp} from "./rampGeometry.js";

const V = pl.Vec2;
const STEP = 1/120;
// The launcher stores a normalized spring compression. Calibration to real
// cabinet dimensions remains future work, but every launch is deterministic.
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
function edge(world,x1,y1,x2,y2) {
  if (Math.hypot(x2-x1,y2-y1) < 0.06) return;
  const b = world.createBody();
  b.createFixture(new pl.Edge(V(x1,y1),V(x2,y2)),{friction:0.18,restitution:0.58});
}
function rails(world,layer) {
  for(const coords of layer===0?LOWER_RAILS:UPPER_RAILS)edge(world,...coords);
}
function addSlingshot(world,part) {
  const b=world.createBody({position:V(part.x,part.y)});
  b.createFixture(new pl.Polygon(part.vertices.map(([x,y])=>V(x,y))),{
    friction:0.2,restitution:0.92,
    userData:{kind:"sling",id:part.id,x:part.x,y:part.y,side:part.side}
  });
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
  if(layer===0)for(const sling of SLINGSHOTS)addSlingshot(world,sling);
  const flippers=layer===0?[addFlipper(world,"left"),addFlipper(world,"right")]:[];
  world.on("begin-contact",contact=>{
    for (const fixture of [contact.getFixtureA(),contact.getFixtureB()]) {
      const data=fixture.getUserData();
      if (data && (data.kind==="bumper" || data.kind==="target" || data.kind==="sling")) onHit(layer,data);
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
    this.stuckSeconds=0;this.misfireSeconds=0;this.rescueCount=0;this.lastRescue=null;
    this.rampMotion=null;
    this.lastEffect=null;this.effectSequence=0;
    this.ball=addBall(this.scenes[0].world,9.7,15.85);
    this.pendingHits.length=0;
  }
  fx(type,details={}) {
    const event={type,at:this.elapsed,sequence:++this.effectSequence,...details};
    this.lastEffect=event;
    this.onEvent("",event);
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
    this.fx("launch",{power});
    this.onEvent(power>=.85?"FULL POWER LAUNCH!":"BALL LAUNCHED · "+Math.round(power*100)+"% POWER");
    return true;
  }
  togglePause() { if (this.status==="playing") this.paused=!this.paused;return this.paused; }
  nudge() {
    if (this.status!=="playing"||this.paused||this.tilted||!this.ball||this.elapsed-this.lastNudge<.45) return false;
    this.lastNudge=this.elapsed;
    this.tiltMeter=clamp(this.tiltMeter+.40,0,1);
    this.ball.applyLinearImpulse(V(-.35,-.95),this.ball.getWorldCenter(),true);
    if(this.tiltMeter>=1) {
      this.tilted=true;
      this.fx("tilt");
      this.onEvent("TILT! FLIPPERS AND SCORING DISABLED UNTIL NEXT BALL");
    } else {
      this.fx("nudge");
      this.onEvent(this.tiltMeter>=.65?"DANGER · TILT WARNING":"NUDGE · WATCH YOUR TILT");
    }
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
    if(this.rampMotion) {
      this.advanceOnRamp();
      return;
    }
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
        this.fx("skill");
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
        this.enterRamp(ramp);
        return;
      }
    }
    this.watchBall();
    if(this.status!=="playing")return;
    // A recovery chute prevents user-built upper tables from trapping the ball forever.
    if(this.layer===1 && this.upperTime>18) {
      this.transfer({toLayer:0,toX:7.6,toY:11.0});
      this.onEvent("UPPER DECK RECOVERY CHUTE");
    }
  }
  enterRamp(ramp) {
    if(this.rampMotion||!this.ball||this.status!=="playing")return false;
    const p=this.ball.getPosition(),v=this.ball.getLinearVelocity();
    const track=makeRampTrack(ramp,{x:p.x,y:p.y});
    // Every ramp entrance has a mechanical assist so ordinary flipper shots
    // can ascend; thereafter travel speed follows grade and friction.
    const entrySpeed=clamp(Math.max(8.2,v.length()+1.25),8.2,25);
    this.scenes[this.layer].world.destroyBody(this.ball);
    this.ball=null;
    this.rampMotion={
      track,sourceLayer:this.layer,distance:0,speed:entrySpeed,
      point:sampleRamp(track,0),seconds:0
    };
    this.stuckSeconds=0;this.misfireSeconds=0;
    this.fx("ramp");
    this.onEvent(ramp.toLayer===1?"RAMP ASCENT · CLIMBING TO UPPER DECK":"RAMP DESCENT · RETURN TO LOWER DECK");
    return true;
  }
  advanceOnRamp() {
    const motion=this.rampMotion;
    if(!motion)return;
    const current=sampleRamp(motion.track,motion.distance);
    // Project planar +Y gravity and vertical gravity onto the three-dimensional
    // path tangent. A small speed loss approximates rolling friction.
    const acceleration=5.1*current.tangent.y-6.4*current.tangent.z-.13*motion.speed;
    motion.speed=clamp(motion.speed+acceleration*STEP,-14,28);
    motion.distance+=motion.speed*STEP;
    motion.seconds+=STEP;
    if(motion.distance>=motion.track.totalLength) {
      this.finishRamp(true);
      return;
    }
    if(motion.distance<0||motion.seconds>15) {
      this.finishRamp(false);
      return;
    }
    motion.point=sampleRamp(motion.track,motion.distance);
  }
  finishRamp(completed) {
    const motion=this.rampMotion;
    if(!motion)return;
    const part=motion.track.ramp;
    const destination=completed?part.toLayer:motion.sourceLayer;
    const position=sampleRamp(motion.track,completed?motion.track.totalLength:0);
    const direction=completed?1:-1;
    const exitSpeed=Math.max(2,Math.abs(motion.speed));
    this.layer=destination;
    this.ball=addBall(this.scenes[destination].world,position.x,position.y);
    this.ball.setLinearVelocity(V(position.tangent.x*exitSpeed*direction,position.tangent.y*exitSpeed*direction));
    this.rampMotion=null;
    this.lastRamp=this.elapsed;
    this.upperTime=0;
    this.stuckSeconds=0;
    this.misfireSeconds=0;
    this.fx(completed?"arrival":"ramp");
    if(!completed){
      this.onEvent("RAMP STALLED · BALL ROLLED BACK");
    }else if(this.layer===1){
      if(!this.tilted){
        this.score+=1200;
        this.advanceQuest("rampRuns");
        this.onEvent("UPPER DECK REACHED · +1200");
      }else this.onEvent("UPPER DECK REACHED · TILT ACTIVE");
    }else this.onEvent("LOWER DECK REACHED");
  }
  watchBall() {
    if(!this.ball)return;
    const p=this.ball.getPosition(),v=this.ball.getLinearVelocity(),speed=v.length();
    if(this.layer===0) {
      const drain=drainZoneAt(p.x,p.y);
      if(drain){this.lastRescue="DRAIN · "+drain;this.drain();return;}
      if(p.x>9.25&&p.y>16.3&&speed<.6)this.misfireSeconds+=STEP;
      else this.misfireSeconds=0;
      if(this.misfireSeconds>1.0) {
        this.scenes[0].world.destroyBody(this.ball);
        this.ball=addBall(this.scenes[0].world,9.7,15.85);
        this.status="ready";this.charge=0;this.charging=false;
        this.stuckSeconds=0;this.misfireSeconds=0;
        this.onEvent("SHOOTER MISFIRE · RELOAD PLUNGER");
        return;
      }
    }
    if(speed<.19)this.stuckSeconds+=STEP;
    else this.stuckSeconds=0;
    if(this.layer===0&&deadCornerAt(p.x,p.y)&&this.stuckSeconds>1.3){
      this.lastRescue="DEAD CORNER · CONTROLLED DRAIN";
      this.drain();return;
    }
    if(this.layer===1&&this.stuckSeconds>5&&this.rescueCount<2){
      this.ball.applyLinearImpulse(V(p.x<5.25?.35:-.35,.8),this.ball.getWorldCenter(),true);
      this.lastRescue="UPPER BALL RESCUE";this.rescueCount++;this.stuckSeconds=0;
      this.onEvent("UPPER BALL RESCUE");
    }
  }
  processHits() {
    if(this.tilted){this.pendingHits.length=0;return;}
    for(const hit of this.pendingHits.splice(0)) {
      if(hit.layer!==this.layer)continue;
      const key=hit.layer+"-"+hit.id;
      if(this.elapsed-(this.lastHit.get(key)??-10)<0.16)continue;
      this.lastHit.set(key,this.elapsed);
      this.score+=hit.kind==="bumper"?100:hit.kind==="sling"?75:500;
      this.fx("hit",{kind:hit.kind,layer:hit.layer,id:hit.id});
      if(hit.kind==="bumper"||hit.kind==="sling") {
        const p=this.ball?.getPosition();
        if(p) {
          const dx=p.x-hit.x,dy=p.y-hit.y,dist=Math.max(.12,Math.hypot(dx,dy));
          if(hit.kind==="bumper") {
            this.ball.applyLinearImpulse(V(dx/dist*1.0,dy/dist*1.0),this.ball.getWorldCenter(),true);
          }else {
            this.ball.applyLinearImpulse(V(hit.side==="left"?.28:-.28,-1.10),this.ball.getWorldCenter(),true);
            this.onEvent("SLINGSHOT · +75");
          }
        }
      }
      if(hit.kind!=="sling")this.advanceQuest(hit.kind==="bumper"?"bumperHits":"targetHits");
    }
  }
  advanceQuest(kind) {
    for(const quest of recordQuestEvent(this.ledger,kind)) {
      this.score+=2000;
      this.fx("quest");
      this.onEvent("QUEST COMPLETE: "+quest.label.toUpperCase());
    }
  }
  // Legacy instant transfer is retained only for recovery chutes and
  // compatibility with existing tests; playable ramp entrances use enterRamp.
  transfer(ramp) {
    if(!this.ball)return;
    const v=this.ball.getLinearVelocity();
    this.scenes[this.layer].world.destroyBody(this.ball);
    this.layer=ramp.toLayer;
    this.ball=addBall(this.scenes[this.layer].world,ramp.toX,ramp.toY);
    this.ball.setLinearVelocity(this.layer===1?V(1.5,2.2):V(v.x*0.6,Math.max(2.5,v.y)));
    this.lastRamp=this.elapsed;this.stuckSeconds=0;this.misfireSeconds=0;
    if(this.layer===1) {
      if(!this.tilted){
        this.score+=1200;
        this.advanceQuest("rampRuns");
        this.onEvent("UPPER PLAYFIELD · +1200");
      }else this.onEvent("UPPER PLAYFIELD · TILT ACTIVE");
    } else this.onEvent("RETURN TO LOWER DECK");
  }
  drain() {
    this.fx("drain");
    if(this.ball)this.scenes[this.layer].world.destroyBody(this.ball);
    this.ball=null;this.rampMotion=null;
    this.balls--;
    this.tiltMeter=0;this.tilted=false;this.charging=false;this.charge=0;
    this.stuckSeconds=0;this.misfireSeconds=0;this.rescueCount=0;
    if(this.balls===0) {
      this.status="gameover";this.onEvent("GAME OVER · FINAL SCORE "+this.score.toLocaleString());
    } else {
      this.status="ready";this.layer=0;
      this.ball=addBall(this.scenes[0].world,9.7,15.85);
      this.onEvent("BALL LOST · PRESS SPACE TO LAUNCH");
    }
  }
}
