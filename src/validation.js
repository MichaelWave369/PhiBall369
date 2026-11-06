import {WIDTH, HEIGHT, MAX_OBJECTS} from "./tables.js";

const finite = (n,fallback,min,max) => typeof n === "number" && Number.isFinite(n)
  ? Math.max(min,Math.min(max,n)) : fallback;
const safeText = (text,fallback,max=90) => typeof text === "string"
  ? text.replace(/[<>]/g,"").trim().slice(0,max) || fallback : fallback;
const layer = value => value === 1 ? 1 : 0;
const modeKinds=new Set(["bumperHits","targetHits","rampRuns"]);
const maximumStages=6;
function normalizeStages(raw,objects){
  if(!Array.isArray(raw)||raw.length===0)return null;
  const stages=raw.slice(0,maximumStages)
    .filter(s=>s&&typeof s==="object"&&!Array.isArray(s)&&modeKinds.has(s.kind))
    .map(s=>{
      const desired=typeof s.partId==="string"?
        s.partId.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,40):"";
      const matched=objects.some(p=>p.id===desired&&(
        s.kind==="bumperHits"?p.type==="bumper":
        s.kind==="targetHits"?p.type==="target":
        p.type==="ramp"&&p.layer===0&&p.toLayer===1
      ));
      // Unknown/removed parts downgrade to an ordinary category match,
      // never to an unfinishable secret objective.
      return {
        kind:s.kind,goal:Math.round(finite(s.goal,1,1,99)),
        partId:matched?desired:null
      };
    });
  return stages.length?stages:null;
}
function normalizeMode(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
  if(!modeKinds.has(raw.triggerKind)||!modeKinds.has(raw.bonusKind))return null;
  return {
    id:safeText(raw.id,"custom-mode",48),
    label:safeText(raw.label,"SPECIAL MODE",48),
    description:safeText(raw.description,"Earn bonus points during special mode.",180),
    triggerKind:raw.triggerKind,
    bonusKind:raw.bonusKind,
    threshold:Math.round(finite(raw.threshold,3,1,30)),
    duration:finite(raw.duration,12,3,60),
    multiplier:Math.round(finite(raw.multiplier,2,2,5))
  };
}

export function normalizeTable(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected a table JSON object.");
  if (!Array.isArray(raw.objects) || raw.objects.length > MAX_OBJECTS) {
    throw new Error("A table must contain up to " + MAX_OBJECTS + " parts.");
  }
  const ids = new Set();
  const objects = [];
  for (const part of raw.objects) {
    if (!part || typeof part !== "object") continue;
    if (!["bumper","target","wall","ramp"].includes(part.type)) continue;
    const id = safeText(part.id,"part-"+objects.length,40).replace(/[^a-zA-Z0-9_-]/g,"");
    if (ids.has(id)) continue;
    ids.add(id);
    const common = {id,type:part.type,layer:layer(part.layer)};
    if (part.type === "wall") {
      objects.push({...common,
        x1:finite(part.x1,2,0.4,WIDTH-0.4),y1:finite(part.y1,7,0.7,HEIGHT-0.7),
        x2:finite(part.x2,4,0.4,WIDTH-0.4),y2:finite(part.y2,8,0.7,HEIGHT-0.7)});
    } else if (part.type === "ramp") {
      const toLayer = part.toLayer === 1 ? 1 : 0;
      if (toLayer === common.layer) continue;
      objects.push({...common,
        x:finite(part.x,2,0.6,WIDTH-0.6),y:finite(part.y,7,1,HEIGHT-1),
        toX:finite(part.toX,5,0.6,WIDTH-0.6),toY:finite(part.toY,6,1,HEIGHT-1),
        toLayer,r:finite(part.r,0.6,0.35,1),
        curve:finite(part.curve,0.4,-1.5,1.5)});
    } else {
      objects.push({...common,
        x:finite(part.x,5,0.6,WIDTH-0.6),y:finite(part.y,7,1,HEIGHT-1),
        r:finite(part.r,0.35,0.2,0.75)});
    }
  }
  const kinds = new Set(["bumperHits","targetHits","rampRuns"]);
  // Imported mission IDs must be unique: the quest ledger indexes completion
  // by ID, so duplicates could otherwise make several quests complete at once.
  const missionIds=new Set();
  const quests = (Array.isArray(raw.quests) ? raw.quests : []).slice(0,8)
    .filter(q=>q && kinds.has(q.kind))
    .map((q,i)=>{
      const requested=safeText(q.id,"quest-"+i,40);
      let id=requested,suffix=2;
      while(missionIds.has(id)){
        const trail="-"+suffix++;
        id=requested.slice(0,40-trail.length)+trail;
      }
      missionIds.add(id);
      const stages=normalizeStages(q.stages,objects);
      return {
        id,label:safeText(q.label,"Complete quest "+(i+1),95),
        kind:q.kind,goal:Math.round(finite(q.goal,3,1,99)),
        ...(stages?{stages}:{})
      };
    });
  return {
    id:safeText(raw.id,"custom",40),title:safeText(raw.title,"CUSTOM TABLE",64),
    subtitle:safeText(raw.subtitle,"A PhiBall369 workshop creation.",150),
    accent:/^#[0-9a-fA-F]{6}$/.test(raw.accent) ? raw.accent : "#72edff",
    objects,quests,mode:normalizeMode(raw.mode)
  };
}
