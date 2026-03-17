import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

function RemindersPage({ reminders, saveReminder, deleteReminder, toggleReminder }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newDue, setNewDue] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | pending | done
  const [catFilter, setCatFilter] = useState("all");

  const categorize = async (text) => {
    setAiLoading(true);
    try {
      const result = await callClaude(
        `Categorize this reminder into one of these life areas: physical, financial, religious, parenting, career, lifestyle, emotional, travel, health, social.
Reminder: "${text}"
Also write a one-sentence note about why it fits that category and how it might connect to a larger life goal.
Respond ONLY with JSON: {"category": "...", "note": "..."}`,
        null, 200
      );
      const clean = result.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      return parsed;
    } catch(e) {
      return { category: "lifestyle", note: "Added to your reminders." };
    } finally {
      setAiLoading(false);
    }
  };

  const addReminder = async () => {
    if (!newText.trim()) return;
    const ai = await categorize(newText);
    const r = {
      id: `r${Date.now()}`,
      text: newText.trim(),
      done: false,
      createdAt: todayStr(),
      dueDate: newDue || null,
      category: ai.category,
      aiNote: ai.note,
    };
    saveReminder(r);
    setNewText(""); setNewDue(""); setShowAdd(false);
  };

  const allCats = [...new Set(reminders.map(r=>r.category))];
  const catObj = (id) => CATS.find(c=>c.id===id) || { id, label:id, icon:"◎", color:"#9B8FE8" };
  const filtered = reminders
    .filter(r => filter==="all" || (filter==="pending"?!r.done:r.done))
    .filter(r => catFilter==="all" || r.category===catFilter)
    .sort((a,b)=>{
      if (a.done !== b.done) return a.done?1:-1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate)-new Date(b.dueDate);
      if (a.dueDate) return -1; if (b.dueDate) return 1;
      return new Date(b.createdAt)-new Date(a.createdAt);
    });

  const pending = reminders.filter(r=>!r.done).length;
  const overdueCount = reminders.filter(r=>!r.done && r.dueDate && new Date(r.dueDate) < new Date()).length;

  return (
    <div>
      {/* Header stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginBottom:20}}>
        {[
          {l:"Pending",v:pending,c:"#9B8FE8"},
          {l:"Overdue",v:overdueCount,c:"#E8645A"},
          {l:"Completed",v:reminders.filter(r=>r.done).length,c:"#4CAF82"},
        ].map(x=>(
          <div key={x.l} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{x.l}</div>
            <div style={{fontSize:26,fontWeight:700,color:x.c}}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:7}}>
          {["all","pending","done"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${filter===f?"rgba(255,255,255,0.3)":T.border}`,background:filter===f?"rgba(255,255,255,0.1)":"transparent",color:filter===f?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",textTransform:"capitalize"}}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowAdd(true)}
          style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>
          + Add Reminder
        </button>
      </div>

      {/* Category filter pills */}
      {allCats.length > 1 && (
        <div style={{display:"flex",gap:7,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
          <button onClick={()=>setCatFilter("all")} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1px solid ${catFilter==="all"?"#9B8FE8":T.border}`,background:catFilter==="all"?"rgba(155,143,232,0.15)":"transparent",color:catFilter==="all"?"#9B8FE8":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>All</button>
          {allCats.map(id=>{
            const c = catObj(id);
            return (
              <button key={id} onClick={()=>setCatFilter(id)}
                style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1px solid ${catFilter===id?c.color:T.border}`,background:catFilter===id?`${c.color}18`:"transparent",color:catFilter===id?c.color:T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Reminder list */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>🔔</div>
            <div style={{color:T.muted,fontSize:14}}>No reminders here. Add one to get started.</div>
          </div>
        )}
        {filtered.map(r => {
          const cat = catObj(r.category);
          const isOverdue = r.dueDate && !r.done && new Date(r.dueDate) < new Date();
          const isDueToday = r.dueDate === todayStr() && !r.done;
          return (
            <div key={r.id} style={{background:T.card,border:`1px solid ${r.done?"rgba(76,175,130,0.2)":isOverdue?"rgba(232,100,90,0.25)":T.border}`,borderRadius:14,padding:"15px 16px",opacity:r.done?0.6:1}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                {/* Checkbox */}
                <div onClick={()=>toggleReminder(r.id)} style={{width:24,height:24,borderRadius:7,border:`2px solid ${r.done?"#4CAF82":"rgba(255,255,255,0.25)"}`,background:r.done?"#4CAF82":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2,transition:"all 0.2s"}}>
                  {r.done&&<span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,color:r.done?"rgba(255,255,255,0.4)":T.text,textDecoration:r.done?"line-through":"none",marginBottom:5}}>{r.text}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:10,color:cat.color,background:`${cat.color}18`,padding:"2px 8px",borderRadius:6,fontWeight:700}}>{cat.icon} {cat.label}</span>
                    {r.dueDate && (
                      <span style={{fontSize:10,color:isOverdue?"#E8645A":isDueToday?"#C8A96E":T.muted,fontWeight:isOverdue||isDueToday?700:400}}>
                        {isOverdue?"⚠️ Overdue":isDueToday?"📅 Due today":""} {fmtDate(r.dueDate)}
                      </span>
                    )}
                  </div>
                  {r.aiNote && (
                    <div style={{fontSize:11,color:T.muted,marginTop:6,fontStyle:"italic",borderLeft:`2px solid ${cat.color}44`,paddingLeft:8}}>
                      ✦ {r.aiNote}
                    </div>
                  )}
                </div>
                <button onClick={()=>deleteReminder(r.id)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:"2px 4px",flexShrink:0}}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(10px)"}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,width:"min(460px,95vw)",padding:"28px"}}>
            <h3 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:6}}>New Reminder</h3>
            <p style={{fontSize:12,color:T.muted,marginBottom:18}}>AI will auto-categorize this into a life area for your weekly summary.</p>
            <textarea value={newText} onChange={e=>setNewText(e.target.value)} placeholder="What do you need to remember?" rows={3} autoFocus
              style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:11,padding:"12px 15px",color:T.text,fontSize:14,outline:"none",resize:"vertical",marginBottom:12,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:6,letterSpacing:1}}>DUE DATE (optional)</div>
              <input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)}
                style={{background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"10px 14px",color:T.text,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowAdd(false);setNewText("");setNewDue("");}} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={addReminder} disabled={aiLoading||!newText.trim()}
                style={{flex:2,background:newText.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,padding:"12px",color:newText.trim()?"#fff":"rgba(255,255,255,0.2)",cursor:newText.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
                {aiLoading?"✦ Categorizing...":"Add Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export { RemindersPage };