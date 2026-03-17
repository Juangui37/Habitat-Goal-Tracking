import { useState, useEffect } from "react";
import { db, auth, googleProvider } from "./firebase.js";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";

// ── Constants & Theme ──────────────────────────────────────────────────────────
import { T, DARK_THEME, LIGHT_THEME } from "./constants/theme.js";
import { APP_NAME, APP_TAGLINE, ADMIN_UID, DISPOSABLE_DOMAINS,
         todayStr, CATS } from "./constants/index.js";
import { SEED_GOALS, SEED_HABITS, SEED_REMINDERS, SEED_DIARY,
         generateDemoLogs } from "./constants/seed.js";

// ── Components ─────────────────────────────────────────────────────────────────
import { Nav }                    from "./components/Nav.jsx";
import { Ring }                   from "./components/Ring.jsx";
import { SmartModal }             from "./components/modals/SmartModal.jsx";
import { AICoachModal }           from "./components/modals/AICoachModal.jsx";
import { HabitSuggester }         from "./components/modals/HabitSuggester.jsx";
import { OnboardingModal }        from "./components/modals/OnboardingModal.jsx";
import { EmailVerificationGate }  from "./components/modals/EmailVerificationGate.jsx";

// ── Pages ──────────────────────────────────────────────────────────────────────
import { GoalsPage }     from "./pages/GoalsPage.jsx";
import { HabitsPage }    from "./pages/HabitsPage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";
import { RemindersPage } from "./pages/RemindersPage.jsx";
import { DiaryPage }     from "./pages/DiaryPage.jsx";
import { MindMapPage }   from "./pages/MindMapPage.jsx";
import { WeeklyWrapped } from "./pages/WeeklyWrapped.jsx";
import { LoginScreen }   from "./pages/LoginScreen.jsx";
import { SettingsPage }  from "./pages/SettingsPage.jsx";
import { AdminPanel }    from "./pages/AdminPanel.jsx";

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  Object.assign(T, darkMode ? DARK_THEME : LIGHT_THEME); // live theme mutation

  // ── Auth state ────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [goals, setGoals]       = useState([]);
  const [habits, setHabits]     = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
  const [reminders, setReminders] = useState([]);
  const [diary, setDiary]       = useState([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab, setTab]               = useState("goals");
  const [showAI, setShowAI]         = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [editGoal, setEditGoal]     = useState(null);
  const [suggestFor, setSuggestFor] = useState(null);
  const [showWrapped, setShowWrapped]         = useState(false);
  const [showOnboarding, setShowOnboarding]   = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [emailVerified, setEmailVerified]     = useState(true);
  const [profilePhoto, setProfilePhoto] = useState(() => {
    try { return localStorage.getItem("lumina_profile_photo") || ""; } catch { return ""; }
  });

  const [diaryPin, setDiaryPin] = useState(() => {
    try { return localStorage.getItem("lumina_diary_pin") || ""; } catch { return ""; }
  });

  useEffect(() => { try { localStorage.setItem("lumina_diary_pin", diaryPin); } catch {} }, [diaryPin]);

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── Email verification check ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const isGoogle = user.providerData?.[0]?.providerId === "google.com";
    setEmailVerified(isGoogle || user.emailVerified);
  }, [user]);

  // ── Onboarding check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || onboardingChecked) return;
    const check = async () => {
      try {
        const { getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", user.uid, "meta", "onboarding"));
        if (!snap.exists() || !snap.data().onboardingComplete) setShowOnboarding(true);
      } catch {}
      setOnboardingChecked(true);
    };
    check();
  }, [user, onboardingChecked]);

  // ── Write user meta on first login ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const write = async () => {
      try {
        const { getDoc } = await import("firebase/firestore");
        const ref = doc(db, "users", user.uid, "meta", "profile");
        const snap = await getDoc(ref);
        if (!snap.exists()) await setDoc(ref, {
          createdAt: new Date().toISOString(), email: user.email, plan: "free", uid: user.uid,
        });
      } catch {}
    };
    write();
  }, [user]);

  // ── Firestore real-time listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const unsubGoals     = onSnapshot(collection(db,"users",uid,"goals"),     s => setGoals(s.docs.map(d=>d.data())));
    const unsubHabits    = onSnapshot(collection(db,"users",uid,"habits"),    s => setHabits(s.docs.map(d=>d.data())));
    const unsubLogs      = onSnapshot(collection(db,"users",uid,"habitLogs"), s => { const l={}; s.docs.forEach(d=>{l[d.id]=d.data();}); setHabitLogs(l); });
    const unsubReminders = onSnapshot(collection(db,"users",uid,"reminders"), s => setReminders(s.docs.map(d=>d.data())));
    const unsubDiary     = onSnapshot(collection(db,"users",uid,"diary"),     s => setDiary(s.docs.map(d=>d.data())));
    return () => { unsubGoals(); unsubHabits(); unsubLogs(); unsubReminders(); unsubDiary(); };
  }, [user]);

  // ── Firestore write helpers ────────────────────────────────────────────────
  const fbSave = (col, data) => { if (!user||demoMode) return; setDoc(doc(db,"users",user.uid,col,data.id), data); };
  const fbDel  = (col, id)   => { if (!user||demoMode) return; deleteDoc(doc(db,"users",user.uid,col,id)); };
  const fbLogHabit = (date, hId, val) => { if (!user||demoMode) return; setDoc(doc(db,"users",user.uid,"habitLogs",date),{[hId]:val},{merge:true}); };

  // ── Data handlers ──────────────────────────────────────────────────────────
  const saveGoal    = g  => { setGoals(gs=>gs.find(x=>x.id===g.id)?gs.map(x=>x.id===g.id?g:x):[...gs,g]); fbSave("goals",g); };
  const deleteGoal  = id => { setGoals(gs=>gs.filter(g=>g.id!==id)); fbDel("goals",id); };
  const toggleSubtask = (goalId, subId) => setGoals(gs=>gs.map(g=>{
    if (g.id!==goalId) return g;
    const u = {...g, subtasks:g.subtasks.map(s=>s.id!==subId?s:{...s,done:!s.done})};
    fbSave("goals",u); return u;
  }));
  const addJournalNote = (goalId, entry) => setGoals(gs=>gs.map(g=>{
    if (g.id!==goalId) return g;
    const u = {...g, journal:[...g.journal,entry]};
    fbSave("goals",u); return u;
  }));

  const saveHabit   = h  => { setHabits(hs=>hs.find(x=>x.id===h.id)?hs.map(x=>x.id===h.id?h:x):[...hs,h]); fbSave("habits",h); };
  const deleteHabit = id => { setHabits(hs=>hs.filter(h=>h.id!==id)); fbDel("habits",id); };
  const toggleHabitLog = (date, hId, cur) => { setHabitLogs(l=>({...l,[date]:{...(l[date]||{}),[hId]:!cur}})); fbLogHabit(date,hId,!cur); };
  const addHabits   = hs => hs.forEach(h=>saveHabit(h));

  const saveReminder   = r  => { setReminders(rs=>rs.find(x=>x.id===r.id)?rs.map(x=>x.id===r.id?r:x):[...rs,r]); fbSave("reminders",r); };
  const deleteReminder = id => { setReminders(rs=>rs.filter(r=>r.id!==id)); fbDel("reminders",id); };
  const toggleReminder = id => setReminders(rs=>rs.map(r=>{ if(r.id!==id)return r; const u={...r,done:!r.done}; fbSave("reminders",u); return u; }));

  const saveDiaryEntry   = e  => { setDiary(ds=>ds.find(x=>x.id===e.id)?ds.map(x=>x.id===e.id?e:x):[...ds,e]); fbSave("diary",e); };
  const deleteDiaryEntry = id => { setDiary(ds=>ds.filter(e=>e.id!==id)); fbDel("diary",id); };

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleGoogleLogin  = async () => { setLoginLoading(true); try { await signInWithPopup(auth,googleProvider); } catch(e){console.error(e);} finally{setLoginLoading(false);} };
  const handleEmailLogin   = async (email,pw) => signInWithEmailAndPassword(auth,email,pw);
  const handleEmailSignup  = async (email,pw,name) => {
    const domain = email.split("@")[1]?.toLowerCase()||"";
    if (!domain.endsWith(".edu") && DISPOSABLE_DOMAINS.has(domain))
      throw new Error("This email domain isn't supported. Please use your real email address.");
    const cred = await createUserWithEmailAndPassword(auth,email,pw);
    if (name && cred.user) await cred.user.updateProfile({displayName:name}).catch(()=>{});
    try { await sendEmailVerification(cred.user); } catch {}
  };
  const handleLogout = () => { signOut(auth); setDemoMode(false); setGoals([]); setHabits([]); setHabitLogs({}); setReminders([]); setDiary([]); };
  const handleDemo   = () => { setDemoMode(true); setGoals(SEED_GOALS); setHabits(SEED_HABITS); setHabitLogs(generateDemoLogs(SEED_HABITS)); setReminders(SEED_REMINDERS); setDiary(SEED_DIARY); };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const greet   = () => { const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; };
  const today   = todayStr();
  const todayLog= habitLogs[today]||{};
  const todayPct= habits.length>0 ? Math.round(habits.filter(h=>todayLog[h.id]).length/habits.length*100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{display:"flex",gap:8}}>{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#9B8FE8",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>
      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );

  if (user && !emailVerified)
    return <EmailVerificationGate user={user} onVerified={()=>setEmailVerified(true)}/>;

  if (!user && !demoMode) return (
    <LoginScreen onGoogleLogin={handleGoogleLogin} onEmailLogin={handleEmailLogin}
      onEmailSignup={handleEmailSignup} loading={loginLoading} onDemo={handleDemo}
      darkMode={darkMode} setDarkMode={setDarkMode}/>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:T.text,transition:"background 0.3s,color 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,300&display=swap" rel="stylesheet"/>

      {/* ── Header ── */}
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:darkMode?"rgba(7,8,12,0.97)":"rgba(244,245,248,0.97)",backdropFilter:"blur(20px)",zIndex:10,gap:12,flexWrap:"wrap"}}>
        <div style={{flexShrink:0}}>
          <div style={{fontSize:9,color:T.muted,letterSpacing:3,textTransform:"uppercase",marginBottom:1}}>{greet()}, {demoMode?"Demo":user?.displayName?.split(" ")[0]||"You"}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✦</div>
            <h1 style={{fontSize:17,fontWeight:700,margin:0,letterSpacing:-0.5,color:T.text}}>{APP_NAME}</h1>
            {tab==="habits"&&<div style={{fontSize:10,color:todayPct===100?"#4CAF82":"#9B8FE8",fontWeight:700,background:todayPct===100?"rgba(76,175,130,0.12)":"rgba(155,143,232,0.12)",padding:"3px 8px",borderRadius:6}}>{todayPct}% today</div>}
          </div>
        </div>
        <Nav tab={tab} setTab={setTab} user={user}/>
        <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
          <button onClick={()=>setShowWrapped(true)} style={{background:"rgba(200,169,110,0.12)",border:"1px solid rgba(200,169,110,0.3)",borderRadius:10,padding:"8px 13px",color:"#C8A96E",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit"}}>🎁 Wrapped</button>
          <button onClick={()=>setShowAI(true)} style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.28)",borderRadius:10,padding:"8px 13px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit"}}>✦ AI Coach</button>
          {tab==="goals"&&<button onClick={()=>{setEditGoal(null);setShowModal(true);}} style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(155,143,232,0.25)"}}>+ Goal</button>}
          {demoMode
            ? <button onClick={()=>{setDemoMode(false);setGoals([]);setHabits([]);setHabitLogs({});}} style={{background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",color:T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>Sign in →</button>
            : <div style={{display:"flex",gap:7,alignItems:"center"}}>
                {user?.photoURL && <img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.15)",flexShrink:0}}/>}
                <button onClick={()=>setTab("settings")} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 11px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>⚙</button>
              </div>
          }
        </div>
      </div>

      {/* ── Pages ── */}
      <div style={{maxWidth:920,margin:"0 auto",padding:"22px 18px"}}>
        {tab==="goals"     && <GoalsPage goals={goals} setGoals={setGoals} saveGoal={saveGoal} deleteGoal={deleteGoal} toggleSubtask={toggleSubtask} addJournalNote={addJournalNote} setShowAI={setShowAI} setShowModal={setShowModal} setEditGoal={setEditGoal} onImportDemoGoals={!demoMode?()=>SEED_GOALS.forEach(g=>saveGoal({...g,id:"import_"+g.id})):null} diary={diary} user={user}/>}
        {tab==="habits"    && <HabitsPage habits={habits} saveHabit={saveHabit} deleteHabit={deleteHabit} habitLogs={habitLogs} toggleHabitLog={toggleHabitLog} addHabits={addHabits}/>}
        {tab==="reminders" && <RemindersPage reminders={reminders} saveReminder={saveReminder} deleteReminder={deleteReminder} toggleReminder={toggleReminder}/>}
        {tab==="diary"     && <DiaryPage entries={diary} saveEntry={saveDiaryEntry} deleteEntry={deleteDiaryEntry} diaryPin={diaryPin}/>}
        {tab==="analytics" && <AnalyticsPage habits={habits} habitLogs={habitLogs} goals={goals} reminders={reminders} diary={diary} user={user}/>}
        {tab==="settings"  && <SettingsPage user={user} demoMode={demoMode} onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} diaryPin={diaryPin} setDiaryPin={setDiaryPin} profilePhoto={profilePhoto} setProfilePhoto={setProfilePhoto}/>}
        {tab==="mindmap"   && <MindMapPage user={user} goals={goals} habits={habits} habitLogs={habitLogs} diary={diary} reminders={reminders} profilePhoto={profilePhoto}/>}
        {tab==="admin"     && user?.uid===ADMIN_UID && <AdminPanel currentUser={user}/>}
      </div>

      {/* ── Modals ── */}
      {showModal && <SmartModal editGoal={editGoal} onSave={goal=>{const isEdit=!!editGoal;saveGoal(goal);setShowModal(false);setEditGoal(null);if(!isEdit)setSuggestFor(goal);}} onClose={()=>{setShowModal(false);setEditGoal(null);}}/>}
      {showAI    && <AICoachModal onGoalGenerated={goal=>{saveGoal(goal);setShowAI(false);setSuggestFor(goal);}} onClose={()=>setShowAI(false)}/>}
      {suggestFor&& <HabitSuggester goal={suggestFor} existingHabits={habits} onAdd={addHabits} onClose={()=>setSuggestFor(null)}/>}
      {showWrapped&& <WeeklyWrapped habits={habits} habitLogs={habitLogs} goals={goals} reminders={reminders} diary={diary} user={user} onClose={()=>setShowWrapped(false)}/>}
      {showOnboarding && user && !demoMode && <OnboardingModal user={user} onComplete={()=>setShowOnboarding(false)} onSaveGoal={saveGoal} onSaveHabits={addHabits}/>}

      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}} * { box-sizing:border-box; }`}</style>
    </div>
  );
}