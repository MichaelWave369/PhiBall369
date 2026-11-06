import {useEffect,useState} from "react";
import {EVENT_OPTIONS,MAX_QUESTS,addQuest,removeQuest,moveQuest,updateQuest,
  defaultMode,updateMode,missionDraft} from "./workshop.js";

const typeName=kind=>EVENT_OPTIONS.find(item=>item.value===kind)?.label??kind;
function EventType({id,value,onChange}){
  return <select id={id} value={value} onChange={e=>onChange(e.target.value)}>
    {EVENT_OPTIONS.map(option=><option key={option.value} value={option.value}>
      {option.label}
    </option>)}
  </select>;
}
export default function MissionDesigner({table,onSave,onPlay}){
  const [draft,setDraft]=useState(()=>missionDraft(table));
  useEffect(()=>setDraft(missionDraft(table)),[table]);
  const change=(field,value)=>setDraft(previous=>({...previous,[field]:value}));
  const editQuest=(id,field,value)=>setDraft(previous=>({
    ...previous,quests:updateQuest(previous.quests,id,field,value)
  }));
  const editMode=(field,value)=>setDraft(previous=>({
    ...previous,mode:updateMode(previous.mode,field,value)
  }));
  const save=(andPlay=false)=>andPlay?onPlay(draft):onSave(draft);
  return <section className="mission-designer" aria-label="Quest and special mode designer">
    <p className="builder-lede">Write the story rules for this table. These objectives use real
      bumper collisions, target hits, and successful upper-deck ascents.</p>
    <div className="section-title">MACHINE IDENTITY <span className="line"></span></div>
    <label htmlFor="design-name">MACHINE NAME</label>
    <input id="design-name" className="editor-input" type="text" maxLength={64}
      value={draft.title} onChange={e=>change("title",e.target.value)}/>
    <label htmlFor="design-tagline">MACHINE DESCRIPTION</label>
    <textarea id="design-tagline" className="editor-input" rows={3} maxLength={150}
      value={draft.subtitle} onChange={e=>change("subtitle",e.target.value)}/>
    <label htmlFor="design-color">PLAYFIELD ACCENT COLOR</label>
    <div className="design-color">
      <input id="design-color" type="color" value={draft.accent}
        onChange={e=>change("accent",e.target.value)}/>
      <span>{draft.accent.toUpperCase()}</span>
    </div>
    <div className="divider"></div>
    <div className="section-title">QUEST DESIGNER <span className="line"></span></div>
    <p className="builder-lede">Quests pay 2,000 points on their first completion.
      Build up to {MAX_QUESTS} objectives; they track all matching hits during a game.</p>
    <div className="editor-count">{draft.quests.length} / {MAX_QUESTS} OBJECTIVES</div>
    {draft.quests.length===0&&<p className="builder-empty">No quests yet. Add one to make your
      machine tell a story through its targets.</p>}
    {draft.quests.map((quest,i)=><article className="quest-editor-card" key={quest.id}>
      <div className="quest-toolbar">
        <b>QUEST {String(i+1).padStart(2,"0")}</b>
        <div className="quest-actions">
          <button aria-label={"Move quest "+(i+1)+" earlier"}
            disabled={i===0} onClick={()=>setDraft(prev=>({...prev,
              quests:moveQuest(prev.quests,quest.id,-1)}))}>↑</button>
          <button aria-label={"Move quest "+(i+1)+" later"}
            disabled={i===draft.quests.length-1} onClick={()=>setDraft(prev=>({...prev,
              quests:moveQuest(prev.quests,quest.id,1)}))}>↓</button>
          <button className="danger-button" aria-label={"Remove quest "+(i+1)}
            onClick={()=>setDraft(prev=>({...prev,
              quests:removeQuest(prev.quests,quest.id)}))}>×</button>
        </div>
      </div>
      <label htmlFor={"quest-label-"+quest.id}>OBJECTIVE</label>
      <input id={"quest-label-"+quest.id} className="editor-input" type="text"
        maxLength={95} value={quest.label}
        onChange={e=>editQuest(quest.id,"label",e.target.value)}/>
      <label htmlFor={"quest-kind-"+quest.id}>COUNT THIS EVENT</label>
      <EventType id={"quest-kind-"+quest.id} value={quest.kind}
        onChange={value=>editQuest(quest.id,"kind",value)}/>
      <label htmlFor={"quest-goal-"+quest.id}>REQUIRED HITS / ASCENTS</label>
      <input id={"quest-goal-"+quest.id} className="editor-input" type="number"
        min={1} max={99} step={1} value={quest.goal}
        onChange={e=>editQuest(quest.id,"goal",e.target.value)}/>
    </article>)}
    <button className="mission-add" disabled={draft.quests.length>=MAX_QUESTS}
      onClick={()=>setDraft(prev=>({...prev,quests:addQuest(prev.quests)}))}>
      + ADD A QUEST
    </button>
    <div className="divider"></div>
    <div className="section-title">SPECIAL MODE FACTORY <span className="line"></span></div>
    <label className="mode-toggle"><input type="checkbox" checked={draft.mode!==null}
      onChange={e=>change("mode",e.target.checked?defaultMode():null)}/>
      ENABLE TIMED BONUS MODE</label>
    {draft.mode?<div className="mode-editor">
      <label htmlFor="mode-name">SPECIAL MODE NAME</label>
      <input id="mode-name" className="editor-input" maxLength={48} type="text"
        value={draft.mode.label} onChange={e=>editMode("label",e.target.value)}/>
      <label htmlFor="mode-story">MODE DESCRIPTION</label>
      <textarea id="mode-story" className="editor-input" rows={3} maxLength={180}
        value={draft.mode.description} onChange={e=>editMode("description",e.target.value)}/>
      <label htmlFor="mode-trigger">ACTIVATE AFTER THIS EVENT</label>
      <EventType id="mode-trigger" value={draft.mode.triggerKind}
        onChange={value=>editMode("triggerKind",value)}/>
      <label htmlFor="mode-count">EVENTS TO ACTIVATE</label>
      <input id="mode-count" className="editor-input" type="number" min={1} max={30} step={1}
        value={draft.mode.threshold} onChange={e=>editMode("threshold",e.target.value)}/>
      <label htmlFor="mode-bonus">MULTIPLY POINTS FOR</label>
      <EventType id="mode-bonus" value={draft.mode.bonusKind}
        onChange={value=>editMode("bonusKind",value)}/>
      <div className="mode-editor-grid">
        <div>
          <label htmlFor="mode-factor">MULTIPLIER</label>
          <select id="mode-factor" value={draft.mode.multiplier}
            onChange={e=>editMode("multiplier",e.target.value)}>
            {[2,3,4,5].map(n=><option key={n} value={n}>×{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mode-duration">DURATION (SECONDS)</label>
          <input id="mode-duration" className="editor-input" type="number" min={3} max={60}
            step={1} value={draft.mode.duration}
            onChange={e=>editMode("duration",e.target.value)}/>
        </div>
      </div>
      <p className="mode-rule-summary">
        <strong>LIVE RULE PREVIEW</strong>
        After {draft.mode.threshold} {typeName(draft.mode.triggerKind).toLowerCase()},
        activate {draft.mode.label||"special mode"} for {draft.mode.duration} seconds.
        During that window, {typeName(draft.mode.bonusKind).toLowerCase()} score
        ×{draft.mode.multiplier}.
      </p>
    </div>:<p className="builder-lede">Optional. Design a timed jackpot mode or keep your
      machine as a classic quest-only table.</p>}
    <div className="divider"></div>
    <button className="mission-save primary" onClick={()=>save(false)}>
      SAVE MISSION DESIGN <span>LOCAL</span>
    </button>
    <button className="mission-play" onClick={()=>save(true)}>SAVE &amp; TEST TABLE</button>
    <p className="tiny">Save keeps the design in this browser. Export Table JSON
      from the Parts tab to share it. No scripts or external uploads are required.</p>
  </section>;
}
