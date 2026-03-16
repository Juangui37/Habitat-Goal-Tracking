import { useState, useEffect } from "react";
import { db } from "../../firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { T } from "../../constants/theme.js";
import { CATS, todayStr } from "../../constants/index.js";
import { callClaude } from "../../utils/ai.js";

function OnboardingModal({ user, onComplete, onSaveGoal, onSaveHabits }) {
  const [step, setStep] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [generatedGoal, setGeneratedGoal] = useState(null);
  const [generatedGoals, setGeneratedGoals] = useState([]); // multi-goal mode
  const [selectedGoals, setSelectedGoals] = useState({});
  const [goalMode, setGoalMode] = useState("single"); // "single" | "multi"
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [suggestedHabits, setSuggestedHabits] = useState([]);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState({});

  const CATS_OB = [
    { id:"physical",  label:"Physical",  icon:"⚡", color:"#E8645A" },
    { id:"financial", label:"Financial", icon:"◈",  color:"#4CAF82" },
    { id:"religious", label:"Religious", icon:"✦",  color:"#C8A96E" },
    { id:"parenting", label:"Parenting", icon:"❋",  color:"#7EB8D4" },
    { id:"career",    label:"Career",    icon:"▲",  color:"#9B8FE8" },
    { id:"lifestyle", label:"Lifestyle", icon:"◎",  color:"#E8A45A" },
    { id:"emotional", label:"Emotional", icon:"◐",  color:"#E87AAF" },
    { id:"travel",    label:"Travel",    icon:"⊕",  color:"#5AC8C8" },
  ];

  const CHIPS = ["Get in better shape","Save more money","Be more present with my kids","Grow in my faith","Move up in my career","Travel somewhere meaningful"];

  const firstName = user?.displayName?.split(" ")[0] || "there";

  const generateGoal = async (mode) => {
    if (!goalInput.trim()) return;
    const useMode = mode || goalMode;
    setGoalLoading(true); setGoalError(""); setGeneratedGoal(null); setGeneratedGoals([]);
    const today = new Date().toISOString().split("T")[0];
    try {
      if (useMode === "multi") {
        // Extract multiple SMART goals from rich text
        const prompt = `Extract all distinct goals from this text. Today: ${today}. Return ONLY a JSON array, no other text: [{"title":"...","category":"physical","priority":"High","specific":"...","measurable":"...","achievable":"...","relevant":"...","timebound":"YYYY-MM-DD","subtasks":["...","...","..."]}]\n\nText: ${goalInput.trim()}`;
        const sys = `You extract multiple SMART goals from raw text. Return a valid JSON array only. Each goal must have all SMART fields. Category must be one of: physical,financial,religious,parenting,career,lifestyle,emotional,travel. Deadlines ~3-12 months from today based on context.`;
        const text = await callClaude(prompt, sys, 2000);
        const clean = text.replace(/```json|```/g,"").trim();
        const raw = JSON.parse(clean);
        const goals = (Array.isArray(raw) ? raw : [raw]).map((g, i) => ({
          id: `onb_${Date.now()}_${i}`,
          ...g,
          category: g.category?.toLowerCase() || "physical",
          subtasks: (g.subtasks||[]).map((s,j)=>({id:`os${i}${j}`,label:s,done:false})),
          journal: [], createdAt: today,
        }));
        setGeneratedGoals(goals);
        const sel = {};
        goals.forEach(g => { sel[g.id] = true; });
        setSelectedGoals(sel);
        setGoalMode("multi");
      } else {
        // Single goal mode
        const prompt = `User idea: "${goalInput.trim()}". Today: ${today}. Return ONLY valid JSON, no other text: {"title":"...","category":"physical","priority":"High","specific":"...","measurable":"...","achievable":"...","relevant":"...","timebound":"YYYY-MM-DD","subtasks":["...","...","..."]}`;
        const sys = `You generate exactly one SMART goal from a rough idea. Return valid JSON only. Category must be one of: physical,financial,religious,parenting,career,lifestyle,emotional,travel. Deadline ~6 months from today.`;
        const text = await callClaude(prompt, sys, 800);
        const clean = text.replace(/```json|```/g,"").trim();
        const raw = JSON.parse(clean);
        setGeneratedGoal({
          id: `onb_${Date.now()}`,
          ...raw,
          category: raw.category?.toLowerCase() || "physical",
          subtasks: (raw.subtasks||[]).map((s,i)=>({id:`os${i}`,label:s,done:false})),
          journal: [], createdAt: today,
        });
      }
    } catch(e) {
      const msg = e.message?.includes("not found") || e.message?.includes("Server error")
        ? e.message  // already descriptive from callClaude
        : `AI couldn't parse goals from that text. Try being more specific, or use the AI Coach's Bulk Import after setup.`;
      setGoalError(msg);
    }
    setGoalLoading(false);
  };

  const loadHabits = async (goal) => {
    setHabitsLoading(true);
    try {
      const prompt = `Goal: "${goal.title}", category: ${goal.category}. Suggest exactly 3 daily habits. Return ONLY a JSON array: [{"label":"...","category":"fitness","icon":"emoji","why":"one sentence"}]`;
      const sys = `You suggest daily habits for a goal. Return valid JSON array only.`;
      const text = await callClaude(prompt, sys, 400);
      const clean = text.replace(/```json|```/g,"").trim();
      const raw = JSON.parse(clean);
      setSuggestedHabits(raw);
      const sel = {};
      raw.forEach((_,i) => { sel[i] = true; });
      setSelectedHabits(sel);
    } catch(e) {
      setSuggestedHabits([
        {label:"Complete planned workout",category:"fitness",icon:"⚡",why:"Builds the physical foundation for your goal."},
        {label:"Review your goal for the day",category:"morning",icon:"◎",why:"Keeps your goal top of mind every morning."},
        {label:"Journal for 5 minutes",category:"night",icon:"📓",why:"Reflection accelerates progress."},
      ]);
      setSelectedHabits({0:true,1:true,2:true});
    }
    setHabitsLoading(false);
  };

  const handleGoalAccept = () => {
    if (goalMode === "multi" && generatedGoals.length > 0) {
      const toSave = generatedGoals.filter(g => selectedGoals[g.id]);
      toSave.forEach(g => onSaveGoal(g));
      setStep(3);
      loadHabits(toSave[0]); // base habits on the first selected goal
      return;
    }
    if (!generatedGoal) return;
    onSaveGoal(generatedGoal);
    setStep(3);
    loadHabits(generatedGoal);
  };

  const handleHabitsAccept = () => {
    const catColorMap = {"fitness":"#E8645A","morning":"#C8A96E","night":"#9B8FE8","nutrition":"#4CAF82"};
    const toAdd = suggestedHabits.filter((_,i)=>selectedHabits[i]).map((h,i)=>({
      id:`obh_${Date.now()}_${i}`, label:h.label, category:h.category||"morning",
      icon:h.icon||"✓", color:catColorMap[h.category]||"#9B8FE8",
      schedule:"daily", customDays:[0,1,2,3,4,5,6],
    }));
    if (toAdd.length) onSaveHabits(toAdd);
    setStep(4);
  };

  const handleComplete = async () => {
    try {
      await setDoc(doc(db,"users",user.uid,"meta","onboarding"), { onboardingComplete: true, completedAt: new Date().toISOString() });
    } catch(e) {}
    onComplete();
  };

  const goat = generatedGoal;
  const goalCat = goat ? (CATS_OB.find(c=>c.id===goat.category)||CATS_OB[0]) : null;
  const selectedHabitCount = Object.values(selectedHabits).filter(Boolean).length;

  const steps = ["Welcome","Tour","Your Goal","Habits","Journal","Ready"];
  const T2 = {bg:"#0D0F14",card:"#13151E",border:"rgba(255,255,255,0.08)",muted:"rgba(255,255,255,0.4)"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(12px)",padding:"16px"}}>
      <div style={{background:T2.bg,border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,width:"min(520px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Progress dots */}
        <div style={{padding:"20px 24px 0",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {steps.map((_,i)=>(
            <div key={i} style={{width:i===step?20:8,height:8,borderRadius:4,background:i<step?"#4CAF82":i===step?"#9B8FE8":"rgba(255,255,255,0.12)",transition:"all 0.3s"}}/>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

          {/* STEP 0 — WELCOME */}
          {step===0&&(
            <div style={{textAlign:"center",paddingTop:8}}>
              <div style={{fontSize:52,marginBottom:16}}>✦</div>
              <h1 style={{fontSize:26,fontWeight:700,color:"#fff",marginBottom:8,lineHeight:1.2}}>Welcome to Lumina, {firstName}.</h1>
              <p style={{fontSize:14,color:T2.muted,marginBottom:28,lineHeight:1.7}}>Your AI-powered guide to living holistically.</p>
              {["Set real goals. Build real habits. See real growth.","AI connects everything — your habits, your journal, your progress.","This is your life, organized."].map((line,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderRadius:11,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",marginBottom:8,textAlign:"left"}}>
                  <span style={{fontSize:16}}>{"🎯📊✨"[i]}</span>
                  <span style={{fontSize:13,color:T.muted}}>{line}</span>
                </div>
              ))}
            </div>
          )}

          {/* STEP 1 — TOUR */}
          {step===1&&(
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:6}}>What's inside Lumina</h2>
              <p style={{fontSize:13,color:T2.muted,marginBottom:20}}>Five pages. One connected system.</p>
              {[["🎯","Goals","Set AI-powered SMART goals across every area of your life"],["🔁","Habits","Build daily habits tied directly to your goals"],["📓","Journal","Write freely — AI reads the patterns so you don't have to"],["📊","Analytics","See your growth in numbers across any time range"],["🗺️","Mind Map","A living snapshot of every area of your life — powered by AI"]].map(([icon,name,desc])=>(
                <div key={name} style={{display:"flex",gap:14,padding:"13px 16px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",marginBottom:8}}>
                  <span style={{fontSize:22,flexShrink:0}}>{icon}</span>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{name}</div><div style={{fontSize:12,color:T2.muted,lineHeight:1.4}}>{desc}</div></div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2 — FIRST GOAL */}
          {step===2&&(
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:6}}>What do you want to achieve?</h2>
              <p style={{fontSize:13,color:T2.muted,marginBottom:18,lineHeight:1.5}}>Paste a quick idea or a detailed brain dump — AI will extract your goals.</p>
              {!generatedGoal&&generatedGoals.length===0&&(
                <>
                  <textarea value={goalInput} onChange={e=>setGoalInput(e.target.value)}
                    placeholder={'One goal: "I want to get stronger and gain muscle"\n\nOr paste anything: journal notes, a list of goals, a long description — AI reads it all and extracts every goal it finds.'}
                    rows={4}
                    style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"13px 15px",color:T.text,fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box",marginBottom:12}}/>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                    {CHIPS.map(chip=>(
                      <button key={chip} onClick={()=>setGoalInput(chip)} style={{padding:"7px 14px",borderRadius:20,border:"1px solid rgba(155,143,232,0.4)",background:"rgba(155,143,232,0.08)",color:"#9B8FE8",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{chip}</button>
                    ))}
                  </div>
                  {goalError&&<div style={{background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.3)",borderRadius:10,padding:"10px 14px",color:"#E8645A",fontSize:12,marginBottom:12,lineHeight:1.5}}>{goalError}</div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>generateGoal("single")} disabled={goalLoading||!goalInput.trim()}
                      style={{flex:1,background:goalInput.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:12,padding:"13px",color:goalInput.trim()?"#fff":"rgba(255,255,255,0.2)",cursor:goalInput.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
                      {goalLoading&&goalMode==="single"?"Generating...":"✦ One goal"}
                    </button>
                    <button onClick={()=>generateGoal("multi")} disabled={goalLoading||goalInput.trim().length<30}
                      style={{flex:1,background:goalInput.trim().length>=30?"rgba(155,143,232,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${goalInput.trim().length>=30?"rgba(155,143,232,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:12,padding:"13px",color:goalInput.trim().length>=30?"#9B8FE8":"rgba(255,255,255,0.25)",cursor:goalInput.trim().length>=30?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
                      {goalLoading&&goalMode==="multi"?"Extracting...":"📋 Extract all goals"}
                    </button>
                  </div>
                  {goalInput.trim().length>=30&&<p style={{fontSize:11,color:"rgba(155,143,232,0.6)",marginTop:8,textAlign:"center"}}>Looks like you have a lot to say — "Extract all goals" will find every goal in your text</p>}
                </>
              )}
              {/* Multi-goal results */}
              {generatedGoals.length>0&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Found {generatedGoals.length} goals</div>
                    <button onClick={()=>{setGeneratedGoals([]);setGoalInput("");}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>↺ Start over</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto",marginBottom:12}}>
                    {generatedGoals.map(g=>{
                      const c = CATS_OB.find(x=>x.id===g.category)||CATS_OB[0];
                      const on = !!selectedGoals[g.id];
                      return (
                        <div key={g.id} onClick={()=>setSelectedGoals(s=>({...s,[g.id]:!s[g.id]}))}
                          style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:12,background:on?`${c.color}0E`:"rgba(255,255,255,0.03)",border:`1.5px solid ${on?c.color+"55":"rgba(255,255,255,0.08)"}`,cursor:"pointer",transition:"all 0.2s"}}>
                          <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?c.color:"rgba(255,255,255,0.2)"}`,background:on?c.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            {on&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",gap:6,marginBottom:4}}>
                              <span style={{fontSize:9,background:`${c.color}20`,color:c.color,padding:"2px 7px",borderRadius:20,fontWeight:700}}>{c.icon} {c.label}</span>
                            </div>
                            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>{g.title}</div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{g.specific?.slice(0,80)}{g.specific?.length>80?"...":""}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {generatedGoal&&goalCat&&(
                <div style={{background:`${goalCat.color}10`,border:`1px solid ${goalCat.color}44`,borderRadius:14,padding:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontSize:10,background:`${goalCat.color}22`,color:goalCat.color,padding:"3px 10px",borderRadius:20,fontWeight:700}}>{goalCat.icon} {goalCat.label}</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Due {generatedGoal.timebound}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:8}}>{generatedGoal.title}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.5,marginBottom:10}}>{generatedGoal.specific}</div>
                  {generatedGoal.subtasks.slice(0,3).map((s,i)=>(
                    <div key={i} style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginBottom:3}}>→ {s.label||s}</div>
                  ))}
                  <div style={{display:"flex",gap:8,marginTop:14}}>
                    <button onClick={handleGoalAccept} style={{flex:2,background:goalCat.color,border:"none",borderRadius:10,padding:"11px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Looks great — add it! ✓</button>
                    <button onClick={()=>{setGeneratedGoal(null);setGoalInput("");}} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px",color:T2.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>↺ Try again</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — HABITS */}
          {step===3&&(
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:6}}>Now let's build habits that support that goal.</h2>
              <p style={{fontSize:13,color:T2.muted,marginBottom:18,lineHeight:1.5}}>Small daily actions beat big sporadic efforts every time.</p>
              {habitsLoading?(
                <div style={{textAlign:"center",padding:"30px 0"}}>
                  <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#9B8FE8",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>
                  <p style={{fontSize:12,color:T2.muted}}>Finding habits that match your goal...</p>
                </div>
              ):(
                suggestedHabits.map((h,i)=>{
                  const on = !!selectedHabits[i];
                  return (
                    <div key={i} onClick={()=>setSelectedHabits(s=>({...s,[i]:!s[i]}))}
                      style={{display:"flex",gap:12,padding:"13px 15px",borderRadius:12,background:on?"rgba(155,143,232,0.08)":"rgba(255,255,255,0.03)",border:`1.5px solid ${on?"rgba(155,143,232,0.4)":"rgba(255,255,255,0.07)"}`,cursor:"pointer",marginBottom:8,transition:"all 0.2s"}}>
                      <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?"#9B8FE8":"rgba(255,255,255,0.2)"}`,background:on?"#9B8FE8":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                        {on&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:2}}>{h.icon} {h.label}</div>
                        <div style={{fontSize:11,color:T2.muted}}>{h.why}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* STEP 4 — JOURNAL INTRO */}
          {step===4&&(
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:6}}>Your journal is smarter than you think.</h2>
              <p style={{fontSize:13,color:T2.muted,marginBottom:20,lineHeight:1.5}}>Write anything. AI does the pattern recognition.</p>
              {[["✍️","Write anything — AI figures out which goal it connects to"],["📅","Get a weekly Wrapped summary of your patterns and progress"],["💡","The more you write, the smarter your goal suggestions get"]].map(([icon,text])=>(
                <div key={icon} style={{display:"flex",gap:14,padding:"13px 16px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",marginBottom:8}}>
                  <span style={{fontSize:22,flexShrink:0}}>{icon}</span>
                  <span style={{fontSize:13,color:T.muted,lineHeight:1.4}}>{text}</span>
                </div>
              ))}
              {/* Example entry */}
              <div style={{background:"rgba(155,143,232,0.06)",border:"1px solid rgba(155,143,232,0.2)",borderRadius:12,padding:"14px 16px",marginTop:16}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:6}}>Example entry — AI auto-categorized</div>
                <p style={{fontSize:12,color:"rgba(255,255,255,0.65)",lineHeight:1.5,margin:0,marginBottom:10}}>"Had the best run this morning. 8 miles felt easy. I think the consistency is finally paying off. Also called mom — she sounded tired..."</p>
                <div style={{display:"flex",gap:6}}>
                  <span style={{fontSize:10,background:"rgba(232,100,90,0.2)",color:"#E8645A",padding:"3px 10px",borderRadius:20,fontWeight:700}}>⚡ Physical</span>
                  <span style={{fontSize:10,background:"rgba(126,184,212,0.2)",color:"#7EB8D4",padding:"3px 10px",borderRadius:20,fontWeight:700}}>❋ Parenting</span>
                  <span style={{fontSize:10,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",padding:"3px 10px",borderRadius:20}}>😊 good</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — READY */}
          {step===5&&(
            <div style={{textAlign:"center",paddingTop:8}}>
              <div style={{fontSize:48,marginBottom:16}}>🎉</div>
              <h2 style={{fontSize:22,fontWeight:700,color:T.text,marginBottom:8}}>You're set up, {firstName}.</h2>
              <p style={{fontSize:13,color:T2.muted,marginBottom:24,lineHeight:1.6}}>Here's what's ready for you:</p>
              {[
                ["✅",`1 SMART goal created${generatedGoal?` — "${generatedGoal.title}"`:""}`,"#4CAF82"],
                ["✅",`${selectedHabitCount} daily habit${selectedHabitCount!==1?"s":""} added`,"#4CAF82"],
                ["✅","Journal ready — write your first entry anytime","#4CAF82"],
                ["📊","Analytics fills in as you use the app","#9B8FE8"],
                ["🗺️","Mind Map unlocks after your first week of data","#C8A96E"],
              ].map(([icon,text,color])=>(
                <div key={icon+text} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderRadius:11,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",marginBottom:8,textAlign:"left"}}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <span style={{fontSize:13,color:color||"rgba(255,255,255,0.7)"}}>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{padding:"16px 24px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:10}}>
          {step>0&&step<5&&(
            <button onClick={()=>setStep(s=>s-1)} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:11,padding:"12px 20px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>← Back</button>
          )}
          {step===0&&<button onClick={()=>setStep(1)} style={{flex:1,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"13px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>Let's build your first goal →</button>}
          {step===1&&<button onClick={()=>setStep(2)} style={{flex:1,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"13px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>Got it — let's start →</button>}
          {step===2&&!generatedGoal&&generatedGoals.length===0&&<button onClick={()=>setStep(3)} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:11,padding:"12px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Skip for now</button>}
          {step===2&&generatedGoals.length>0&&<button onClick={handleGoalAccept} disabled={Object.values(selectedGoals).filter(Boolean).length===0} style={{flex:1,background:Object.values(selectedGoals).filter(Boolean).length>0?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,padding:"13px",color:Object.values(selectedGoals).filter(Boolean).length>0?"#fff":"rgba(255,255,255,0.2)",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>Add {Object.values(selectedGoals).filter(Boolean).length} goal{Object.values(selectedGoals).filter(Boolean).length!==1?"s":""} →</button>}
          {step===3&&(
            <button onClick={handleHabitsAccept} disabled={habitsLoading}
              style={{flex:1,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"13px",color:"#fff",cursor:habitsLoading?"not-allowed":"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",opacity:habitsLoading?0.7:1}}>
              {habitsLoading?"Loading...":selectedHabitCount>0?`Add ${selectedHabitCount} habit${selectedHabitCount!==1?"s":""} to my plan →`:"Skip habits"}
            </button>
          )}
          {step===4&&<button onClick={()=>setStep(5)} style={{flex:1,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"13px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>Got it — I'll try journaling →</button>}
          {step===5&&<button onClick={handleComplete} style={{flex:1,background:"linear-gradient(135deg,#4CAF82,#2d8f5f)",border:"none",borderRadius:11,padding:"13px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>Go to my Goals →</button>}
        </div>
      </div>
    </div>
  );
}


export { OnboardingModal };