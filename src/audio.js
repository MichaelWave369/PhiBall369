// Original procedural pinball sound design: Web Audio synthesis, no sample files,
// music playback, third-party sounds, external requests or autostart audio.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const SOUND_THEMES=Object.freeze({
  lab:Object.freeze({pitch:1,brightness:1,label:"CHROME LAB"}),
  btm:Object.freeze({pitch:.78,brightness:.78,label:"SYSTEM BREACH"}),
  arclight:Object.freeze({pitch:1.18,brightness:1.15,label:"ARCLIGHT DECKS"}),
  custom:Object.freeze({pitch:1,brightness:1,label:"CUSTOM TABLE"})
});
const VOICES=Object.freeze({
  launch:[["triangle",245,94,.24,.20,0],["sine",440,160,.12,.12,.018]],
  flipper:[["square",165,79,.17,.048,0],["triangle",360,160,.09,.035,0]],
  bumper:[["sine",650,240,.20,.13,0],["triangle",1100,680,.09,.09,.008]],
  target:[["triangle",580,390,.13,.11,0],["sine",890,770,.08,.12,.024]],
  sling:[["sawtooth",240,94,.13,.085,0]],
  ramp:[["triangle",300,650,.11,.22,0],["sine",680,820,.07,.18,.08]],
  arrival:[["sine",650,890,.13,.17,0],["triangle",390,620,.08,.20,.06]],
  quest:[["sine",440,440,.14,.13,0],["sine",554,554,.14,.13,.11],["sine",659,659,.18,.23,.23]],
  skill:[["sine",660,660,.12,.14,0],["sine",880,880,.13,.21,.13]],
  drain:[["triangle",175,75,.16,.30,0]],
  nudge:[["sawtooth",110,65,.055,.09,0]],
  mode:[["sine",440,660,.12,.14,0],["sine",660,990,.13,.18,.13]],
  jackpot:[["triangle",790,1240,.11,.13,0],["sine",930,1550,.08,.14,.08]],
  modeEnd:[["triangle",520,290,.11,.24,0]],
  tilt:[["sawtooth",230,120,.14,.23,0],["square",160,100,.09,.25,.17]]
});
export const SOUND_EVENTS=Object.freeze(Object.keys(VOICES));
export function soundPlan(type,theme="lab",level=.6){
  if(!Object.hasOwn(VOICES,type))return [];
  const setting=SOUND_THEMES[theme]??SOUND_THEMES.custom;
  const master=clamp(Number.isFinite(level)?level:0,0,1);
  return VOICES[type].map(([wave,from,to,gain,duration,delay])=>({
    wave,
    from:clamp(from*setting.pitch,35,2800),
    to:clamp(to*setting.pitch,35,2800),
    gain:clamp(gain*master*.65,0,.21),
    duration,delay
  }));
}
export class ArcadeAudio {
  constructor(){
    this.context=null;
    this.enabled=false;
    this.volume=.55;
    this.theme="lab";
    this.lastByType=new Map();
  }
  async unlock(){
    if(this.enabled&&this.context?.state==="running")return true;
    const AudioCtor=globalThis.AudioContext??globalThis.webkitAudioContext;
    if(!AudioCtor)return false;
    if(!this.context)this.context=new AudioCtor({latencyHint:"interactive"});
    await this.context.resume();
    this.enabled=this.context.state==="running";
    if(this.enabled)this.play({type:"arrival"});
    return this.enabled;
  }
  setVolume(value){this.volume=clamp(Number(value)||0,0,1);}
  setTheme(value){this.theme=Object.hasOwn(SOUND_THEMES,value)?value:"custom";}
  setMuted(muted){this.muted=Boolean(muted);}
  play(event){
    if(!this.enabled||this.muted||!this.context||this.context.state!=="running")return false;
    const type=typeof event==="string"?event:event?.type;
    const typeName=type==="hit"?(event?.kind==="sling"?"sling":event?.kind==="target"?"target":"bumper"):type;
    const now=this.context.currentTime;
    const minGap=typeName==="flipper"?.027:typeName==="bumper"?.07:typeName==="sling"?.08:.08;
    if(now-(this.lastByType.get(typeName)??-100)<minGap)return false;
    const plan=soundPlan(typeName,this.theme,this.volume);
    if(!plan.length)return false;
    this.lastByType.set(typeName,now);
    for(const voice of plan){
      const start=now+voice.delay, end=start+voice.duration;
      const osc=this.context.createOscillator(),gain=this.context.createGain();
      osc.type=voice.wave;
      osc.frequency.setValueAtTime(voice.from,start);
      osc.frequency.exponentialRampToValueAtTime(voice.to,end);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002,voice.gain),start+.005);
      gain.gain.exponentialRampToValueAtTime(.0001,end);
      osc.connect(gain);gain.connect(this.context.destination);
      osc.start(start);osc.stop(end+.02);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
    return true;
  }
  async dispose(){
    this.enabled=false;
    if(this.context&&this.context.state!=="closed")await this.context.close();
    this.context=null;
  }
}
