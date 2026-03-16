import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID, fmtDate } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

function WeeklyWrapped({ habits, habitLogs, goals, reminders, diary, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [rateLimitChecked, setRateLimitChecked] = useState(false);
  const loadMsg = useLoadingMessage(loading);

  // Rate limit check — then auto-generate if not rate-limited
  useEffect(() => {
    const checkAndGenerate = async () => {
      if (user && user.uid !== ADMIN_UID) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid, "meta", "wrappedLastRun"));
          if (snap.exists()) {
            const next = new Date(new Date(snap.data().lastRun).getTime() + 7*24*60*60*1000);
            if (next > new Date()) {
              setNextAvailable(next);
              setRateLimitChecked(true);
              return; // rate limited — don't generate
            }
          }
        } catch(e) {}
      }
      setRateLimitChecked(true);
      generateSummary();
    };
    checkAndGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSummary = async () => {
    setLoading(true);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
    const weekDates = [];
    for (let i=6; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); weekDates.push(d.toISOString().split("T")[0]); }

    const habitCompletion = weekDates.map(d => {
      const log = habitLogs[d]||{};
      const done = habits.filter(h=>log[h.id]).length;
      return { date:d, pct: habits.length>0?Math.round(done/habits.length*100):0 };
    });
    const avgHabit = Math.round(habitCompletion.reduce((a,d)=>a+d.pct,0)/7);
    const topHabit = habits.map(h=>({...h, done:weekDates.filter(d=>habitLogs[d]?.[h.id]).length})).sort((a,b)=>b.done-a.done)[0];
    const weekReminders = reminders.filter(r=>r.createdAt >= weekDates[0]);
    const weekDiary = diary.filter(e=>e.createdAt?.split("T")[0] >= weekDates[0]);
    const goalProgress = goals.map(g=>({title:g.title,pct:calcProgress(g)})).sort((a,b)=>b.pct-a.pct).slice(0,3);

    const prompt = `Generate a "Weekly Wrapped" summary — like Spotify Wrapped but for someone's life. Make it warm, specific, and motivating.

Data:
- Habit completion avg: ${avgHabit}% this week
- Best habit: ${topHabit?.label || "none"} (${topHabit?.done || 0}/7 days)
- Reminders added this week: ${weekReminders.length} (categories: ${[...new Set(weekReminders.map(r=>r.category))].join(", ")||"none"})
- Diary entries this week: ${weekDiary.length} (${weekDiary.reduce((a,e)=>a+(e.wordCount||0),0)} total words)
- Top goal progress: ${goalProgress.map(g=>`${g.title}: ${g.pct}%`).join(", ")||"none"}

Write a 4-part weekly summary with these sections (use these exact headers):
🌟 THIS WEEK'S HIGHLIGHT
📊 BY THE NUMBERS
🔍 PATTERN SPOTTED
⚡ CHALLENGE FOR NEXT WEEK

Keep it under 250 words. Be specific, warm, and direct. Make them feel seen.`;

    try {
      const result = await callClaude(prompt, null, 500);
      setSummary(result);
      // Save rate limit timestamp
      if (user) {
        await setDoc(doc(db, "users", user.uid, "meta", "wrappedLastRun"),
          { lastRun: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    } catch(e) { setSummary(`Couldn't generate summary: ${e.message}`); }
    setLoading(false);
  };

  const parts = summary ? summary.split(/(?=🌟|📊|🔍|⚡)/).filter(Boolean) : [];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,backdropFilter:"blur(20px)"}}>
      <div style={{background:"linear-gradient(135deg,#0D0F18,#13151E)",border:"1px solid rgba(155,143,232,0.3)",borderRadius:24,width:"min(560px,96vw)",maxHeight:"85vh",overflowY:"auto",padding:"32px",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕ Close</button>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:36,marginBottom:8}}>✦</div>
          <h2 style={{fontSize:24,fontWeight:700,color:"#fff",margin:"0 0 6px",letterSpacing:-0.5}}>Weekly Wrapped</h2>
          <p style={{fontSize:12,color:T.muted,margin:0}}>Your week in review · {fmtDate(new Date(Date.now()-6*86400000).toISOString().split("T")[0])} – {fmtDate(todayStr())}</p>
        </div>
        {loading ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"40px 0"}}>
            <div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#9B8FE8",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>
            <div style={{fontSize:13,color:T.muted}}>Analyzing your week...</div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {parts.map((part,i) => (
              <div key={i} style={{background:"rgba(155,143,232,0.06)",border:"1px solid rgba(155,143,232,0.15)",borderRadius:14,padding:"16px 18px"}}>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.8)",margin:0,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{part.trim()}</p>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    </div>
  );
}


export { WeeklyWrapped };