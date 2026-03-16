import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

function AnalyticsPage({ habits, habitLogs, goals, reminders = [], diary = [], user = null }) {
  const [analyticsTab, setAnalyticsTab] = useState("goals");
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [insightTimestamp, setInsightTimestamp] = useState(null);
  const aiLoadMsg = useLoadingMessage(aiLoading);
  const [period, setPeriod] = useState("month");
  const [filterHabit, setFilterHabit] = useState("all");
  const [selectedHabitsChart, setSelectedHabitsChart] = useState([]);

  const getDates = (p) => {
    const dates = [], d = new Date();
    const n = p==="week"?7:p==="month"?30:p==="quarter"?90:p==="halfyear"?180:365;
    for (let i=n-1;i>=0;i--) { const dd=new Date(d); dd.setDate(d.getDate()-i); dates.push(dd.toISOString().split("T")[0]); }
    return dates;
  };
  const dates = getDates(period);

  const dailyData = dates.map(date => {
    const log = habitLogs[date]||{};
    const scheduled = habits.filter(h => {
      const sched = h.schedule || "daily";
      const dow = new Date(date + "T12:00:00").getDay();
      if (sched==="daily") return true;
      if (sched==="weekdays") return dow>=1&&dow<=5;
      if (sched==="weekends") return dow===0||dow===6;
      if (sched==="custom") return (h.customDays||[]).includes(dow);
      return true;
    });
    const done = scheduled.filter(h=>log[h.id]).length;
    return { date, done, total:scheduled.length, pct:scheduled.length>0?Math.round(done/scheduled.length*100):0 };
  });

  const habitStats = habits.map(h => {
    const applicableDates = dates.filter(d => {
      const sched = h.schedule || "daily";
      const dow = new Date(d + "T12:00:00").getDay();
      if (sched==="daily") return true;
      if (sched==="weekdays") return dow>=1&&dow<=5;
      if (sched==="weekends") return dow===0||dow===6;
      if (sched==="custom") return (h.customDays||[]).includes(dow);
      return true;
    });
    const done = applicableDates.filter(d=>habitLogs[d]?.[h.id]).length;
    return { ...h, done, applicable: applicableDates.length, pct: applicableDates.length>0?Math.round(done/applicableDates.length*100):0 };
  }).sort((a,b)=>b.pct-a.pct);

  const allHabCats = [...new Set(habits.map(h=>h.category))].map(id => HAB_CATS.find(c=>c.id===id) || {id,label:id,color:"#9B8FE8",icon:"◎"});

  const catStats = allHabCats.map(cat => {
    const ch = habits.filter(h=>h.category===cat.id);
    const avg = ch.length>0 ? Math.round(ch.reduce((a,h)=>{
      const hs = habitStats.find(x=>x.id===h.id);
      return a + (hs?.pct||0);
    },0)/ch.length) : 0;
    return {...cat, avg, count:ch.length};
  });

  // Weekday vs weekend breakdown
  const dayOfWeekData = DAY_LABELS.map((label, dow) => {
    const dowDates = dates.filter(d => new Date(d+"T12:00:00").getDay() === dow);
    const avg = dowDates.length > 0 ? Math.round(dowDates.reduce((a,d) => {
      const dd = dailyData.find(x=>x.date===d);
      return a + (dd?.pct||0);
    },0)/dowDates.length) : 0;
    return { label, dow, avg, count: dowDates.length };
  });

  // Streak data per habit
  const getStreakData = (hid) => {
    let streak = 0, best = 0, cur = 0;
    const sorted = [...dates].reverse();
    for (let i=0; i<sorted.length; i++) {
      if (habitLogs[sorted[i]]?.[hid]) {
        cur++;
        if (i===0) streak = cur;
        best = Math.max(best, cur);
      } else {
        if (i>0) cur = 0;
      }
    }
    return { streak, best };
  };

  // Goals analytics
  const goalStats = goals.map(g => ({...g, pct:calcProgress(g)})).sort((a,b)=>b.pct-a.pct);
  const byCategory = CATS.map(cat => {
    const cg = goals.filter(g=>g.category===cat.id);
    const avg = cg.length>0 ? Math.round(cg.reduce((a,g)=>a+calcProgress(g),0)/cg.length) : 0;
    const highCount = cg.filter(g=>g.priority==="High").length;
    return {...cat, count:cg.length, avg, highCount};
  }).filter(c=>c.count>0);
  const overallGoalPct = goals.length>0 ? Math.round(goals.reduce((a,g)=>a+calcProgress(g),0)/goals.length) : 0;
  const daysLeftData = goals.filter(g=>g.timebound).map(g=>({...g, days:daysLeft(g.timebound)})).sort((a,b)=>a.days-b.days);
  const onTrack = goals.filter(g=>calcProgress(g)>=50).length;
  const needsWork = goals.filter(g=>calcProgress(g)<25 && g.subtasks.length>0).length;

  const getAIInsight = async (forceRefresh = false) => {
    // Check Firestore cache first (24hr TTL)
    if (!forceRefresh && user) {
      try {
        const cacheKey = `insight_${analyticsTab}_${period}`;
        const snap = await getDoc(doc(db, "users", user.uid, "aiCache", cacheKey));
        if (snap.exists()) {
          const cached = snap.data();
          const age = Date.now() - new Date(cached.generatedAt).getTime();
          if (age < 24 * 60 * 60 * 1000) {
            setAiInsight(cached.text);
            setInsightTimestamp(cached.generatedAt);
            return;
          }
        }
      } catch(e) { /* cache miss — proceed to generate */ }
    }

    setAiLoading(true); setAiInsight(""); setInsightTimestamp(null);
    const topHabits = habitStats.slice(0,5).map(h=>`${h.label}: ${h.pct}%`).join(", ");
    const lowHabits = [...habitStats].sort((a,b)=>a.pct-b.pct).slice(0,3).map(h=>`${h.label}: ${h.pct}%`).join(", ");
    const goalSummary = goals.slice(0,5).map(g=>`${g.title}: ${calcProgress(g)}%`).join("; ");
    const avgPct = Math.round(dailyData.reduce((a,d)=>a+d.pct,0)/Math.max(dailyData.length,1));

    let prompt = "";
    if (analyticsTab === "habits") {
      prompt = `Personal performance coach. Habit data for ${period}: Top habits: ${topHabits}. Needs work: ${lowHabits}. Avg daily completion: ${avgPct}%. Write warm, direct 3-paragraph insight: celebrate what's working, identify key pattern, give one concrete action. Under 200 words.`;
    } else if (analyticsTab === "goals") {
      prompt = `Personal performance coach. Goal progress: ${goalSummary}. Overall avg: ${overallGoalPct}%. ${onTrack} on track, ${needsWork} need attention. Write warm, direct 3-paragraph insight: celebrate momentum, identify key gap, give one focused action. Under 200 words.`;
    } else if (analyticsTab === "journal") {
      const moodCounts = diary.reduce((acc,e)=>{acc[e.mood||"neutral"]=(acc[e.mood||"neutral"]||0)+1;return acc;},{});
      const topMoods = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).map(([m,c])=>`${m}:${c}`).join(", ");
      const catCounts = diary.flatMap(e=>e.categories||[]).reduce((acc,c)=>{acc[c]=(acc[c]||0)+1;return acc;},{});
      const topCats = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([c,n])=>`${c}:${n}`).join(", ");
      prompt = `Personal growth coach analyzing journal. ${diary.length} entries. Moods: ${topMoods}. Topics: ${topCats}. Total words: ${diary.reduce((a,e)=>a+(e.wordCount||0),0)}. Write warm 3-paragraph reflection: what writing reveals, themes emerging, one journaling prompt for this week. Under 200 words.`;
    } else if (analyticsTab === "reminders") {
      const done = reminders.filter(r=>r.done).length;
      const catBreak = reminders.reduce((acc,r)=>{const c=r.category||"general";acc[c]=(acc[c]||0)+1;return acc;},{});
      const catSummary = Object.entries(catBreak).map(([c,n])=>`${c}:${n}`).join(", ");
      prompt = `Productivity coach. Reminders: ${done}/${reminders.length} completed. Categories: ${catSummary}. Recent: ${reminders.slice(0,5).map(r=>r.text).join("; ")}. Write warm 3-paragraph insight: what reminders reveal about priorities, patterns, one follow-through suggestion. Under 200 words.`;
    }

    try {
      const text = await callClaude(prompt, null, 400);
      setAiInsight(text);
      const now = new Date().toISOString();
      setInsightTimestamp(now);
      // Cache in Firestore
      if (user) {
        const cacheKey = `insight_${analyticsTab}_${period}`;
        await setDoc(doc(db, "users", user.uid, "aiCache", cacheKey), {
          text, generatedAt: now, tab: analyticsTab, period
        }).catch(()=>{});
      }
    } catch(e) { setAiInsight(`Could not generate insight: ${e.message}`); }
    setAiLoading(false);
  };

  const maxBar = Math.max(...dailyData.map(d=>d.pct),1);
  // Longest streak ever per habit
  const getLongestStreak = (hid) => {
    let longest = 0, current = 0;
    const allDates = Object.keys(habitLogs).sort();
    for (const date of allDates) {
      if (habitLogs[date]?.[hid]) { current++; longest = Math.max(longest, current); }
      else { current = 0; }
    }
    return longest;
  };

  // Best day of week (0=Sun...6=Sat)
  const getBestDay = (hid) => {
    const counts = [0,0,0,0,0,0,0], totals = [0,0,0,0,0,0,0];
    for (const [date, log] of Object.entries(habitLogs)) {
      const dow = new Date(date+"T12:00:00").getDay();
      totals[dow]++;
      if (log[hid]) counts[dow]++;
    }
    const rates = totals.map((t,i)=>t>2?counts[i]/t:0);
    const best = rates.indexOf(Math.max(...rates));
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][best];
  };

  const filteredHabits = filterHabit==="all" ? habitStats : habitStats.filter(h=>h.id===filterHabit);

  const StatCard = ({label,value,sub,color}) => (
    <div style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
      <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color,letterSpacing:-1}}>{value}</div>
      <div style={{fontSize:10,color:T.muted,marginTop:2}}>{sub}</div>
    </div>
  );

  return (
    <div>
      {/* Analytics Tab Toggle */}
      <div style={{display:"flex",background:T.surface,borderRadius:14,padding:4,border:`1px solid ${T.border}`,marginBottom:20,width:"fit-content"}}>
        {[["goals","◎ Goals"],["habits","✦ Habits"],["reminders","🔔 Reminders"],["journal","📓 Journal"]].map(([id,label])=>(
          <button key={id} onClick={()=>setAnalyticsTab(id)}
            style={{padding:"9px 28px",borderRadius:11,border:"none",background:analyticsTab===id?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"transparent",color:analyticsTab===id?"#fff":T.muted,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",transition:"all 0.2s"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Period selector + AI */}
      <div style={{display:"flex",gap:7,marginBottom:18,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {[["week","7D"],["month","30D"],["quarter","90D"],["halfyear","6M"],["year","1Y"]].map(([k,l])=>(
            <button key={k} onClick={()=>setPeriod(k)} style={{padding:"7px 13px",borderRadius:9,border:`1px solid ${period===k?"rgba(255,255,255,0.35)":T.border}`,background:period===k?"rgba(255,255,255,0.1)":"transparent",color:period===k?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <button onClick={()=>getAIInsight(true)} disabled={aiLoading}
            style={{background:"linear-gradient(135deg,#9B8FE8,#E87AAF)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",cursor:aiLoading?"not-allowed":"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",opacity:aiLoading?0.7:1}}>
            {aiLoading?"Analyzing...":aiInsight?"↺ Refresh Insight":"✦ AI Insight"}
          </button>
          {insightTimestamp&&!aiLoading&&<span style={{fontSize:10,color:T.muted}}>Updated {new Date(insightTimestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>
      </div>

      {/* AI Insight */}
      {(aiInsight||aiLoading)&&(
        <div style={{background:"linear-gradient(135deg,rgba(155,143,232,0.1),rgba(232,122,175,0.08))",border:"1px solid rgba(155,143,232,0.3)",borderRadius:14,padding:"20px 22px",marginBottom:18}}>
          <div style={{fontSize:10,color:"#9B8FE8",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>✦ AI Coach Insight</div>
          {aiLoading?<div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"rgba(155,143,232,0.8)",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div><span style={{fontSize:12,color:"rgba(155,143,232,0.7)"}}>{aiLoadMsg}</span></div>
            :<p style={{fontSize:13,color:T.muted,margin:0,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiInsight}</p>}
        </div>
      )}

      {/* ── HABITS ANALYTICS ── */}
      {analyticsTab === "habits" && (
        <div>
          {/* Summary stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18}}>
            <StatCard label="Avg Daily" value={`${Math.round(dailyData.reduce((a,d)=>a+d.pct,0)/Math.max(dailyData.length,1))}%`} sub={`over ${dates.length} days`} color="#9B8FE8"/>
            <StatCard label="Best Day" value={`${Math.max(...dailyData.map(d=>d.pct),0)}%`} sub="single day high" color="#4CAF82"/>
            <StatCard label="Perfect Days" value={dailyData.filter(d=>d.pct===100).length} sub="100% completion" color="#C8A96E"/>
            <StatCard label="Active Habits" value={habits.length} sub="being tracked" color="#7EB8D4"/>
          </div>

          {/* Daily bar chart */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Daily Completion Rate</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:period==="year"?1:period==="halfyear"?2:period==="quarter"?2:3,height:90,overflow:"hidden"}}>
              {dailyData.map((d,i)=>(
                <div key={i} title={`${d.date}: ${d.pct}% (${d.done}/${d.total})`}
                  style={{flex:1,minWidth:0,background:d.pct===100?"#4CAF82":d.pct>70?"#9B8FE8":d.pct>40?"#C8A96E":"rgba(255,255,255,0.1)",borderRadius:"2px 2px 0 0",height:`${Math.max((d.pct/maxBar)*100,d.pct>0?4:2)}%`,transition:"height 0.3s",cursor:"pointer"}}/>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
              <span style={{fontSize:10,color:T.muted}}>{dates[0]}</span>
              <span style={{fontSize:10,color:T.muted}}>{dates[dates.length-1]}</span>
            </div>
            <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
              {[["#4CAF82","100%"],["#9B8FE8",">70%"],["#C8A96E",">40%"],["rgba(255,255,255,0.2)","<40%"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:10,height:10,borderRadius:2,background:c}}/>
                  <span style={{fontSize:10,color:T.muted}}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day-of-week breakdown */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Best Days of the Week</div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end",height:80}}>
              {dayOfWeekData.map((d,i) => {
                const isWeekend = d.dow===0||d.dow===6;
                const color = isWeekend ? "#7EB8D4" : "#9B8FE8";
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                    <span style={{fontSize:10,color:color,fontWeight:700}}>{d.avg}%</span>
                    <div style={{width:"100%",borderRadius:"3px 3px 0 0",background:color,height:`${Math.max(d.avg,3)}%`,minHeight:4,transition:"height 0.5s"}}/>
                    <span style={{fontSize:10,color:T.muted}}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Completion by Category</div>
            {catStats.map(c=>(
              <div key={c.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:13,color:T.muted,fontWeight:600}}>{c.icon} {c.label} <span style={{color:T.muted,fontWeight:400,fontSize:11}}>({c.count} habits)</span></span>
                  <span style={{fontSize:12,fontWeight:700,color:c.color}}>{c.avg}%</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.07)"}}>
                  <div style={{height:"100%",borderRadius:3,background:c.color,width:`${c.avg}%`,transition:"width 0.6s ease"}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Per-habit performance + streaks */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase"}}>Habit Leaderboard</div>
              <select value={filterHabit} onChange={e=>setFilterHabit(e.target.value)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",color:T.muted,fontSize:11,outline:"none",fontFamily:"inherit"}}>
                <option value="all">All habits</option>
                {habits.map(h=><option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </div>
            {filteredHabits.map((h,i)=>{
              const {streak,best} = getStreakData(h.id);
              return (
                <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${i<filteredHabits.length-1?T.border:"transparent"}`}}>
                  <span style={{fontSize:11,color:T.muted,width:18,textAlign:"right",fontWeight:700}}>{i+1}</span>
                  <span style={{fontSize:16}}>{h.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:"#fff",fontWeight:600,marginBottom:3}}>{h.label}</div>
                    <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>
                      <div style={{height:"100%",borderRadius:2,background:h.pct>=80?"#4CAF82":h.pct>=50?"#C8A96E":"#E8645A",width:`${h.pct}%`,transition:"width 0.6s"}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    {streak>0&&<span style={{fontSize:10,color:"#E8A45A"}}>🔥 {streak}d</span>}
                    <span style={{fontSize:11,fontWeight:700,color:h.pct>=80?"#4CAF82":h.pct>=50?"#C8A96E":"#E8645A",minWidth:36,textAlign:"right"}}>{h.pct}%</span>
                    <span style={{fontSize:10,color:T.muted,minWidth:50,textAlign:"right"}}>{h.done}/{h.applicable}d</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consistency heatmap-style last 4 weeks */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Last 28 Days — Heatmap</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {getDates("month").map((d,i)=>{
                const dd = dailyData.find(x=>x.date===d);
                const pct = dd?.pct||0;
                const bg = pct===100?"#4CAF82":pct>70?"#9B8FE8":pct>40?"#C8A96E":pct>0?"rgba(155,143,232,0.2)":"rgba(255,255,255,0.05)";
                return <div key={i} title={`${d}: ${pct}%`} style={{width:28,height:28,borderRadius:5,background:bg,cursor:"default"}}/>;
              })}
            </div>
            <div style={{display:"flex",gap:10,marginTop:10,alignItems:"center"}}>
              <span style={{fontSize:10,color:T.muted}}>Less</span>
              {["rgba(255,255,255,0.05)","rgba(155,143,232,0.2)","#C8A96E","#9B8FE8","#4CAF82"].map((c,i)=>(
                <div key={i} style={{width:14,height:14,borderRadius:3,background:c}}/>
              ))}
              <span style={{fontSize:10,color:T.muted}}>More</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GOALS ANALYTICS ── */}
      {analyticsTab === "goals" && (
        <div>
          {/* Summary stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18}}>
            <StatCard label="Overall Progress" value={`${overallGoalPct}%`} sub="across all goals" color="#9B8FE8"/>
            <StatCard label="On Track" value={onTrack} sub="≥50% complete" color="#4CAF82"/>
            <StatCard label="Needs Attention" value={needsWork} sub="<25% complete" color="#E8645A"/>
            <StatCard label="Total Goals" value={goals.length} sub="being tracked" color="#7EB8D4"/>
          </div>

          {/* Overall progress bar */}
          <div style={{background:T.card,borderRadius:14,padding:"20px 22px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase"}}>Overall Goal Completion</div>
              <span style={{fontSize:14,fontWeight:700,color:"#9B8FE8"}}>{overallGoalPct}%</span>
            </div>
            <div style={{height:12,borderRadius:6,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,#9B8FE8,#7EB8D4)",width:`${overallGoalPct}%`,transition:"width 0.8s ease"}}/>
            </div>
          </div>

          {/* All goals progress list */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Goal Progress Breakdown</div>
            {goalStats.map((g,i)=>{
              const cat = CATS.find(c=>c.id===g.category)||CATS[0];
              const dl = daysLeft(g.timebound);
              const urgent = dl !== null && dl < 30;
              return (
                <div key={g.id} style={{padding:"11px 0",borderBottom:`1px solid ${i<goalStats.length-1?T.border:"transparent"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:15}}>{cat.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"#fff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.title}</div>
                      <div style={{display:"flex",gap:8,marginTop:2}}>
                        <span style={{fontSize:9,color:cat.color,background:`${cat.color}18`,padding:"1px 6px",borderRadius:4,fontWeight:700}}>{cat.label}</span>
                        <span style={{fontSize:9,color:g.priority==="High"?"#E8645A":g.priority==="Medium"?"#C8A96E":"#7EB8D4",fontWeight:600}}>{g.priority}</span>
                        {dl !== null && <span style={{fontSize:9,color:urgent?"#E8645A":T.muted}}>{dl < 0 ? "Overdue" : `${dl}d left`}</span>}
                      </div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:g.pct>=75?"#4CAF82":g.pct>=40?"#C8A96E":"#E8645A",minWidth:38,textAlign:"right"}}>{g.pct}%</span>
                  </div>
                  <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.07)"}}>
                    <div style={{height:"100%",borderRadius:3,background:cat.color,width:`${g.pct}%`,transition:"width 0.6s"}}/>
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:4}}>{g.subtasks.filter(s=>s.done).length}/{g.subtasks.length} subtasks complete</div>
                </div>
              );
            })}
          </div>

          {/* By category breakdown */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Progress by Life Area</div>
            {byCategory.map(c => (
              <div key={c.id} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:600}}>{c.icon} {c.label} <span style={{color:T.muted,fontWeight:400,fontSize:11}}>({c.count} goal{c.count>1?"s":""})</span></span>
                  <span style={{fontSize:12,fontWeight:700,color:c.color}}>{c.avg}%</span>
                </div>
                <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.07)"}}>
                  <div style={{height:"100%",borderRadius:4,background:c.color,width:`${c.avg}%`,transition:"width 0.7s ease"}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Priority breakdown */}
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Goals by Priority</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
              {["High","Medium","Low"].map(pri => {
                const pg = goals.filter(g=>g.priority===pri);
                const avg = pg.length>0?Math.round(pg.reduce((a,g)=>a+calcProgress(g),0)/pg.length):0;
                const color = pri==="High"?"#E8645A":pri==="Medium"?"#C8A96E":"#7EB8D4";
                return (
                  <div key={pri} style={{background:"rgba(255,255,255,0.03)",borderRadius:11,padding:"14px",border:`1px solid ${color}22`}}>
                    <div style={{fontSize:10,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{pri} Priority</div>
                    <div style={{fontSize:22,fontWeight:700,color,marginBottom:2}}>{pg.length}</div>
                    <div style={{fontSize:10,color:T.muted,marginBottom:8}}>goals · {avg}% avg</div>
                    <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>
                      <div style={{height:"100%",borderRadius:2,background:color,width:`${avg}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming deadlines */}
          {daysLeftData.length > 0 && (
            <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Upcoming Deadlines</div>
              {daysLeftData.slice(0,6).map((g,i) => {
                const cat = CATS.find(c=>c.id===g.category)||CATS[0];
                const dl = g.days;
                const urgColor = dl < 0 ? "#E8645A" : dl < 14 ? "#E8645A" : dl < 30 ? "#C8A96E" : "#4CAF82";
                return (
                  <div key={g.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${i<Math.min(daysLeftData.length-1,5)?T.border:"transparent"}`}}>
                    <span style={{fontSize:15}}>{cat.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"#fff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.title}</div>
                      <div style={{fontSize:10,color:T.muted,marginTop:1}}>{g.timebound} · {g.pct}% done</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:urgColor,whiteSpace:"nowrap"}}>
                      {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? "Due today!" : `${dl}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {analyticsTab === "journal" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18}}>
            {[
              {l:"Total Entries", v:diary.length, c:"#9B8FE8"},
              {l:"This Month", v:diary.filter(e=>new Date(e.createdAt)>new Date(Date.now()-30*86400000)).length, c:"#7EB8D4"},
              {l:"Words Written", v:diary.reduce((a,e)=>a+(e.wordCount||0),0).toLocaleString(), c:"#4CAF82"},
              {l:"Avg Mood", v:diary.length>0?(["😔","😐","🙂","😊","🤩"][Math.min(4,Math.round(diary.reduce((a,e)=>a+(["low","neutral","good","great"].indexOf(e.mood||"good")+1),0)/Math.max(diary.length,1))-1)]||"🙂"):"—", c:"#C8A96E"},
            ].map(x=>(
              <div key={x.l} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{x.l}</div>
                <div style={{fontSize:26,fontWeight:700,color:x.c,letterSpacing:-1}}>{x.v}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Topics Written About</div>
            {(()=>{
              const catCounts = diary.flatMap(e=>e.categories||["uncategorized"]).reduce((acc,c)=>{acc[c]=(acc[c]||0)+1;return acc;},{});
              const total = Object.values(catCounts).reduce((a,b)=>a+b,0)||1;
              const colors = {physical:"#E8645A",financial:"#4CAF82",career:"#9B8FE8",emotional:"#E87AAF",parenting:"#7EB8D4",lifestyle:"#E8A45A",travel:"#5AC8C8",religious:"#C8A96E",uncategorized:"#6B7280"};
              return Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).map(([cat,count])=>(
                <div key={cat} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,color:T.muted,fontWeight:600,textTransform:"capitalize"}}>{cat}</span>
                    <span style={{fontSize:12,fontWeight:700,color:colors[cat]||"#9B8FE8"}}>{count} {count===1?"entry":"entries"}</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.07)"}}>
                    <div style={{height:"100%",borderRadius:3,background:colors[cat]||"#9B8FE8",width:`${Math.round(count/total*100)}%`,transition:"width 0.6s ease"}}/>
                  </div>
                </div>
              ));
            })()}
          </div>
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Mood Distribution</div>
            <div style={{display:"flex",gap:10}}>
              {[["great","😊","#4CAF82"],["good","🙂","#C8A96E"],["neutral","😐","#7EB8D4"],["low","😔","#E8645A"]].map(([mood,emoji,color])=>{
                const cnt = diary.filter(e=>e.mood===mood).length;
                const pct = diary.length > 0 ? Math.round(cnt/diary.length*100) : 0;
                return (
                  <div key={mood} style={{flex:1,background:"rgba(255,255,255,0.03)",borderRadius:11,padding:"14px 10px",textAlign:"center",border:`1px solid ${pct>0?color+"33":"rgba(255,255,255,0.06)"}`}}>
                    <div style={{fontSize:22,marginBottom:6}}>{emoji}</div>
                    <div style={{fontSize:18,fontWeight:700,color,marginBottom:2}}>{pct}%</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",textTransform:"capitalize"}}>{mood}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:2}}>{cnt} entries</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Recent Journal Entries</div>
            {diary.length===0 ? <p style={{color:"rgba(255,255,255,0.25)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No journal entries yet</p> :
              [...diary].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(e=>{
                const moodColors={great:"#4CAF82",good:"#C8A96E",neutral:"#7EB8D4",low:"#E8645A"};
                const catColors={physical:"#E8645A",financial:"#4CAF82",career:"#9B8FE8",emotional:"#E87AAF",parenting:"#7EB8D4",lifestyle:"#E8A45A",travel:"#5AC8C8",religious:"#C8A96E"};
                return (
                  <div key={e.id} style={{padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {(e.categories||[]).map(c=><span key={c} style={{fontSize:9,background:`${catColors[c]||"#9B8FE8"}22`,color:catColors[c]||"#9B8FE8",padding:"2px 7px",borderRadius:20,fontWeight:700,textTransform:"capitalize"}}>{c}</span>)}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {e.mood&&<span style={{fontSize:10,color:moodColors[e.mood]||"#9B8FE8",fontWeight:600,textTransform:"capitalize"}}>{e.mood}</span>}
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{e.createdAt?.split("T")[0]||""}</span>
                      </div>
                    </div>
                    <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",margin:0,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{e.text}</p>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {analyticsTab === "reminders" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18}}>
            {[
              {l:"Total", v:reminders.length, c:"#9B8FE8"},
              {l:"Completed", v:reminders.filter(r=>r.done).length, c:"#4CAF82"},
              {l:"Pending", v:reminders.filter(r=>!r.done).length, c:"#C8A96E"},
              {l:"Completion %", v:reminders.length>0?Math.round(reminders.filter(r=>r.done).length/reminders.length*100)+"%":"—", c:"#7EB8D4"},
            ].map(x=>(
              <div key={x.l} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{x.l}</div>
                <div style={{fontSize:26,fontWeight:700,color:x.c,letterSpacing:-1}}>{x.v}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>By Life Category</div>
            {(()=>{
              const catCounts = reminders.reduce((acc,r)=>{const c=r.category||"general";acc[c]=(acc[c]||0)+1;return acc;},{});
              const catDone = reminders.reduce((acc,r)=>{if(r.done){const c=r.category||"general";acc[c]=(acc[c]||0)+1;}return acc;},{});
              const colors={physical:"#E8645A",financial:"#4CAF82",career:"#9B8FE8",emotional:"#E87AAF",parenting:"#7EB8D4",lifestyle:"#E8A45A",travel:"#5AC8C8",religious:"#C8A96E",general:"#6B7280"};
              if(Object.keys(catCounts).length===0) return <p style={{color:"rgba(255,255,255,0.25)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No reminders yet</p>;
              return Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).map(([cat,total])=>{
                const done=catDone[cat]||0;
                const pct=total>0?Math.round(done/total*100):0;
                return (
                  <div key={cat} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:13,color:T.muted,fontWeight:600,textTransform:"capitalize"}}>{cat}</span>
                      <span style={{fontSize:12,fontWeight:700,color:colors[cat]||"#9B8FE8"}}>{done}/{total} done</span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.07)"}}>
                      <div style={{height:"100%",borderRadius:3,background:colors[cat]||"#9B8FE8",width:`${pct}%`,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Reminders + Goals Connection</div>
            <p style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:14,lineHeight:1.5}}>How your reminders align with your life goals — AI categorizes each reminder to surface patterns.</p>
            {["physical","financial","career","emotional","parenting","lifestyle","travel","religious"].map(cat=>{
              const catReminders = reminders.filter(r=>r.category===cat);
              const catGoals = goals.filter(g=>g.category===cat);
              if(!catReminders.length && !catGoals.length) return null;
              const colors={physical:"#E8645A",financial:"#4CAF82",career:"#9B8FE8",emotional:"#E87AAF",parenting:"#7EB8D4",lifestyle:"#E8A45A",travel:"#5AC8C8",religious:"#C8A96E"};
              return (
                <div key={cat} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <span style={{fontSize:11,color:colors[cat],fontWeight:700,textTransform:"capitalize",minWidth:70}}>{cat}</span>
                  <div style={{flex:1,display:"flex",gap:8}}>
                    {catReminders.length>0&&<span style={{fontSize:10,background:`${colors[cat]}18`,color:colors[cat],padding:"2px 8px",borderRadius:20}}>{catReminders.length} reminder{catReminders.length>1?"s":""}</span>}
                    {catGoals.length>0&&<span style={{fontSize:10,background:"rgba(155,143,232,0.15)",color:"#9B8FE8",padding:"2px 8px",borderRadius:20}}>{catGoals.length} goal{catGoals.length>1?"s":""}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}


export { AnalyticsPage };