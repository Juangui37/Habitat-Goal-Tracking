import { useState, useEffect, useRef } from "react";
import { T } from "../../constants/theme.js";
import { useIsMobile } from "../../utils/mobile.js";
import { CATS, todayStr } from "../../constants/index.js";
import { callClaude } from "../../utils/ai.js";

function AICoachModal({ onClose, onGoalGenerated }) {
  const CATS = [
    { id:"physical",  label:"Physical",  icon:"⚡", color:"#E8645A" },
    { id:"financial", label:"Financial", icon:"◈",  color:"#4CAF82" },
    { id:"religious", label:"Religious", icon:"✦",  color:"#C8A96E" },
    { id:"parenting", label:"Parenting", icon:"❋",  color:"#7EB8D4" },
    { id:"career",    label:"Career",    icon:"▲",  color:"#9B8FE8" },
    { id:"lifestyle", label:"Lifestyle", icon:"◎",  color:"#E8A45A" },
    { id:"emotional", label:"Emotional", icon:"◐",  color:"#E87AAF" },
    { id:"travel",    label:"Travel",    icon:"⊕",  color:"#5AC8C8" },
  ];
  const T2 = { border:"rgba(255,255,255,0.07)", muted:"rgba(255,255,255,0.38)" };

  // ── Mode: "chat" (one goal at a time) or "bulk" (paste text → many goals) ──
  const isMobile = useIsMobile();
  const [mode, setMode] = useState("chat");

  // ── Chat mode state ──
  const [msgs, setMsgs] = useState([{role:"assistant",content:"Hey! I am your SMART Goal Coach ✦\n\nDescribe a goal you are thinking about — as vague or specific as you want. I will ask the right questions and build you a complete SMART goal ready for your dashboard.\n\nOr switch to Bulk Import above to paste a block of text and I will extract all your goals at once."}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);
  const bottomRef = useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  // ── Bulk mode state ──
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkGoals, setBulkGoals] = useState([]);  // array of parsed goals
  const [bulkSelected, setBulkSelected] = useState({});
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // ── Chat mode: send one message ──
  const CHAT_SYSTEM = `You are a SMART Goal Coach inside a personal goal tracking app. Help the user define a SMART goal through natural conversation. Categories: physical, financial, religious, parenting, career, lifestyle, emotional, travel. When ready output:
<GOAL_JSON>{"title":"...","category":"physical","priority":"High","specific":"...","measurable":"...","achievable":"...","relevant":"...","timebound":"YYYY-MM-DD","subtasks":["..."]}</GOAL_JSON>
Be direct, warm, motivating.`;

  const sendChat = async () => {
    if (!input.trim() || loading) return;
    const nm = [...msgs, {role:"user", content:input.trim()}];
    setMsgs(nm); setInput(""); setLoading(true);
    try {
      const text = await callClaude(nm.map(m=>m.role+": "+m.content).join("\n"), CHAT_SYSTEM, 1000);
      const match = text.match(/<GOAL_JSON>([\s\S]*?)<\/GOAL_JSON>/);
      if (match) {
        try {
          const raw = JSON.parse(match[1].trim());
          setPending({ id:Date.now().toString(), ...raw, category:raw.category?.toLowerCase()||"physical",
            subtasks:(raw.subtasks||[]).map((s,i)=>({id:`ai${Date.now()}${i}`,label:s,done:false})),
            journal:[], createdAt:todayStr() });
        } catch(e) {}
      }
      setMsgs(prev=>[...prev,{role:"assistant",content:text.replace(/<GOAL_JSON>[\s\S]*?<\/GOAL_JSON>/g,"").trim()}]);
    } catch(e) {
      const errMsg = e?.message || String(e);
      setMsgs(prev=>[...prev,{role:"assistant",content:`Could not reach the AI: ${errMsg}. Check your API key is set in Vercel environment variables and redeploy.`}]);
    }
    setLoading(false);
  };

  // ── Bulk mode: extract all goals from pasted text ──
  const BULK_SYSTEM = `You are a SMART Goal extractor. The user will paste raw text describing their life goals — notes, journal entries, voice transcriptions, anything. Extract every distinct goal you can identify and return them as a JSON array.

Rules:
- Extract as many meaningful goals as the text contains. Be thorough.
- Each goal must be fully SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Make deadlines realistic based on context clues. Default to end of current year if unclear.
- Category must be one of: physical, financial, religious, parenting, career, lifestyle, emotional, travel
- Priority: High, Medium, or Low
- Each goal needs 4-6 specific, actionable subtasks
- Do NOT output anything except the JSON array — no preamble, no explanation

Output format (JSON array only):
[
  {
    "title": "Short action-oriented title",
    "category": "physical",
    "priority": "High",
    "specific": "...",
    "measurable": "...",
    "achievable": "...",
    "relevant": "...",
    "timebound": "YYYY-MM-DD",
    "subtasks": ["Subtask 1", "Subtask 2", "Subtask 3", "Subtask 4", "Subtask 5"]
  }
]`;

  const runBulkExtract = async () => {
    if (!bulkText.trim() || bulkLoading) return;
    setBulkLoading(true);
    setBulkGoals([]);
    setBulkSelected({});
    setBulkDone(false);
    setBulkError("");
    try {
      const prompt = `Extract all SMART goals from this text. Be thorough — find every goal, aspiration, or intention mentioned:\n\n${bulkText}`;
      const text = await callClaude(prompt, BULK_SYSTEM, 3000);
      // usage tracked server-side
      const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(clean);
      const withIds = parsed.map((g, i) => ({
        ...g,
        id: `bulk_${Date.now()}_${i}`,
        category: g.category?.toLowerCase() || "physical",
        subtasks: (g.subtasks || []).map((s, j) => ({ id:`bs${Date.now()}${i}${j}`, label:s, done:false })),
        journal: [],
        createdAt: todayStr(),
      }));
      setBulkGoals(withIds);
      // Select all by default
      const sel = {};
      withIds.forEach(g => { sel[g.id] = true; });
      setBulkSelected(sel);
    } catch(e) {
      setBulkError("Could not extract goals. Make sure your text describes actual goals or aspirations, then try again.");
      setBulkLoading(false);
      return;
    }
    setBulkLoading(false);
  };

  const toggleBulkGoal = (id) => setBulkSelected(s => ({...s, [id]: !s[id]}));

  const addSelectedGoals = () => {
    bulkGoals.filter(g => bulkSelected[g.id]).forEach(g => onGoalGenerated(g));
    setBulkDone(true);
    setTimeout(() => onClose(), 1200);
  };

  const selectedCount = Object.values(bulkSelected).filter(Boolean).length;
  const cat = pending ? (CATS.find(c=>c.id===pending.category)||CATS[0]) : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(14px)"}}>
      <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:22,width:"min(620px,96vw)",height:"min(720px,92vh)",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${T2.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#9B8FE8,#E87AAF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✦</div>
            <div>
              <div style={{fontWeight:700,color:"#fff",fontSize:14}}>SMART Goal Coach</div>
              <div style={{fontSize:10,color:T2.muted,letterSpacing:1}}>POWERED BY AI</div>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{display:"flex",background:"rgba(255,255,255,0.06)",borderRadius:10,padding:3,gap:3}}>
            {[["chat","💬 Chat"],["bulk","📋 Bulk Import"]].map(([m,label])=>(
              <button key={m} onClick={()=>setMode(m)}
                style={{padding:"6px 14px",borderRadius:8,border:"none",background:mode===m?"#9B8FE8":"transparent",color:mode===m?"#fff":T2.muted,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",transition:"all 0.2s"}}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T2.border}`,borderRadius:8,padding:"7px 14px",color:T2.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0}}>✕</button>
        </div>

        {/* ── CHAT MODE ── */}
        {mode === "chat" && (
          <>
            <div style={{flex:1,overflowY:"auto",padding:"18px 22px",display:"flex",flexDirection:"column",gap:12}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"83%",padding:"12px 15px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.05)",color:T.text,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",border:m.role==="assistant"?`1px solid ${T2.border}`:"none"}}>{m.content}</div>
                </div>
              ))}
              {loading&&<div style={{display:"flex"}}><div style={{padding:"12px 16px",borderRadius:"16px 16px 16px 4px",background:"rgba(255,255,255,0.05)",border:`1px solid ${T2.border}`,display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"rgba(155,143,232,0.8)",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div></div>}
              {pending&&cat&&(
                <div style={{background:`${cat.color}12`,border:`1px solid ${cat.color}44`,borderRadius:14,padding:16}}>
                  <div style={{fontSize:10,color:cat.color,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>✓ Goal Ready to Add</div>
                  <div style={{fontWeight:700,color:"#fff",fontSize:14,marginBottom:3}}>{pending.title}</div>
                  <div style={{fontSize:11,color:T2.muted,marginBottom:12}}>{cat.icon} {cat.label} · {pending.priority} · Due {pending.timebound}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{onGoalGenerated(pending);setPending(null);setMsgs(prev=>[...prev,{role:"assistant",content:"Done! Goal added to your dashboard. Want to create another one?"}]);}} style={{flex:1,background:cat.color,border:"none",borderRadius:10,padding:"11px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Add to Dashboard →</button>
                    <button onClick={()=>setPending(null)} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T2.border}`,borderRadius:10,padding:"11px 14px",color:T2.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Keep chatting</button>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
            <div style={{padding:"14px 22px",borderTop:`1px solid ${T2.border}`,display:"flex",gap:10}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Describe a goal you want to work toward..."
                style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${T2.border}`,borderRadius:12,padding:"12px 15px",color:T.text,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={sendChat} disabled={loading||!input.trim()} style={{background:input.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:12,padding:"0 20px",color:input.trim()?"#fff":"rgba(255,255,255,0.2)",cursor:input.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Send</button>
            </div>
          </>
        )}

        {/* ── BULK IMPORT MODE ── */}
        {mode === "bulk" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {bulkGoals.length === 0 ? (
              /* Step 1: paste text */
              <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 22px",gap:14}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>Paste anything — I will find your goals</div>
                  <p style={{fontSize:12,color:T2.muted,margin:0,lineHeight:1.6}}>Paste notes, journal entries, voice transcriptions, or anything describing what you want to achieve. The AI will extract every goal, make it SMART, and let you review before adding.</p>
                </div>
                <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)}
                  placeholder={"Examples:\n• Your GOALS.txt file\n• A brain dump of things you want to accomplish\n• A journal entry about your aspirations\n• Notes from a therapy session\n• A voice-to-text recording of your thoughts\n\nPaste it all — the messier the better."}
                  style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${T2.border}`,borderRadius:12,padding:"14px 16px",color:T.text,fontSize:13,outline:"none",resize:"none",fontFamily:"inherit",lineHeight:1.6}}/>
                {bulkError && <div style={{background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.3)",borderRadius:10,padding:"12px 14px",color:"#E8645A",fontSize:12,lineHeight:1.5}}>{bulkError}</div>}
                <button onClick={runBulkExtract} disabled={bulkLoading||!bulkText.trim()}
                  style={{background:bulkText.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:12,padding:"14px",color:bulkText.trim()?"#fff":"rgba(255,255,255,0.2)",cursor:bulkText.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:14,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  {bulkLoading
                    ? <><div style={{display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"rgba(255,255,255,0.8)",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div> Reading your goals...</>
                    : "✦ Extract My Goals"}
                </button>
              </div>
            ) : bulkDone ? (
              /* Done state */
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
                <div style={{fontSize:40}}>🎉</div>
                <div style={{fontSize:18,fontWeight:700,color:T.text}}>{selectedCount} goal{selectedCount!==1?"s":""} added!</div>
                <p style={{fontSize:13,color:T2.muted,textAlign:"center"}}>Head to your Goals tab to review and edit them.</p>
              </div>
            ) : (
              /* Step 2: review extracted goals */
              <>
                <div style={{padding:"14px 22px",borderBottom:`1px solid ${T2.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Found {bulkGoals.length} goals</div>
                    <div style={{fontSize:11,color:T2.muted}}>Deselect any you don't want, then add all at once</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setBulkGoals([]);setBulkText("");}} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T2.border}`,borderRadius:9,padding:"8px 14px",color:T2.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>← Start over</button>
                    <button onClick={addSelectedGoals} disabled={selectedCount===0}
                      style={{background:selectedCount>0?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:9,padding:"8px 18px",color:selectedCount>0?"#fff":"rgba(255,255,255,0.2)",cursor:selectedCount>0?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
                      Add {selectedCount} Goal{selectedCount!==1?"s":""} →
                    </button>
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"14px 22px",display:"flex",flexDirection:"column",gap:10}}>
                  {bulkGoals.map(g => {
                    const on = !!bulkSelected[g.id];
                    const c = CATS.find(x=>x.id===g.category)||CATS[0];
                    return (
                      <div key={g.id} onClick={()=>toggleBulkGoal(g.id)}
                        style={{background:on?`${c.color}0E`:"rgba(255,255,255,0.02)",border:`1.5px solid ${on?c.color+"55":T2.border}`,borderRadius:13,padding:"14px 16px",cursor:"pointer",transition:"all 0.2s"}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                          {/* Checkbox */}
                          <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?c.color:"rgba(255,255,255,0.2)"}`,background:on?c.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,transition:"all 0.2s"}}>
                            {on&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,background:`${c.color}20`,color:c.color,padding:"2px 8px",borderRadius:20,fontWeight:700}}>{c.icon} {c.label}</span>
                              <span style={{fontSize:10,color:g.priority==="High"?"#E8645A":g.priority==="Medium"?"#C8A96E":"#4CAF82",fontWeight:600}}>{g.priority}</span>
                              <span style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>Due {g.timebound}</span>
                            </div>
                            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>{g.title}</div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.4,marginBottom:6}}>{g.specific}</div>
                            {g.subtasks.length>0&&(
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                {g.subtasks.slice(0,3).map((s,i)=>(
                                  <span key={i} style={{fontSize:10,background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.45)",padding:"2px 8px",borderRadius:20}}>→ {s.label||s}</span>
                                ))}
                                {g.subtasks.length>3&&<span style={{fontSize:10,color:"rgba(255,255,255,0.25)",padding:"2px 6px"}}>+{g.subtasks.length-3} more</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    </div>
  );
}


export { AICoachModal };