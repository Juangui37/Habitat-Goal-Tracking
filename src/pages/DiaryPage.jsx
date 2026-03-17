import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID, fmtDate } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

function DiaryPage({ entries, saveEntry, deleteEntry, diaryPin }) {
  const [locked, setLocked] = useState(!!diaryPin);
  const [pinAttempt, setPinAttempt] = useState("");
  const [pinError, setPinError] = useState("");
  const [showWrite, setShowWrite] = useState(false);
  const [entryText, setEntryText] = useState("");
  const [entryMood, setEntryMood] = useState("good");
  const [aiLoading, setAiLoading] = useState(false);
  const [viewMode, setViewMode] = useState("timeline"); // timeline | search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [catFilter, setCatFilter] = useState("all");

  const MOODS = [
    { id:"great", label:"Great", emoji:"🌟" },
    { id:"good",  label:"Good",  emoji:"😊" },
    { id:"ok",    label:"Okay",  emoji:"😐" },
    { id:"low",   label:"Low",   emoji:"😔" },
  ];

  const unlock = () => {
    if (pinAttempt === diaryPin) { setLocked(false); setPinError(""); }
    else { setPinError("Incorrect PIN. Try again."); setPinAttempt(""); }
  };

  const categorizeEntry = async (text) => {
    const result = await callClaude(
      `Analyze this journal entry and categorize it into 1–3 of these life areas: physical, financial, religious, parenting, career, lifestyle, emotional, travel, health, social.
Journal entry: "${text.slice(0,800)}"
Return ONLY a JSON object: {"categories": ["emotional", "physical"], "summary": "one sentence capturing the main theme"}`,
      null, 300
    );
    try {
      const clean = result.replace(/```json|```/g,"").trim();
      return JSON.parse(clean);
    } catch { return { categories: ["lifestyle"], summary: "" }; }
  };

  const submitEntry = async () => {
    if (!entryText.trim() || entryText.trim().length < 10) return;
    setAiLoading(true);
    let ai = { categories: ["lifestyle"], summary: "" };
    try { ai = await categorizeEntry(entryText); } catch(e) { /* AI unavailable — save without categories */ }
    const entry = {
      id: `diary${Date.now()}`,
      text: entryText.trim(),
      mood: entryMood,
      categories: ai.categories || ["lifestyle"],
      summary: ai.summary || "",
      wordCount: entryText.trim().split(/\s+/).length,
      createdAt: new Date().toISOString(),
    };
    saveEntry(entry);
    setEntryText(""); setEntryMood("good"); setShowWrite(false);
    setAiLoading(false);
  };

  const aiSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    const entryList = entries.slice(0,50).map((e,i)=>`[${i}] ${fmtDate(e.createdAt.split("T")[0])}: ${e.text.slice(0,200)}`).join("\n\n");
    const result = await callClaude(
      `A user is searching their journal for: "${searchQuery}"
Here are their journal entries:
${entryList}
Return the indices of entries that match the search topic (0-based). Return at most 10.
Respond ONLY with JSON: {"indices": [0, 3, 5], "explanation": "Found X entries about..."}`,
      null, 400
    );
    try {
      const clean = result.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const matched = (parsed.indices || []).map(i=>entries[i]).filter(Boolean);
      setSearchResults({ entries: matched, explanation: parsed.explanation || "" });
    } catch { setSearchResults({ entries: [], explanation: "Couldn't parse results." }); }
    setSearchLoading(false);
  };

  const sortedEntries = [...entries].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const allCats = [...new Set(entries.flatMap(e=>e.categories||[]))];
  const displayedEntries = viewMode==="search" ? (searchResults?.entries || []) :
    catFilter==="all" ? sortedEntries : sortedEntries.filter(e=>(e.categories||[]).includes(catFilter));

  const catObj = (id) => CATS.find(c=>c.id===id) || { id, label:id, icon:"◎", color:"#9B8FE8" };
  const moodColors = { great:"#4CAF82", good:"#9B8FE8", ok:"#C8A96E", low:"#E87AAF" };

  // Locked state
  if (locked) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"40vh",gap:16}}>
      <div style={{fontSize:48}}>🔒</div>
      <h3 style={{fontSize:18,fontWeight:700,color:T.text,margin:0}}>Diary is locked</h3>
      <p style={{fontSize:13,color:T.muted,margin:0}}>Enter your PIN to access your entries.</p>
      <input value={pinAttempt} onChange={e=>setPinAttempt(e.target.value.replace(/\D/g,""))} type="password" inputMode="numeric" placeholder="Enter PIN"
        style={{width:180,background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:12,padding:"13px",color:T.text,fontSize:20,outline:"none",fontFamily:"inherit",textAlign:"center",letterSpacing:4}}
        onKeyDown={e=>e.key==="Enter"&&unlock()}/>
      {pinError && <div style={{color:"#E8645A",fontSize:12}}>{pinError}</div>}
      <button onClick={unlock} style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"11px 28px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>Unlock</button>
    </div>
  );

  return (
    <div>
      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:20}}>
        {[
          {l:"Entries",v:entries.length,c:"#9B8FE8"},
          {l:"Total Words",v:entries.reduce((a,e)=>a+(e.wordCount||0),0).toLocaleString(),c:"#7EB8D4"},
          {l:"This Month",v:entries.filter(e=>e.createdAt?.startsWith(new Date().toISOString().slice(0,7))).length,c:"#C8A96E"},
          {l:"Avg Mood",v:entries.filter(e=>e.mood).length>0?MOODS.find(m=>m.id===entries.slice(-7).reduce((b,e)=>{const mi=MOODS.findIndex(m=>m.id===e.mood);return mi>-1&&mi<MOODS.findIndex(m=>m.id===b)?e.mood:b;},"ok"))?.emoji||"😊":"—",c:"#E87AAF"},
        ].map(x=>(
          <div key={x.l} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{x.l}</div>
            <div style={{fontSize:22,fontWeight:700,color:x.c}}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:7}}>
          <button onClick={()=>setViewMode("timeline")} style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${viewMode==="timeline"?"rgba(255,255,255,0.3)":T.border}`,background:viewMode==="timeline"?"rgba(255,255,255,0.1)":"transparent",color:viewMode==="timeline"?T.text:T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>📅 Timeline</button>
          <button onClick={()=>setViewMode("search")} style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${viewMode==="search"?"rgba(155,143,232,0.6)":T.border}`,background:viewMode==="search"?"rgba(155,143,232,0.12)":"transparent",color:viewMode==="search"?"#9B8FE8":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>✦ AI Search</button>
        </div>
        <button onClick={()=>setShowWrite(true)}
          style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>
          + New Entry
        </button>
      </div>

      {/* AI Search bar */}
      {viewMode==="search" && (
        <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:16,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:11,color:"#9B8FE8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>✦ AI Journal Search</div>
          <p style={{fontSize:12,color:T.muted,marginBottom:12,lineHeight:1.5}}>Ask in plain language — "entries about my ex", "times I felt proud", "money stress", "moments with my kids"</p>
          <div style={{display:"flex",gap:8}}>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search your entries..."
              onKeyDown={e=>e.key==="Enter"&&aiSearch()}
              style={{flex:1,background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <button onClick={aiSearch} disabled={searchLoading||!searchQuery.trim()}
              style={{background:searchQuery.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,padding:"11px 18px",color:searchQuery.trim()?T.text:T.muted,cursor:searchQuery.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>
              {searchLoading?"Searching...":"Search"}
            </button>
          </div>
          {searchResults && (
            <div style={{marginTop:10,fontSize:12,color:"#9B8FE8",fontStyle:"italic"}}>{searchResults.explanation}</div>
          )}
        </div>
      )}

      {/* Category filter (timeline only) */}
      {viewMode==="timeline" && allCats.length > 1 && (
        <div style={{display:"flex",gap:7,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
          <button onClick={()=>setCatFilter("all")} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1px solid ${catFilter==="all"?"#9B8FE8":T.border}`,background:catFilter==="all"?"rgba(155,143,232,0.15)":"transparent",color:catFilter==="all"?"#9B8FE8":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>All</button>
          {allCats.map(id=>{
            const c = catObj(id);
            return (
              <button key={id} onClick={()=>setCatFilter(id)} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1px solid ${catFilter===id?c.color:T.border}`,background:catFilter===id?`${c.color}18`:"transparent",color:catFilter===id?c.color:T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Entry list */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {displayedEntries.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>📓</div>
            <div style={{color:T.muted,fontSize:14}}>{viewMode==="search"?"Run a search to find entries.":"No entries yet. Write your first one."}</div>
          </div>
        )}
        {displayedEntries.map(e => {
          const expanded = expandedId === e.id;
          const mood = MOODS.find(m=>m.id===e.mood)||MOODS[1];
          const dateStr = e.createdAt ? fmtDate(e.createdAt.split("T")[0]) : "";
          return (
            <div key={e.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px",transition:"all 0.2s"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:11,color:T.muted}}>{dateStr}</span>
                    <span style={{fontSize:13}}>{mood.emoji}</span>
                    {(e.categories||[]).map(c=>{
                      const cat = catObj(c);
                      return <span key={c} style={{fontSize:9,color:cat.color,background:`${cat.color}18`,padding:"2px 7px",borderRadius:5,fontWeight:700}}>{cat.icon} {cat.label}</span>;
                    })}
                    <span style={{fontSize:10,color:T.muted}}>{e.wordCount} words</span>
                  </div>
                  {e.summary && !expanded && (
                    <div style={{fontSize:12,color:T.muted,fontStyle:"italic",marginBottom:6}}>{e.summary}</div>
                  )}
                  <div style={{fontSize:13,color:T.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                    {expanded ? e.text : e.text.slice(0,180)+(e.text.length>180?"...":"")}
                  </div>
                </div>
                <button onClick={()=>deleteEntry(e.id)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,padding:"2px 4px",flexShrink:0}}>✕</button>
              </div>
              {e.text.length > 180 && (
                <button onClick={()=>setExpandedId(expanded?null:e.id)} style={{background:"none",border:"none",color:"#9B8FE8",cursor:"pointer",fontSize:11,fontWeight:600,padding:0,fontFamily:"inherit"}}>
                  {expanded?"↑ Show less":"↓ Read more"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Write Modal */}
      {showWrite && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(10px)"}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,width:"min(580px,96vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,color:T.text,fontSize:16}}>New Journal Entry</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>AI will categorize it automatically</div>
              </div>
              <button onClick={()=>setShowWrite(false)} style={{background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
              <textarea value={entryText} onChange={e=>setEntryText(e.target.value)} placeholder="What's on your mind today? Write freely — goals, reflections, wins, struggles, anything." rows={10} autoFocus
                style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:11,padding:"14px",color:T.text,fontSize:14,outline:"none",resize:"none",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.7}}/>
              <div style={{fontSize:11,color:T.muted,marginTop:6,textAlign:"right"}}>{entryText.trim().split(/\s+/).filter(Boolean).length} words</div>
              <div style={{marginTop:16}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:10,letterSpacing:1}}>HOW ARE YOU FEELING?</div>
                <div style={{display:"flex",gap:10}}>
                  {MOODS.map(m=>(
                    <button key={m.id} onClick={()=>setEntryMood(m.id)}
                      style={{flex:1,padding:"10px 8px",borderRadius:10,border:`1.5px solid ${entryMood===m.id?moodColors[m.id]:T.faint}`,background:entryMood===m.id?`${moodColors[m.id]}18`:"transparent",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                      <div style={{fontSize:18,marginBottom:3}}>{m.emoji}</div>
                      <div style={{fontSize:10,color:entryMood===m.id?moodColors[m.id]:T.muted,fontWeight:600}}>{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{padding:"16px 24px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10}}>
              <button onClick={()=>setShowWrite(false)} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:11,padding:"12px",color:T.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={submitEntry} disabled={aiLoading||entryText.trim().length<10}
                style={{flex:3,background:entryText.trim().length>=10?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,padding:"12px",color:entryText.trim().length>=10?"#fff":"rgba(255,255,255,0.2)",cursor:entryText.trim().length>=10?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
                {aiLoading?"✦ Categorizing entry...":"Save Entry →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export { DiaryPage };