import {useEffect,useRef,useState} from "react";
import {PinballGame} from "./physics.js";
import {PRESETS,findPreset,WIDTH,HEIGHT,MAX_OBJECTS,copyTable} from "./tables.js";
import {normalizeTable} from "./validation.js";
import {drawPinball} from "./render.js";

const STORAGE="phiball369-table-v1";
const emptyControl={left:false,right:false};
const help={
  bumper:"Click anywhere inside the field to place a pop bumper.",
  target:"Click a position to add a scoring target.",
  wall:"Click the rail start, then click its endpoint.",
  ramp:"Click the entrance, then click the exit on the other deck.",
  erase:"Click a placed part to remove it."
};
function loadTable() {
  try {
    const raw=localStorage.getItem(STORAGE);
    if(raw)return {...normalizeTable(JSON.parse(raw)),id:"custom"};
  }catch(error){console.warn("PhiBall local save is unavailable",error);}
  return findPreset("lab");
}
function snapshot(game) {
  return {
    score:game.score,balls:game.balls,layer:game.layer,
    status:game.status,paused:game.paused,
    charge:game.charge,charging:game.charging,
    tiltMeter:game.tiltMeter,tilted:game.tilted,
    quests:game.ledger.quests.map(q=>({
      ...q,count:Math.min(q.goal,game.ledger.counts[q.kind]||0),
      completed:game.ledger.completed.includes(q.id)
    }))
  };
}
function lineDistance(px,py,x1,y1,x2,y2) {
  const dx=x2-x1,dy=y2-y1,s=dx*dx+dy*dy;
  const t=s?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/s)):0;
  return Math.hypot(px-x1-t*dx,py-y1-t*dy);
}
function makeId() {
  return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
}
function saveJSON(table) {
  const payload=JSON.stringify(normalizeTable(table),null,2);
  const blob=new Blob([payload],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download="phiball369-table.json";anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function PlungerButton({game,disabled,primary=false,refresh}) {
  const holding=useRef(false);
  const release=()=>{
    if(!holding.current)return;
    holding.current=false;
    game.releaseCharge();refresh();
  };
  return <button className={primary?"primary":undefined}
    disabled={disabled} aria-label="Hold to charge plunger, release to launch"
    onPointerDown={event=>{
      if(disabled)return;
      holding.current=game.beginCharge();
      if(holding.current)event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerUp={release}
    onPointerCancel={()=>{
      if(holding.current){holding.current=false;game.cancelCharge();refresh();}
    }}
    onLostPointerCapture={()=>{
      if(holding.current){holding.current=false;game.cancelCharge();refresh();}
    }}
    onClick={()=>{if(game.status==="ready"){game.launch();refresh();}}}>
    {primary?<>CHARGE PLUNGER <span>HOLD SPACE</span></>:"HOLD TO LAUNCH"}
  </button>;
}
function TouchFlipper({side,controls}) {
  const label=side==="left"?"◀ LEFT FLIPPER":"RIGHT FLIPPER ▶";
  const release=()=>{controls.current[side]=false;};
  return <button aria-label={label}
    onPointerDown={event=>{
      event.preventDefault();controls.current[side]=true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerUp={release} onPointerCancel={release}
    onLostPointerCapture={release}>{label}</button>;
}
export default function App() {
  const [table,setTable]=useState(loadTable);
  const tableRef=useRef(table);
  const [activePreset,setActivePreset]=useState(table.id==="custom"?"custom":"lab");
  const [hasCustom,setHasCustom]=useState(table.id==="custom");
  const [announcement,setAnnouncement]=useState("READY FOR LAUNCH");
  const gameRef=useRef(null);
  if(!gameRef.current)gameRef.current=new PinballGame(table,message=>setAnnouncement(message));
  const game=gameRef.current;
  const [hud,setHud]=useState(()=>snapshot(game));
  const [editor,setEditor]=useState(false);
  const editorRef=useRef(false);
  const [debug,setDebug]=useState(false);
  const debugRef=useRef(false);
  const [editLayer,setEditLayer]=useState(0);
  const layerRef=useRef(0);
  const [tool,setTool]=useState("bumper");
  const toolRef=useRef("bumper");
  const [pending,setPending]=useState(null);
  const pendingRef=useRef(null);
  const canvasRef=useRef(null);
  const controls=useRef({...emptyControl});
  const history=useRef([]);
  const fileInput=useRef(null);

  function refresh() {setHud(snapshot(gameRef.current));}
  function loadMachine(next,selection) {
    pendingRef.current=null;setPending(null);history.current=[];
    tableRef.current=next;setTable(next);
    setActivePreset(selection);game.setTable(next);
    setAnnouncement("READY FOR LAUNCH");refresh();
  }
  function selectMachine(id) {
    if(id==="custom") {
      try {
        const saved=localStorage.getItem(STORAGE);
        if(saved){loadMachine({...normalizeTable(JSON.parse(saved)),id:"custom"},"custom");return;}
      }catch(error){setAnnouncement("LOCAL SAVE NOT AVAILABLE");return;}
    }
    loadMachine(findPreset(id),id);
  }
  function storeCustom(next) {
    const safe={...normalizeTable(next),id:"custom"};
    tableRef.current=safe;setTable(safe);
    setHasCustom(true);setActivePreset("custom");
    try{localStorage.setItem(STORAGE,JSON.stringify(safe));}
    catch(error){setAnnouncement("LOCAL SAVE FAILED · EXPORT TABLE INSTEAD");}
    return safe;
  }
  function switchLayer(next,clearPending=true) {
    layerRef.current=next;setEditLayer(next);
    if(clearPending){pendingRef.current=null;setPending(null);}
  }
  function toggleEditor() {
    const next=!editorRef.current;
    editorRef.current=next;setEditor(next);
    pendingRef.current=null;setPending(null);
    if(next) {
      game.paused=true;setAnnouncement("WORKSHOP · PLACE PARTS ON THE PLAYFIELD");
    }else {
      game.setTable(tableRef.current);
      setAnnouncement("READY FOR LAUNCH");
    }
    refresh();
  }
  function placePart(x,y) {
    if(!editorRef.current||x<.65||x>WIDTH-.65||y<1||y>HEIGHT-1.1)return;
    const type=toolRef.current,layer=layerRef.current;
    const old=tableRef.current;
    const parts=copyTable(old.objects);
    if(type==="erase") {
      const index=parts.findIndex(p=>p.layer===layer &&
        (p.type==="wall"?lineDistance(x,y,p.x1,p.y1,p.x2,p.y2)<.40:
        Math.hypot(x-p.x,y-p.y)<.59));
      if(index<0)return;
      history.current.push(copyTable(old.objects));parts.splice(index,1);
    }else {
      if(parts.length>=MAX_OBJECTS){setAnnouncement("MAXIMUM PART COUNT REACHED");return;}
      const start=pendingRef.current;
      if((type==="wall"||type==="ramp")&&!start) {
        const entry={type,layer,x,y};
        pendingRef.current=entry;setPending(entry);
        if(type==="ramp")switchLayer(1-layer,false);
        setAnnouncement(type==="wall"?"CLICK THE RAIL ENDPOINT":"CLICK THE OTHER DECK TO SET THE RAMP EXIT");
        return;
      }
      if(start && start.type!==type)return;
      if(type==="ramp" && start.layer===layer) {
        setAnnouncement("RAMP MUST CONNECT DIFFERENT DECKS");return;
      }
      history.current.push(copyTable(old.objects));
      if(type==="wall")parts.push({id:makeId(),type,layer,
        x1:start.x,y1:start.y,x2:x,y2:y});
      else if(type==="ramp")parts.push({id:makeId(),type,layer:start.layer,
        toLayer:layer,x:start.x,y:start.y,toX:x,toY:y,r:.60});
      else parts.push({id:makeId(),type,layer,x,y,r:type==="bumper"?.44:.3});
      if(start?.type==="ramp")switchLayer(start.layer,false);
      pendingRef.current=null;setPending(null);
    }
    if(history.current.length>40)history.current.shift();
    storeCustom({...old,objects:parts});
    setAnnouncement("PART SAVED · READY TO PLAY");
  }
  function undo() {
    if(!history.current.length)return;
    storeCustom({...tableRef.current,objects:history.current.pop()});
    setAnnouncement("LAST CHANGE UNDONE");
  }
  function clearParts() {
    if(!tableRef.current.objects.length)return;
    history.current.push(copyTable(tableRef.current.objects));
    storeCustom({...tableRef.current,objects:[]});
    setAnnouncement("ALL WORKSHOP PARTS CLEARED");
  }
  async function importFile(event) {
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>1_000_000)throw new Error("1 MB maximum");
      const safe={...normalizeTable(JSON.parse(await file.text())),id:"custom"};
      storeCustom(safe);game.setTable(safe);game.paused=editorRef.current;
      history.current=[];pendingRef.current=null;setPending(null);
      setAnnouncement("CUSTOM TABLE IMPORTED");refresh();
    }catch(error){setAnnouncement("IMPORT FAILED · "+error.message);}
    event.target.value="";
  }
  function onCanvasClick(event) {
    if(!editorRef.current)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const x=(event.clientX-rect.left)*WIDTH/rect.width;
    const y=(event.clientY-rect.top)*HEIGHT/rect.height;
    placePart(x,y);
  }
  function restart() {
    game.reset();if(editorRef.current)game.paused=true;
    setAnnouncement("FRESH GAME · PRESS SPACE");refresh();
  }
  function pause() {game.togglePause();refresh();}
  useEffect(()=>{
    const down=event=>{
      if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(document.activeElement?.tagName))return;
      const k=event.key.toLowerCase();
      if(["arrowleft","arrowright","a","d"," ","n"].includes(k))event.preventDefault();
      if(k==="arrowleft"||k==="a")controls.current.left=true;
      if(k==="arrowright"||k==="d")controls.current.right=true;
      if(event.repeat||editorRef.current)return;
      if(k===" ")gameRef.current.beginCharge();
      if(k==="n")gameRef.current.nudge();
    };
    const up=event=>{
      const k=event.key.toLowerCase();
      if(k==="arrowleft"||k==="a")controls.current.left=false;
      if(k==="arrowright"||k==="d")controls.current.right=false;
      if(k===" "){gameRef.current.releaseCharge();}
    };
    const blur=()=>{
      controls.current.left=false;controls.current.right=false;
      gameRef.current.cancelCharge();
    };
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    window.addEventListener("blur",blur);
    const context=canvasRef.current.getContext("2d");
    let last=performance.now(),lastHud=0,request=0;
    const frame=now=>{
      const dt=(now-last)/1000;last=now;
      if(!editorRef.current)gameRef.current.stepFrame(dt,controls.current);
      drawPinball(context,gameRef.current,tableRef.current,
        editorRef.current,layerRef.current,pendingRef.current,debugRef.current);
      if(now-lastHud>125){setHud(snapshot(gameRef.current));lastHud=now;}
      request=requestAnimationFrame(frame);
    };
    request=requestAnimationFrame(frame);
    return ()=>{
      cancelAnimationFrame(request);
      window.removeEventListener("keydown",down);
      window.removeEventListener("keyup",up);
      window.removeEventListener("blur",blur);
    };
  },[]);

  return <>
    <header className="masthead">
      <div className="react-brand">
        <div className="wordmark"><span className="phi">Φ</span> BALL <span className="mark">369</span>
          <small>THE PHYSICS ARCADE</small></div>
      </div>
      <div className="header-right"><span className="live-dot"></span> LIVE REACT ARCADE
        <span className="version">RUNG 04 · CHROME EDITION</span>
        <a href="https://github.com/MichaelWave369/PhiBall369" target="_blank" rel="noopener noreferrer">GITHUB</a>
      </div>
    </header>
    <main className="workspace">
      <aside className="panel left-panel">
        <div className="section-title">THE ARCADE <span className="line"></span></div>
        <label htmlFor="preset">SELECT A MACHINE</label>
        <select id="preset" value={activePreset} onChange={event=>selectMachine(event.target.value)}>
          {PRESETS.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}
          {hasCustom&&<option value="custom">MY WORKSHOP TABLE</option>}
        </select>
        <div className="machine-info">
          <h1 style={{color:table.accent}}>{table.title}</h1><p>{table.subtitle}</p>
        </div>
        <div className="divider"></div>
        <div className="section-title">PLAYER ONE <span className="line"></span></div>
        <div className="stat-line"><span>SCORE</span><strong>{String(hud.score).padStart(7,"0")}</strong></div>
        <div className="stat-line"><span>BALLS LEFT</span><strong>{String(hud.balls).padStart(2,"0")}</strong></div>
        <div className="stat-line"><span>PLAYFIELD</span><strong>{editor?
          (editLayer===0?"EDIT LOWER · L1":"EDIT UPPER · L2"):
          (hud.layer===0?"LOWER · L1":"UPPER · L2")}</strong></div>
        <div className="section-title spaced">PLUNGER + TILT <span className="line"></span></div>
        <div className="gauge-label"><span>SPRING CHARGE</span><strong>{Math.round(hud.charge*100)}%</strong></div>
        <div className="gauge"><div className="gauge-fill" style={{width:(hud.charge*100)+"%"}} /></div>
        <div className="gauge-label"><span>TILT DANGER</span><strong>{hud.tilted?"TILT":Math.round(hud.tiltMeter*100)+"%"}</strong></div>
        <div className={"gauge"+(hud.tilted?" tilted":"")}><div className="gauge-fill danger" style={{width:(hud.tiltMeter*100)+"%"}} /></div>
        <div className="section-title spaced">MISSION LEDGER <span className="line"></span></div>
        <div className="missions">{hud.quests.map(q=><div key={q.id} className={"mission"+(q.completed?" complete":"")}>
          <span>{q.completed?"✓":"○"} {q.label}</span>
          <b>{q.count} / {q.goal}</b>
        </div>)}</div>
        <div className="announcement" role="status" aria-live="polite">{announcement}</div>
        <div className="divider"></div>
        <PlungerButton primary game={game} refresh={refresh} disabled={editor||hud.status!=="ready"}/>
        <div className="two-buttons"><button disabled={editor||hud.status!=="playing"} onClick={pause}>{hud.paused?"RESUME":"PAUSE"}</button>
          <button onClick={restart}>RESTART</button></div>
        <div className="control-help"><b>CONTROLS</b><br/>
          <span>← / A</span> LEFT FLIPPER<br/>
          <span>→ / D</span> RIGHT FLIPPER<br/>
          <span>SPACE</span> HOLD / RELEASE PLUNGER<br/>
          <span>N</span> NUDGE (TILT RISK)
        </div>
      </aside>
      <section className="playfield-column">
        <div className="react-note"><span><span className="tab-dot"></span> <strong>PHYSICS ENGINE ACTIVE</strong></span>
          <span className="reactor-tag">REACT + BOX2D</span></div>
        <div className="cabinet-header"><span>PHIBALL / PLAYFIELD</span>
          <span id="play-state">{editor?"✎ WORKSHOP":hud.paused?"Ⅱ PAUSED":
            hud.status==="playing"?"● BALL IN PLAY":hud.status==="gameover"?"■ GAME OVER":"● READY"}</span></div>
        <div className="cabinet"><canvas ref={canvasRef} width={525} height={875}
          onPointerDown={onCanvasClick} className="drag-area"
          aria-label="PhiBall369 playable pinball table and two-level workshop" /></div>
        <div className="touch-controls">
          <TouchFlipper side="left" controls={controls}/>
          <PlungerButton game={game} refresh={refresh} disabled={editor||hud.status!=="ready"}/>
          <TouchFlipper side="right" controls={controls}/>
        </div>
        <div className="nudge-touch"><button disabled={editor||hud.status!=="playing"||hud.tilted}
          onClick={()=>{game.nudge();refresh();}}>NUDGE · TILT WARNING</button></div>
        <p className="footer-note">CHROME SPRITES · REAL SLING IMPULSES · TRAP WATCHDOG · TWO LAYERS</p>
      </section>
      <aside className="panel right-panel">
        <div className="section-title">THE WORKSHOP <span className="line"></span></div>
        <p className="muted">Build tables with parts that affect the actual physics simulation.</p>
        <label className="debug-option"><input type="checkbox" checked={debug}
          onChange={event=>{const active=event.target.checked;setDebug(active);debugRef.current=active;}}/>
          SHOW PHYSICS DEBUG OVERLAY</label>
        <button className={"editor-toggle"+(editor?" active":"")} onClick={toggleEditor}>
          {editor?"PLAY THIS TABLE":"ENTER BUILD MODE"}</button>
        {editor&&<div className="builder">
          <div className="divider"></div>
          <label>EDIT PLAYFIELD</label>
          <div className="two-buttons layer-buttons">
            <button className={editLayer===0?"selected":""} onClick={()=>switchLayer(0)}>LOWER · L1</button>
            <button className={editLayer===1?"selected":""} onClick={()=>switchLayer(1)}>UPPER · L2</button>
          </div>
          <label htmlFor="tool">PLACE A PART</label>
          <select id="tool" value={tool} onChange={event=>{
            const next=event.target.value;toolRef.current=next;setTool(next);
            pendingRef.current=null;setPending(null);
          }}>
            <option value="bumper">Pop bumper</option><option value="target">Standing target</option>
            <option value="wall">Rail / wall (two clicks)</option>
            <option value="ramp">Layer ramp (two clicks)</option><option value="erase">Erase a part</option>
          </select>
          <p className="editor-tip">{pending?pending.type==="ramp"?
            "Now click the destination on the opposite deck.":"Now click the rail endpoint.":help[tool]}</p>
          <div className="two-buttons"><button onClick={undo} disabled={!history.current.length}>UNDO</button>
            <button onClick={clearParts}>CLEAR PARTS</button></div>
          <button onClick={()=>saveJSON(table)}>EXPORT TABLE JSON</button>
          <label htmlFor="import-table" className="file-label">IMPORT TABLE JSON</label>
          <input id="import-table" type="file" ref={fileInput}
            accept=".json,application/json" onChange={importFile}/>
          <p className="tiny">Custom tables save locally. Exports contain sanitized table data, not executable scripts.</p>
        </div>}
        <div className="divider"></div>
        <div className="section-title">ENGINE STATUS <span className="line"></span></div>
        <div className="engine-status"><span>RENDER SHELL</span><strong>REACT</strong></div>
        <div className="engine-status"><span>PHYSICS</span><strong>PLANCK / BOX2D</strong></div>
        <div className="engine-status"><span>SIMULATION</span><strong>120 HZ</strong></div>
        <div className="engine-status"><span>ELEVATION</span><strong>2 ACTIVE DECKS</strong></div>
        <div className="engine-status"><span>BUILDER</span><strong>LOCAL + JSON</strong></div>
        <div className="divider"></div>
        <div className="section-title">PHI369 UNIVERSE <span className="line"></span></div>
        <div className="roadmap">
          <div><b>01</b><span>PHIBALL LAB</span><small>ORIGINAL STARTER TABLE</small></div>
          <div><b>02</b><span>BREAK THE MATRIX</span><small>SYSTEM BREACH QUESTS</small></div>
          <div><b>03</b><span>ARCLIGHT</span><small>STARSHIP RAMP RUN</small></div>
        </div>
        <div className="divider"></div>
        <p className="field-footnote">Original chrome sprites, physical sling kickers, collision-aligned rails and drain-zone watchdog enabled. Continuous 3D ramps and calibrated spin are future rungs.</p>
      </aside>
    </main>
  </>;
}
