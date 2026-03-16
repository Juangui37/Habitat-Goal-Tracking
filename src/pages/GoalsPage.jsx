import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

import { CustomCategoryModal, useAllCats } from "../components/modals/CustomCategoryModal.jsx";
import { JournalSuggestionBanner } from "../components/JournalSuggestionBanner.jsx";

function GoalCard({ goal, onToggleSubtask, onDelete, onEdit, onAddNote }) {       
  const [expanded, setExpanded] = useState(false);        
  const [showJournal, setShowJournal] = useState(false);        
  const cat = CATS.find(c=>c.id===goal.category)||CATS[0];        
  const pct = calcProgress(goal);       
  const done = goal.subtasks.filter(s=>s.done).length;        
  const dl = daysLeft(goal.timebound);        
  return (        
    <div style={{background:T.card,border:`1px solid ${expanded?cat.color+"44":T.border}`,borderRadius:15,overflow:"hidden",transition:"border-color 0.3s",marginBottom:9}}>        
      <div onClick={()=>setExpanded(e=>!e)} style={{padding:"17px 21px",cursor:"pointer",display:"flex",alignItems:"center",gap:13}}>       
        <div style={{position:"relative",flexShrink:0}}>        
          <Ring pct={pct} color={cat.color}/>       
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:cat.color}}>{pct}%</div>       
        </div>        
        <div style={{flex:1,minWidth:0}}>       
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>       
            <span style={{fontSize:10,background:`${cat.color}20`,color:cat.color,padding:"2px 8px",borderRadius:20,fontWeight:700,letterSpacing:0.5}}>{cat.icon} {cat.label}</span>        
            <span style={{fontSize:10,color:goal.priority==="High"?"#E8645A":goal.priority==="Medium"?"#C8A96E":"#4CAF82",fontWeight:600}}>{goal.priority}</span>       
          </div>        
          <h3 style={{fontSize:14,fontWeight:700,color:T.text,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{goal.title}</h3>        
          {goal.subtasks.length>0&&<p style={{fontSize:11,color:T.muted,margin:"3px 0 0"}}>{done}/{goal.subtasks.length} subtasks</p>}        
        </div>        
        <div style={{textAlign:"right",flexShrink:0,minWidth:55}}>        
          {dl!==null&&<div style={{fontSize:10,color:dl<14?"#E8645A":T.muted,fontWeight:600,whiteSpace:"nowrap"}}>{dl>0?`${dl}d left`:dl===0?"Due today":`${Math.abs(dl)}d over`}</div>}        
          <div style={{fontSize:15,color:"rgba(255,255,255,0.18)",marginTop:3}}>{expanded?"▲":"▼"}</div>        
        </div>        
      </div>        
      {expanded&&(        
        <div style={{padding:"0 21px 21px",borderTop:`1px solid ${T.border}`}}>       
          <div style={{marginTop:13,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>       
            {[["S","Specific",goal.specific],["M","Measurable",goal.measurable],["A","Achievable",goal.achievable],["R","Relevant",goal.relevant],["T","Time-bound",goal.timebound]].map(([l,lbl,val])=>val&&(        
              <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"10px 12px",gridColumn:l==="T"?"span 2":"auto"}}>       
                <div style={{fontSize:9,color:cat.color,fontWeight:800,letterSpacing:2,marginBottom:3,textTransform:"uppercase"}}>{l} — {lbl}</div>       
                <p style={{fontSize:12,color:"rgba(255,255,255,0.58)",margin:0,lineHeight:1.45}}>{val}</p>        
              </div>        
            ))}       
          </div>        
          {goal.subtasks.length>0&&(        
            <div style={{marginTop:13}}>        
              <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Subtasks</div>       
              {goal.subtasks.map(s=>(       
                <div key={s.id} onClick={()=>onToggleSubtask(goal.id,s.id)} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.02)",marginBottom:5}}>        
                  <div style={{width:16,height:16,borderRadius:5,border:`2px solid ${s.done?cat.color:"rgba(255,255,255,0.2)"}`,background:s.done?cat.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>        
                    {s.done&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}       
                  </div>        
                  <span style={{fontSize:13,color:s.done?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.75)",textDecoration:s.done?"line-through":"none"}}>{s.label}</span>       
                </div>        
              ))}       
            </div>        
          )}        
          <div style={{marginTop:13}}>        
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginBottom:5}}><span>Progress</span><span>{pct}%</span></div>        
            <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.07)"}}><div style={{height:"100%",borderRadius:2,background:cat.color,width:`${pct}%`,transition:"width 0.6s ease"}}/></div>        
          </div>        
          <div style={{display:"flex",gap:7,marginTop:13}}>       
            <button onClick={()=>setShowJournal(j=>!j)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px",color:T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{showJournal?"Hide Journal":"📓 Journal"}</button>        
            <button onClick={()=>onEdit(goal)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px",color:T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>✏️ Edit</button>       
            <button onClick={()=>onDelete(goal.id)} style={{background:"rgba(232,100,90,0.08)",border:"1px solid rgba(232,100,90,0.2)",borderRadius:8,padding:"9px 12px",color:"#E8645A",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Delete</button>        
          </div>        
          {showJournal&&<JournalPanel goal={goal} onAddNote={onAddNote} onClose={()=>setShowJournal(false)} catColor={cat.color}/>}       
        </div>        
      )}        
    </div>        
  );        
}       


function GoalsPage({ goals, setGoals, saveGoal, deleteGoal, toggleSubtask, addJournalNote, setShowAI, setShowModal, setEditGoal, onImportDemoGoals, diary = [], user = null, onCreateGoalPrefilled }) {       
  const [activeCat, setActiveCat] = useState("all");        
  const [activePri, setActivePri] = useState("all");        
  const [search, setSearch] = useState("");       
  const filtered = goals.filter(g => (activeCat==="all"||g.category===activeCat)&&(activePri==="all"||g.priority===activePri)&&g.title.toLowerCase().includes(search.toLowerCase()));       
  const total=goals.length, completed=goals.filter(g=>{const t=g.subtasks.length,d=g.subtasks.filter(s=>s.done).length;return t>0&&d===t;}).length;       
  const overall=goals.length===0?0:Math.round(goals.reduce((a,g)=>{const t=g.subtasks.length,d=g.subtasks.filter(s=>s.done).length;return a+(t>0?d/t:0);},0)/goals.length*100);       
  const highActive=goals.filter(g=>g.priority==="High"&&calcProgress(g)<100).length;        
  return (        
    <div>       
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:20}}>       
        {[{l:"Total Goals",v:total,s:"across all areas",c:"#9B8FE8"},{l:"Completed",v:completed,s:"all subtasks done",c:"#4CAF82"},{l:"Progress",v:`${overall}%`,s:"average completion",c:"#7EB8D4"},{l:"High Priority",v:highActive,s:"still in progress",c:"#E8645A"}].map(x=>(       
          <div key={x.l} style={{background:T.card,borderRadius:13,padding:"15px 17px",border:`1px solid ${T.border}`}}>        
            <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{x.l}</div>        
            <div style={{fontSize:27,fontWeight:700,color:x.c,letterSpacing:-1}}>{x.v}</div>        
            <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:2}}>{x.s}</div>        
          </div>        
        ))}       
      </div>        
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:20}}>        
        {CATS.map(c=>{const cg=goals.filter(g=>g.category===c.id);if(!cg.length)return null;const avg=Math.round(cg.reduce((a,g)=>a+calcProgress(g),0)/cg.length);return(       
          <div key={c.id} onClick={()=>setActiveCat(ac=>ac===c.id?"all":c.id)} style={{background:activeCat===c.id?`${c.color}12`:T.card,border:`1px solid ${activeCat===c.id?c.color+"55":T.border}`,borderRadius:11,padding:"12px 13px",cursor:"pointer",transition:"all 0.2s"}}>       
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:14}}>{c.icon}</span><span style={{fontSize:11,fontWeight:700,color:c.color}}>{avg}%</span></div>       
            <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.62)",marginBottom:5}}>{c.label}</div>       
            <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)"}}><div style={{height:"100%",borderRadius:2,background:c.color,width:`${avg}%`,transition:"width 0.6s"}}/></div>       
            <div style={{fontSize:9,color:"rgba(255,255,255,0.22)",marginTop:4}}>{cg.length} goal{cg.length>1?"s":""}</div>       
          </div>        
        );})}       
      </div>        
      <div style={{display:"flex",gap:8,marginBottom:13,flexWrap:"wrap"}}>        
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="⌕  Search goals..."        
          style={{flex:"1 1 170px",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"9px 13px",color:"#fff",fontSize:12,outline:"none",fontFamily:"inherit"}}/>       
        {["all","High","Medium","Low"].map(p=>(       
          <button key={p} onClick={()=>setActivePri(p)} style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${activePri===p?"rgba(255,255,255,0.3)":T.border}`,background:activePri===p?"rgba(255,255,255,0.08)":"transparent",color:activePri===p?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>        
            {p==="all"?"All":p}       
          </button>       
        ))}       
      </div>        
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:48,marginBottom:16}}>◎</div>
          <h3 style={{color:"#fff",fontWeight:700,fontSize:18,margin:"0 0 8px"}}>No goals yet</h3>
          <p style={{color:T.muted,fontSize:13,margin:"0 0 28px",lineHeight:1.6}}>Start by creating your first SMART goal,<br/>or let the AI Coach guide you.</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setShowModal(true)} style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"12px 24px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>+ Create First Goal</button>
            <button onClick={()=>setShowAI(true)} style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.3)",borderRadius:11,padding:"12px 24px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>✦ AI Coach</button>
            {onImportDemoGoals && <button onClick={onImportDemoGoals} style={{background:"rgba(76,175,130,0.1)",border:"1px solid rgba(76,175,130,0.3)",borderRadius:11,padding:"12px 24px",color:"#4CAF82",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>⬇ Import Sample Goals</button>}
          </div>
          {onImportDemoGoals && <p style={{fontSize:11,color:"rgba(255,255,255,0.15)",marginTop:16}}>Import sample goals to explore the app — you can edit or delete them anytime.</p>}
        </div>
      )       
        :(filtered.map(g=><GoalCard key={g.id} goal={g} onToggleSubtask={toggleSubtask} onDelete={deleteGoal} onEdit={eg=>{setEditGoal(eg);setShowModal(true);}} onAddNote={addJournalNote}/>))}        
    </div>        
  );        
}       


export { GoalsPage };