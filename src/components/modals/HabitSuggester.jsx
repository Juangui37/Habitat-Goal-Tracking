import { useState, useEffect } from "react";
import { T } from "../../constants/theme.js";
import { useIsMobile } from "../../utils/mobile.js";
import { CATS, HAB_CATS, todayStr } from "../../constants/index.js";
import { callClaude, useLoadingMessage } from "../../utils/ai.js";

function HabitSuggester({ goal, existingHabits, onAdd, onClose }) {       
  const isMobile = useIsMobile();
  const [suggestions, setSuggestions] = useState([]);       
  const [selected, setSelected] = useState({});       
  const [loading, setLoading] = useState(true);       
  const [error, setError] = useState("");       
  const cat = CATS.find(c => c.id === goal.category) || CATS[0];        
  useEffect(() => {       
    const fetch_ = async () => {        
      const existingLabels = existingHabits.map(h => h.label).join(", ");       
      const prompt = `You are a habit coach. A user just created this goal:       
Title: ${goal.title}        
Category: ${goal.category}        
Specific: ${goal.specific}        
Measurable: ${goal.measurable}        
Achievable: ${goal.achievable}        
Relevant: ${goal.relevant}        
Deadline: ${goal.timebound}       
Their existing habits already tracked: ${existingLabels || "none yet"}        
Suggest 4-6 daily or weekly habits that directly support this goal. Do NOT repeat existing habits. Make them specific, actionable, and realistic for a busy single father who is an athlete.        
Respond ONLY with a JSON array, no markdown, no explanation:        
[       
  {"label": "habit name", "category": "morning|night|fitness|nutrition", "icon": "single emoji", "color": "#hexcolor"},       
  ...       
]       
Category must be one of: morning, night, fitness, nutrition.        
Color should match: morning=#C8A96E, night=#9B8FE8, fitness=#E8645A, nutrition=#4CAF82.       
Keep labels concise (under 40 chars).`;       
      try {       
        const text = await callClaude(prompt, null, 600);       
        const clean = text.replace(/```json|```/g, "").trim();        
        const parsed = JSON.parse(clean);       
        const withIds = parsed.map((s, i) => ({ ...s, id: `sug_${Date.now()}_${i}` }));       
        setSuggestions(withIds);        
        // Select all by default        
        const sel = {};       
        withIds.forEach(s => { sel[s.id] = true; });        
        setSelected(sel);       
      } catch (e) {       
        setError("Couldn't generate suggestions. Try again.");        
      }       
      setLoading(false);        
    };        
    fetch_();       
  }, []);       
  const toggleSel = (id) => setSelected(s => ({ ...s, [id]: !s[id] }));       
  const handleAdd = () => {       
    const toAdd = suggestions       
      .filter(s => selected[s.id])        
      .map(s => ({ id: `h_${Date.now()}_${Math.random().toString(36).slice(2)}`, label: s.label, category: s.category, icon: s.icon, color: s.color }));        
    onAdd(toAdd);       
    onClose();        
  };        
  const selectedCount = Object.values(selected).filter(Boolean).length;       
  return (        
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:"blur(12px)" }}>       
      <div style={{ background:T.card,border:`1px solid ${cat.color}44`,borderRadius:22,width:"min(500px,95vw)",padding:"32px",position:"relative" }}>        
        {/* Header */}        
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6 }}>        
          <div style={{ width:38,height:38,borderRadius:11,background:`${cat.color}22`,border:`1px solid ${cat.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{cat.icon}</div>       
          <div>       
            <div style={{ fontSize:10,color:cat.color,fontWeight:700,letterSpacing:2,textTransform:"uppercase" }}>AI Habit Suggester</div>        
            <div style={{ fontSize:15,fontWeight:700,color:T.text,marginTop:1 }}>Habits for this goal</div>       
          </div>        
        </div>        
        <p style={{ fontSize:12,color:T.muted,marginBottom:20,lineHeight:1.5 }}>        
          Based on <span style={{ color:"#fff",fontWeight:600 }}>"{goal.title}"</span> — here are habits that will directly support it. Deselect any you don't want.        
        </p>        
        {/* Loading */}       
        {loading && (       
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 0",gap:14 }}>       
            <div style={{ display:"flex",gap:6 }}>        
              {[0,1,2].map(i => <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:cat.color,animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s` }}/>)}        
            </div>        
            <div style={{ fontSize:12,color:T.muted }}>Generating personalized habits...</div>        
          </div>        
        )}        
        {/* Error */}       
        {error && <div style={{ background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.2)",borderRadius:10,padding:"14px",color:"#E8645A",fontSize:13,marginBottom:16 }}>{error}</div>}        
        {/* Suggestions */}       
        {!loading && !error && (        
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:20,maxHeight:320,overflowY:"auto" }}>        
            {suggestions.map(s => {       
              const on = !!selected[s.id];        
              return (        
                <div key={s.id} onClick={() => toggleSel(s.id)}       
                  style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:11,background:on?`${s.color}10`:"rgba(255,255,255,0.03)",border:`1.5px solid ${on?s.color+"55":T.border}`,cursor:"pointer",transition:"all 0.2s" }}>        
                  <div style={{ width:22,height:22,borderRadius:6,border:`2px solid ${on?s.color:"rgba(255,255,255,0.2)"}`,background:on?s.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s" }}>        
                    {on && <span style={{ color:"#fff",fontSize:11,fontWeight:800 }}>✓</span>}        
                  </div>        
                  <span style={{ fontSize:18,flexShrink:0 }}>{s.icon}</span>        
                  <div style={{ flex:1 }}>        
                    <div style={{ fontSize:13,fontWeight:600,color:on?"#fff":"rgba(255,255,255,0.55)" }}>{s.label}</div>        
                    <div style={{ fontSize:10,color:s.color,marginTop:1,textTransform:"capitalize" }}>        
                      {HAB_CATS.find(c=>c.id===s.category)?.label || s.category}        
                    </div>        
                  </div>        
                </div>        
              );        
            })}       
          </div>        
        )}        
        {/* Actions */}       
        <div style={{ display:"flex",gap:10 }}>       
          <button onClick={onClose} style={{ flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:11,padding:"12px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit" }}>        
            Skip        
          </button>       
          {!loading && !error && (        
            <button onClick={handleAdd} disabled={selectedCount===0}        
              style={{ flex:2,background:selectedCount>0?cat.color:"rgba(255,255,255,0.08)",border:"none",borderRadius:11,padding:"12px",color:selectedCount>0?"#fff":"rgba(255,255,255,0.2)",cursor:selectedCount>0?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit",transition:"all 0.2s" }}>        
              Add {selectedCount} Habit{selectedCount!==1?"s":""}  →        
            </button>       
          )}        
        </div>        
        <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>       
      </div>        
    </div>        
  );        
}       


export { HabitSuggester };