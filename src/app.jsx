import { useState, useEffect, useRef, useCallback } from "react";				
import { db, auth, googleProvider } from "./firebase.js";				
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";				
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
// ─── THEME ────────────────────────────────────────────────────────────────────				
const T = {				
  bg: "#07080C", surface: "#0E1018", card: "#13151E", border: "rgba(255,255,255,0.07)",				
  text: "#F0F0F8", muted: "rgba(255,255,255,0.38)", faint: "rgba(255,255,255,0.12)",				
};				
// ─── CATEGORIES ───────────────────────────────────────────────────────────────				
const CATS = [				
  { id:"physical",  label:"Physical",  icon:"⚡", color:"#E8645A" },				
  { id:"financial", label:"Financial", icon:"◈",  color:"#4CAF82" },				
  { id:"religious", label:"Religious", icon:"✦",  color:"#C8A96E" },				
  { id:"parenting", label:"Parenting", icon:"❋",  color:"#7EB8D4" },				
  { id:"career",    label:"Career",    icon:"▲",  color:"#9B8FE8" },				
  { id:"lifestyle", label:"Lifestyle", icon:"◎",  color:"#E8A45A" },				
  { id:"emotional", label:"Emotional", icon:"◐",  color:"#E87AAF" },				
  { id:"travel",    label:"Travel",    icon:"⊕",  color:"#5AC8C8" },				
];				
// ─── SEED GOALS (14 total) ────────────────────────────────────────────────────				
// ─── DEMO HABIT LOG GENERATOR ─────────────────────────────────────────────────
function generateDemoLogs(habits) {
  const logs = {};
  const today = new Date();
  const rates = {
    dh1:0.92, dh2:0.88, dh3:0.95, dh4:0.78, dh5:0.82,
    dh6:0.70, dh7:0.85, dh8:0.83, dh9:0.90, dh10:0.60,
    dh11:0.75, dh12:0.72, dh13:0.68, dh14:0.55,
    dh15:0.88, dh16:0.65, dh17:0.80, dh18:0.73, dh19:0.58,
  };
  for (let i = 90; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLog = {};
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    habits.forEach(h => {
      let rate = rates[h.id] || 0.70;
      if (isWeekend && h.category === "fitness") rate -= 0.15;
      if (!isWeekend && h.category === "nutrition") rate -= 0.05;
      rate += (90 - i) / 90 * 0.08;
      dayLog[h.id] = Math.random() < Math.min(rate, 0.97);
    });
    logs[dateStr] = dayLog;
  }
  return logs;
}
const SEED_GOALS = [
  { id:"g1", category:"physical", priority:"High", title:"Run my first marathon under 4 hours",
    specific:"Complete a full 26.2 mile marathon in under 4 hours at the Chicago Marathon in October. Currently running half marathons in ~2:10.",
    measurable:"Official race time tracked via chip timing. Training runs logged weekly in Strava. Long run distance increases by 10% per week.",
    achievable:"Already comfortably running half marathons. Following an 18-week Hal Higdon Novice 2 plan starting July. Have running shoes and a Garmin watch.",
    relevant:"Running has been on my bucket list for 3 years. Completing a marathon will prove I can commit to a hard long-term goal.",
    timebound:"2026-10-11",
    subtasks:[{id:"g1s1",label:"Register for Chicago Marathon",done:true},{id:"g1s2",label:"Complete first 10-mile long run",done:true},{id:"g1s3",label:"Run a half marathon as a training check-in",done:false},{id:"g1s4",label:"Complete 18-mile long run (peak week)",done:false},{id:"g1s5",label:"Taper and rest the final 3 weeks",done:false},{id:"g1s6",label:"Cross the finish line under 4:00:00",done:false}],
    journal:[{id:"j1",text:"Did my first 8-mile long run today. Legs felt heavy at mile 6 but I pushed through. Starting to believe this is actually possible.",date:"2026-02-15"},{id:"j2",text:"Registered for Chicago! It's real now. No backing out.",date:"2026-01-20"}], createdAt:"2026-01-15" },
  { id:"g2", category:"physical", priority:"Medium", title:"Build a consistent strength training routine — 3x per week",
    specific:"Lift weights 3 times per week (Mon/Wed/Fri) using a structured program. Goal: bench 185 lbs, squat 225 lbs, deadlift 275 lbs by end of year.",
    measurable:"Log every session in Strong app. PR tracked monthly. Miss no more than 2 sessions per month.",
    achievable:"Gym membership active. Already going 1–2x/week inconsistently. Just need structure and accountability.",
    relevant:"Running builds cardio but I'm losing muscle. Strength training will improve my posture, metabolism, and confidence.",
    timebound:"2026-12-31",
    subtasks:[{id:"g2s1",label:"Choose a beginner program (StrongLifts 5x5 or similar)",done:true},{id:"g2s2",label:"Complete first full week of 3x lifting",done:true},{id:"g2s3",label:"Hit bench press 135 lbs",done:true},{id:"g2s4",label:"Hit squat 185 lbs",done:false},{id:"g2s5",label:"Hit bench press 185 lbs",done:false},{id:"g2s6",label:"Hit deadlift 275 lbs",done:false}],
    journal:[{id:"j3",text:"Hit a bench press PR today — 155 lbs. Six months ago I couldn't do 95. Strength training is addicting.",date:"2026-03-01"}], createdAt:"2026-01-15" },
  { id:"g3", category:"financial", priority:"High", title:"Save $15,000 emergency fund by end of year",
    specific:"Build a 6-month emergency fund of $15,000 in a high-yield savings account (currently at $4,200). Automate $900/month transfers on the 1st of each month.",
    measurable:"HYSA balance tracked monthly. Automatic transfer set up. Reach $15,000 by December 31.",
    achievable:"Take-home pay covers expenses with ~$1,100/month left. Cutting dining out and subscriptions frees another $200/month. Target is $900/month saved.",
    relevant:"Lost a job once without savings. Never again. This is the foundation everything else is built on.",
    timebound:"2026-12-31",
    subtasks:[{id:"g3s1",label:"Open high-yield savings account (SoFi or Marcus)",done:true},{id:"g3s2",label:"Set up $900/month automatic transfer",done:true},{id:"g3s3",label:"Cut 3 unused subscriptions",done:true},{id:"g3s4",label:"Reach $7,500 (halfway milestone)",done:false},{id:"g3s5",label:"Reach $15,000",done:false}],
    journal:[{id:"j4",text:"Set up the automatic transfer today. $900 leaves my account on the 1st before I can spend it. Feels uncomfortable but that's the point.",date:"2026-01-01"}], createdAt:"2026-01-01" },
  { id:"g4", category:"financial", priority:"Medium", title:"Pay off $6,200 in credit card debt using avalanche method",
    specific:"Eliminate $6,200 in high-interest credit card debt across 2 cards. Pay minimums on lower-rate card, throw all extra money at 24.9% APR card first.",
    measurable:"Total balance tracked monthly. Card 1 (24.9% APR, $3,800) paid off first. Card 2 ($2,400) eliminated by Q4.",
    achievable:"Extra $300/month available after budget cuts. Cards not being used anymore — cut them up.",
    relevant:"Paying $120/month in interest is money thrown away. Eliminating this debt frees up $300+/month permanently.",
    timebound:"2026-12-31",
    subtasks:[{id:"g4s1",label:"Stop using both credit cards",done:true},{id:"g4s2",label:"Set minimum autopay on Card 2",done:true},{id:"g4s3",label:"Pay off Card 1 ($3,800 at 24.9% APR)",done:false},{id:"g4s4",label:"Redirect Card 1 payment to Card 2",done:false},{id:"g4s5",label:"Pay off Card 2 — debt free",done:false}],
    journal:[], createdAt:"2026-01-15" },
  { id:"g5", category:"career", priority:"High", title:"Get promoted to Senior Software Engineer by Q3",
    specific:"Earn a promotion to Senior SWE by demonstrating technical leadership: lead 2 cross-team projects, mentor 1 junior engineer, and present at 1 internal tech talk.",
    measurable:"Promotion decision made in Q3 review cycle. 2 project leads logged. 1 mentee with weekly 1:1s. 1 tech talk delivered.",
    achievable:"Already performing at senior level on team projects. Manager said 'you're close.' Need to make the leadership work more visible.",
    relevant:"Title and comp increase matters. More importantly, I want to be someone junior engineers look up to.",
    timebound:"2026-09-30",
    subtasks:[{id:"g5s1",label:"Have direct promo conversation with manager",done:true},{id:"g5s2",label:"Volunteer to lead Q1 API migration project",done:true},{id:"g5s3",label:"Find a junior engineer to mentor",done:true},{id:"g5s4",label:"Deliver internal tech talk on system design",done:false},{id:"g5s5",label:"Lead second cross-team project in Q2",done:false},{id:"g5s6",label:"Formal promotion confirmed",done:false}],
    journal:[{id:"j5",text:"Manager said my Q1 API migration work was 'exactly the kind of thing we need from a senior.' Staying consistent.",date:"2026-02-28"}], createdAt:"2026-01-10" },
  { id:"g6", category:"career", priority:"Medium", title:"Launch a freelance web dev side income — $1,000/month by Q4",
    specific:"Build and launch 3 client websites, establish a simple portfolio site, and reach $1,000/month in recurring freelance income by October.",
    measurable:"3 paid projects completed. Portfolio site live. $1,000/month revenue for 2 consecutive months.",
    achievable:"Built 5 websites for friends for free already. Skills are there. Just need to charge for them and find clients through LinkedIn.",
    relevant:"Day job income feels fragile. A second income stream changes everything — financial security and optionality.",
    timebound:"2026-10-31",
    subtasks:[{id:"g6s1",label:"Build portfolio site (3 projects + contact form)",done:true},{id:"g6s2",label:"Set rates: $800–1,500 per small site",done:true},{id:"g6s3",label:"Land first paying client",done:true},{id:"g6s4",label:"Complete and launch client site #1",done:false},{id:"g6s5",label:"Land 2 more clients via LinkedIn outreach",done:false},{id:"g6s6",label:"Hit $1,000 revenue in a single month",done:false}],
    journal:[{id:"j6",text:"First client paid a $950 deposit today. I almost undercharged at $500 but held the line. Feels surreal.",date:"2026-02-20"}], createdAt:"2026-01-20" },
  { id:"g7", category:"lifestyle", priority:"Medium", title:"Read 12 books this year — 1 per month",
    specific:"Read one book per month, alternating between non-fiction and fiction. Log notes in a reading journal after each book.",
    measurable:"12 books completed by Dec 31. Notes logged for each. Track on Goodreads.",
    achievable:"Currently reading 0 books/year but spending ~1hr/night on my phone. Replacing 30 min of phone time with reading is the only habit change needed.",
    relevant:"Every successful person I admire reads obsessively. The ROI on books is unmatched.",
    timebound:"2026-12-31",
    subtasks:[{id:"g7s1",label:"Finish 'Atomic Habits' — James Clear",done:true},{id:"g7s2",label:"Finish 'The Psychology of Money' — Morgan Housel",done:true},{id:"g7s3",label:"Finish 'Deep Work' — Cal Newport",done:true},{id:"g7s4",label:"Complete books 4–6 (Q2)",done:false},{id:"g7s5",label:"Complete books 7–9 (Q3)",done:false},{id:"g7s6",label:"Complete books 10–12 (Q4)",done:false}],
    journal:[{id:"j7",text:"Finished 'The Psychology of Money.' The chapter on tail events changed how I think about investing. Best book I've read in years.",date:"2026-02-10"}], createdAt:"2026-01-01" },
  { id:"g8", category:"emotional", priority:"High", title:"Start therapy and develop 3 healthy emotional coping tools",
    specific:"Attend therapy biweekly for at least 6 months. Identify 3 personal emotional triggers and develop a specific coping strategy for each. Journal 3x per week.",
    measurable:"12+ therapy sessions attended. 3 triggers identified in writing. 3 coping tools practiced for 30+ days each.",
    achievable:"Insurance covers therapy. Found a therapist who specializes in anxiety and high achievers. First appointment already scheduled.",
    relevant:"I perform well externally but internally I'm running on stress. This is the most important investment I can make in myself.",
    timebound:"2026-09-01",
    subtasks:[{id:"g8s1",label:"Complete intake appointment",done:true},{id:"g8s2",label:"Attend 4 consecutive biweekly sessions",done:true},{id:"g8s3",label:"Identify trigger #1 and write it down",done:true},{id:"g8s4",label:"Identify triggers #2 and #3",done:false},{id:"g8s5",label:"Practice one coping tool for 30 consecutive days",done:false},{id:"g8s6",label:"Journal 3x/week for 8 consecutive weeks",done:false}],
    journal:[{id:"j8",text:"Third therapy session today. Talked about the way I use productivity to avoid feeling things. Hard to hear but I needed to.",date:"2026-02-25"}], createdAt:"2026-01-05" },
  { id:"g9", category:"travel", priority:"Low", title:"Take a solo international trip — Portugal or Japan",
    specific:"Plan and complete a 10–14 day solo trip to either Lisbon/Porto or Tokyo/Kyoto — including a physical challenge like a hike or long run at each destination.",
    measurable:"Trip booked and completed. 2+ destinations visited. 1 athletic activity per city. Photo journal kept.",
    achievable:"Passport valid. 12 PTO days available. Budget of $3,500 set aside. Solo travel experience from domestic trips.",
    relevant:"I've talked about traveling internationally for 4 years and never done it. This is the year I stop talking and go.",
    timebound:"2026-11-30",
    subtasks:[{id:"g9s1",label:"Decide: Portugal vs Japan",done:false},{id:"g9s2",label:"Research visa requirements",done:false},{id:"g9s3",label:"Book flights (aim 3+ months out for price)",done:false},{id:"g9s4",label:"Book accommodations",done:false},{id:"g9s5",label:"Complete the trip",done:false}],
    journal:[], createdAt:"2026-02-01" },
];
const SEED_HABITS = [
  { id:"dh1",  category:"morning",   label:"Make bed immediately after waking",  icon:"🛏", color:"#C8A96E" },
  { id:"dh2",  category:"morning",   label:"10 min morning walk outside",        icon:"🌅", color:"#E8A45A" },
  { id:"dh3",  category:"morning",   label:"Shower + get fully dressed",         icon:"🚿", color:"#7EB8D4" },
  { id:"dh4",  category:"morning",   label:"30 min no-phone morning block",      icon:"📵", color:"#9B8FE8" },
  { id:"dh5",  category:"morning",   label:"Review goals for the day",           icon:"◎", color:"#E87AAF" },
  { id:"dh6",  category:"night",     label:"No screens after 10pm",             icon:"🌙", color:"#9B8FE8" },
  { id:"dh7",  category:"night",     label:"Brush & floss teeth",               icon:"🦷", color:"#7EB8D4" },
  { id:"dh8",  category:"night",     label:"Read 20 minutes",                   icon:"📖", color:"#C8A96E" },
  { id:"dh9",  category:"night",     label:"Journal — 3 things grateful for",   icon:"✦", color:"#E8A45A" },
  { id:"dh10", category:"night",     label:"In bed by 10:30pm",                 icon:"💤", color:"#5AC8C8" },
  { id:"dh11", category:"fitness",   label:"Complete planned workout",          icon:"⚡", color:"#E8645A" },
  { id:"dh12", category:"fitness",   label:"Running session logged in Strava",  icon:"🏃", color:"#E8645A" },
  { id:"dh13", category:"fitness",   label:"10 min stretching / mobility",      icon:"🧘", color:"#E87AAF" },
  { id:"dh14", category:"fitness",   label:"Step count 8,000+",                 icon:"👟", color:"#4CAF82" },
  { id:"dh15", category:"nutrition", label:"Eat a high-protein breakfast",      icon:"🥚", color:"#E8A45A" },
  { id:"dh16", category:"nutrition", label:"Drink 2.5L+ water",                 icon:"💧", color:"#5AC8C8" },
  { id:"dh17", category:"nutrition", label:"No alcohol on weekdays",            icon:"🚫", color:"#9B8FE8" },
  { id:"dh18", category:"nutrition", label:"Log meals (MyFitnessPal)",          icon:"📱", color:"#4CAF82" },
  { id:"dh19", category:"nutrition", label:"Meal prepped this week",            icon:"🍱", color:"#4CAF82" },
];
const HAB_CATS = [
  { id:"morning",     label:"Morning Routine", color:"#C8A96E", icon:"☀️" },
  { id:"night",       label:"Night Routine",   color:"#9B8FE8", icon:"🌙" },
  { id:"fitness",     label:"Fitness",         color:"#E8645A", icon:"⚡" },
  { id:"nutrition",   label:"Nutrition",       color:"#4CAF82", icon:"🥗" },
  { id:"mindfulness", label:"Mindfulness",     color:"#7EB8D4", icon:"🧘" },
  { id:"learning",    label:"Learning",        color:"#E8A45A", icon:"📚" },
  { id:"social",      label:"Social",          color:"#E87AAF", icon:"💬" },
  { id:"finances",    label:"Finances",        color:"#4CAF82", icon:"💰" },
];
const PRESET_HABITS = {
  morning: [
    { label:"Make bed immediately after waking", icon:"🛏️" },
    { label:"10 min morning walk outside", icon:"🌅" },
    { label:"Cold shower", icon:"🚿" },
    { label:"30 min no-phone morning block", icon:"📵" },
    { label:"Review goals for the day", icon:"◎" },
    { label:"Morning journaling (5 min)", icon:"📓" },
    { label:"Drink 500ml water on waking", icon:"💧" },
    { label:"Sunlight exposure within 1hr", icon:"☀️" },
  ],
  night: [
    { label:"No screens after 10pm", icon:"🌙" },
    { label:"Brush & floss teeth", icon:"🦷" },
    { label:"Read 20 minutes", icon:"📖" },
    { label:"Journal — 3 things grateful for", icon:"✦" },
    { label:"In bed by 10:30pm", icon:"💤" },
    { label:"Plan tomorrow (2 min)", icon:"📋" },
    { label:"Skincare routine", icon:"✨" },
    { label:"Put clothes out for tomorrow", icon:"👔" },
  ],
  fitness: [
    { label:"Complete planned workout", icon:"⚡" },
    { label:"Running session", icon:"🏃" },
    { label:"10 min stretching / mobility", icon:"🧘" },
    { label:"Step count 8,000+", icon:"👟" },
    { label:"Swim session", icon:"🏊" },
    { label:"Cycling workout", icon:"🚴" },
    { label:"Active recovery walk", icon:"🚶" },
    { label:"Track lifts in app", icon:"📊" },
  ],
  nutrition: [
    { label:"Eat a high-protein breakfast", icon:"🥚" },
    { label:"Drink 2.5L+ water", icon:"💧" },
    { label:"No alcohol on weekdays", icon:"🚫" },
    { label:"Log meals (MyFitnessPal)", icon:"📱" },
    { label:"Meal prepped this week", icon:"🍱" },
    { label:"Hit protein target", icon:"🥩" },
    { label:"No processed food today", icon:"🥦" },
    { label:"Take supplements", icon:"💊" },
  ],
  mindfulness: [
    { label:"Meditate 10 minutes", icon:"🧘" },
    { label:"Breathing exercise (box breathing)", icon:"🌬️" },
    { label:"Gratitude entry (3 things)", icon:"💛" },
    { label:"Screen-free hour", icon:"📵" },
    { label:"Therapy / coaching session", icon:"💬" },
    { label:"Spend time in nature", icon:"🌿" },
    { label:"Digital detox after 9pm", icon:"🌙" },
    { label:"Affirmations / visualization", icon:"✦" },
  ],
  learning: [
    { label:"Read 20 min non-fiction", icon:"📚" },
    { label:"Watch 1 educational video", icon:"🎓" },
    { label:"Practice a language (Duolingo)", icon:"🌍" },
    { label:"Review flashcards", icon:"🃏" },
    { label:"Work on side project", icon:"💻" },
    { label:"Write something (blog/notes)", icon:"✍️" },
    { label:"Listen to a podcast episode", icon:"🎧" },
    { label:"Practice an instrument", icon:"🎵" },
  ],
  social: [
    { label:"Reach out to a friend or family", icon:"📞" },
    { label:"Quality time with loved ones", icon:"❤️" },
    { label:"Send an encouraging message", icon:"💌" },
    { label:"Social media max 30 min", icon:"📱" },
    { label:"Quality 1:1 with a mentor", icon:"🤝" },
    { label:"No complaining today", icon:"🙅" },
    { label:"Random act of kindness", icon:"🌟" },
    { label:"Attend a community event", icon:"🏘️" },
  ],
  finances: [
    { label:"Review daily spending", icon:"💳" },
    { label:"Log expenses in budget app", icon:"📊" },
    { label:"No impulse purchases", icon:"🛑" },
    { label:"Check investment accounts", icon:"📈" },
    { label:"Pack lunch (save money)", icon:"🥪" },
    { label:"Transfer to savings", icon:"🏦" },
    { label:"Review weekly budget (Fridays)", icon:"📋" },
    { label:"Read 15 min finance content", icon:"💰" },
  ],
};
// ─── UTILS ────────────────────────────────────────────────────────────────────				
const todayStr = () => new Date().toISOString().split("T")[0];				
const calcProgress = g => { const t=g.subtasks.length,d=g.subtasks.filter(s=>s.done).length; return t>0?Math.round(d/t*100):0; };				
const daysLeft = tb => tb ? Math.ceil((new Date(tb)-new Date())/86400000) : null;				
// Keep localStorage as offline fallback only				
function useLS(key, init) {				
  const [v, setV] = useState(() => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; } });				
  useEffect(() => { localStorage.setItem(key, JSON.stringify(v)); }, [key, v]);				
  return [v, setV];				
}				
// ─── PROGRESS RING ────────────────────────────────────────────────────────────				
function Ring({ pct, color, size=52, strokeWidth=4 }) {				
  const r=(size-strokeWidth*2)/2, circ=2*Math.PI*r, offset=circ-(pct/100)*circ;				
  return (				
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>				
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}/>				
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}				
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"				
        style={{transition:"stroke-dashoffset 0.7s ease"}}/>				
    </svg>				
  );				
}				
// ─── NAV ──────────────────────────────────────────────────────────────────────				
function Nav({ tab, setTab }) {				
  const tabs = [				
    { id:"goals",    icon:"◎", label:"Goals" },				
    { id:"habits",   icon:"✦", label:"Habits" },				
    { id:"analytics",icon:"▲", label:"Analytics" },				
  ];				
  return (				
    <div style={{display:"flex",gap:4,background:T.surface,borderRadius:14,padding:4,border:`1px solid ${T.border}`}}>				
      {tabs.map(t => (				
        <button key={t.id} onClick={()=>setTab(t.id)}				
          style={{padding:"9px 20px",borderRadius:11,border:"none",background:tab===t.id?"linear-gradient(135deg,#9B8FE8 0%,#7EB8D4 100%)":"transparent",color:tab===t.id?"#fff":T.muted,cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:7,transition:"all 0.2s",fontFamily:"inherit"}}>				
          <span>{t.icon}</span>{t.label}				
        </button>				
      ))}				
    </div>				
  );				
}				
// ─── AI COACH MODAL ───────────────────────────────────────────────────────────				
function AICoachModal({ onClose, onGoalGenerated }) {				
  const [msgs, setMsgs] = useState([{role:"assistant",content:"Hey! I'm your SMART Goal Coach ✦\n\nDescribe a goal you're thinking about — as vague or specific as you want. I'll ask the right questions and build you a complete SMART goal ready for your dashboard."}]);				
  const [input, setInput] = useState("");				
  const [loading, setLoading] = useState(false);				
  const [pending, setPending] = useState(null);				
  const bottomRef = useRef(null);				
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"})},[msgs,loading]);				
  const SYSTEM = `You are a SMART Goal Coach inside a personal goal tracking app. Help the user define a SMART goal through natural conversation. Categories: physical, financial, religious, parenting, career, lifestyle, emotional, travel. When ready output:				
<GOAL_JSON>{"title":"...","category":"physical","priority":"High","specific":"...","measurable":"...","achievable":"...","relevant":"...","timebound":"YYYY-MM-DD","subtasks":["..."]}</GOAL_JSON>				
User context: ambitious early-20s data engineer at Travelers Insurance LDP, single father to Sebastian, Half Ironman + sub-3hr marathon athlete, wants personal training business, working toward investment property. Be direct, warm, motivating.`;				
  const send = async () => {				
    if (!input.trim()||loading) return;				
    const nm = [...msgs,{role:"user",content:input.trim()}];				
    setMsgs(nm); setInput(""); setLoading(true);				
    try {				
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYSTEM,messages:nm.map(m=>({role:m.role,content:m.content}))})});				
      const data = await res.json();				
      const text = data.content?.map(b=>b.text||"").join("")||"Something went wrong.";				
      const match = text.match(/<GOAL_JSON>([\s\S]*?)<\/GOAL_JSON>/);				
      if (match) { try { const raw=JSON.parse(match[1].trim()); setPending({id:Date.now().toString(),...raw,category:raw.category?.toLowerCase()||"physical",subtasks:(raw.subtasks||[]).map((s,i)=>({id:`ai${Date.now()}${i}`,label:s,done:false})),journal:[],createdAt:todayStr()}); } catch(e){} }				
      setMsgs(prev=>[...prev,{role:"assistant",content:text.replace(/<GOAL_JSON>[\s\S]*?<\/GOAL_JSON>/g,"").trim()}]);				
    } catch(e) { setMsgs(prev=>[...prev,{role:"assistant",content:"Connection error. Try again."}]); }				
    setLoading(false);				
  };				
  const cat = pending ? (CATS.find(c=>c.id===pending.category)||CATS[0]) : null;				
  return (				
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(14px)"}}>				
      <div style={{background:"#0D0F14",border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,width:"min(580px,96vw)",height:"min(680px,90vh)",display:"flex",flexDirection:"column",overflow:"hidden"}}>				
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(155,143,232,0.05)"}}>				
          <div style={{display:"flex",alignItems:"center",gap:12}}>				
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#9B8FE8,#E87AAF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✦</div>				
            <div><div style={{fontWeight:700,color:"#fff",fontSize:14}}>SMART Goal Coach</div><div style={{fontSize:10,color:T.muted,letterSpacing:1}}>POWERED BY CLAUDE AI</div></div>				
          </div>				
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>				
        </div>				
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px",display:"flex",flexDirection:"column",gap:12}}>				
          {msgs.map((m,i)=>(				
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>				
              <div style={{maxWidth:"83%",padding:"12px 15px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.05)",color:"#fff",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",border:m.role==="assistant"?`1px solid ${T.border}`:"none"}}>{m.content}</div>				
            </div>				
          ))}				
          {loading && <div style={{display:"flex"}}><div style={{padding:"12px 16px",borderRadius:"16px 16px 16px 4px",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"rgba(155,143,232,0.8)",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div></div>}				
          {pending&&cat&&(				
            <div style={{background:`${cat.color}12`,border:`1px solid ${cat.color}44`,borderRadius:14,padding:16}}>				
              <div style={{fontSize:10,color:cat.color,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>✓ Goal Ready to Add</div>				
              <div style={{fontWeight:700,color:"#fff",fontSize:14,marginBottom:3}}>{pending.title}</div>				
              <div style={{fontSize:11,color:T.muted,marginBottom:12}}>{cat.icon} {cat.label} · {pending.priority} · Due {pending.timebound}</div>				
              <div style={{display:"flex",gap:8}}>				
                <button onClick={()=>{onGoalGenerated(pending);onClose();}} style={{flex:1,background:cat.color,border:"none",borderRadius:10,padding:"11px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Add to Dashboard →</button>				
                <button onClick={()=>setPending(null)} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 14px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Keep chatting</button>				
              </div>				
            </div>				
          )}				
          <div ref={bottomRef}/>				
        </div>				
        <div style={{padding:"14px 22px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10}}>				
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Describe a goal you want to work toward..."				
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 15px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>				
          <button onClick={send} disabled={loading||!input.trim()} style={{background:input.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:12,padding:"0 20px",color:input.trim()?"#fff":"rgba(255,255,255,0.2)",cursor:input.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Send</button>				
        </div>				
      </div>				
      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>				
    </div>				
  );				
}				
// ─── SMART MODAL ──────────────────────────────────────────────────────────────				
function SmartModal({ onSave, onClose, editGoal }) {				
  const [step, setStep] = useState(0);				
  const [form, setForm] = useState(editGoal||{title:"",category:"physical",specific:"",measurable:"",achievable:"",relevant:"",timebound:"",priority:"Medium",subtasks:[],journal:[]});				
  const [si, setSi] = useState("");				
  const steps=[{key:"title",label:"What's your goal?",hint:"Clear, action-oriented title",type:"text",placeholder:"e.g. Run a 5K without stopping"},{key:"category",label:"Which area of life?",type:"category"},{key:"specific",label:"Make it Specific",hint:"What exactly will you accomplish?",type:"textarea",placeholder:"Describe exactly what you want to achieve..."},{key:"measurable",label:"Make it Measurable",hint:"How will you know you succeeded?",type:"textarea",placeholder:"What number or milestone proves success?"},{key:"achievable",label:"Make it Achievable",hint:"Why is this realistic right now?",type:"textarea",placeholder:"What resources/skills do you have?"},{key:"relevant",label:"Make it Relevant",hint:"Why does this matter deeply?",type:"textarea",placeholder:"How does this connect to your bigger life goals?"},{key:"timebound",label:"Set a Deadline",hint:"When will you complete this?",type:"date"},{key:"priority",label:"Set Priority",type:"priority"},{key:"subtasks",label:"Break into subtasks",hint:"Key milestones along the way",type:"subtasks"}];				
  const cur=steps[step], cat=CATS.find(c=>c.id===form.category)||CATS[0];				
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));				
  const canNext=()=>cur.key==="title"?form.title.trim().length>2:cur.key==="specific"?form.specific.trim().length>5:true;				
  const addSub=()=>{if(!si.trim())return;upd("subtasks",[...form.subtasks,{id:Date.now().toString(),label:si.trim(),done:false}]);setSi("");};				
  const save=()=>{onSave({...form,id:editGoal?.id||Date.now().toString(),journal:editGoal?.journal||[],createdAt:editGoal?.createdAt||todayStr()});onClose();};				
  const inp={background:"rgba(255,255,255,0.05)",border:`1px solid ${T.faint}`,borderRadius:10,padding:"13px 15px",color:"#fff",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"};				
  return (				
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>				
      <div style={{background:"#13151E",border:`1px solid ${T.border}`,borderRadius:20,width:"min(540px,95vw)",padding:"36px",position:"relative"}}>				
        <div style={{display:"flex",gap:4,marginBottom:28}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?cat.color:"rgba(255,255,255,0.1)",transition:"background 0.3s"}}/>)}</div>				
        <div style={{fontSize:10,letterSpacing:3,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Step {step+1} of {steps.length}</div>				
        <h2 style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4,fontFamily:"Georgia,serif"}}>{cur.label}</h2>				
        {cur.hint&&<p style={{fontSize:12,color:T.muted,marginBottom:20,lineHeight:1.5}}>{cur.hint}</p>}				
        {cur.type==="text"&&<input value={form[cur.key]} onChange={e=>upd(cur.key,e.target.value)} placeholder={cur.placeholder} autoFocus onKeyDown={e=>e.key==="Enter"&&canNext()&&setStep(s=>s+1)} style={inp}/>}				
        {cur.type==="textarea"&&<textarea value={form[cur.key]} onChange={e=>upd(cur.key,e.target.value)} placeholder={cur.placeholder} rows={4} style={{...inp,resize:"vertical",lineHeight:1.6}}/>}				
        {cur.type==="date"&&<input type="date" value={form.timebound} onChange={e=>upd("timebound",e.target.value)} style={{...inp,width:"auto",colorScheme:"dark"}}/>}				
        {cur.type==="category"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>{CATS.map(c=><button key={c.id} onClick={()=>upd("category",c.id)} style={{background:form.category===c.id?`${c.color}22`:"rgba(255,255,255,0.03)",border:`1.5px solid ${form.category===c.id?c.color:T.faint}`,borderRadius:11,padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}><span style={{fontSize:18}}>{c.icon}</span><span style={{fontSize:10,color:form.category===c.id?c.color:T.muted,fontWeight:700}}>{c.label}</span></button>)}</div>}				
        {cur.type==="priority"&&<div style={{display:"flex",gap:10}}>{["High","Medium","Low"].map(p=><button key={p} onClick={()=>upd("priority",p)} style={{flex:1,padding:"13px",borderRadius:11,border:`1.5px solid ${form.priority===p?(p==="High"?"#E8645A":p==="Medium"?"#C8A96E":"#4CAF82"):T.faint}`,background:form.priority===p?"rgba(255,255,255,0.06)":"transparent",color:form.priority===p?"#fff":T.muted,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>{p}</button>)}</div>}				
        {cur.type==="subtasks"&&<div><div style={{display:"flex",gap:8,marginBottom:10}}><input value={si} onChange={e=>setSi(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSub()} placeholder="Add a milestone..." style={{...inp,flex:1}}/><button onClick={addSub} style={{background:cat.color,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:17,fontFamily:"inherit"}}>+</button></div><div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:170,overflowY:"auto"}}>{form.subtasks.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:9,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"9px 13px"}}><span style={{flex:1,color:"rgba(255,255,255,0.8)",fontSize:13}}>{s.label}</span><button onClick={()=>upd("subtasks",form.subtasks.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:15,fontFamily:"inherit"}}>✕</button></div>)}{form.subtasks.length===0&&<p style={{color:"rgba(255,255,255,0.2)",fontSize:12,textAlign:"center",padding:"14px 0"}}>No subtasks yet</p>}</div></div>}				
        <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>				
          <button onClick={()=>step===0?onClose():setStep(s=>s-1)} style={{background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"11px 22px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>{step===0?"Cancel":"← Back"}</button>				
          {step<steps.length-1?<button onClick={()=>setStep(s=>s+1)} disabled={!canNext()} style={{background:canNext()?cat.color:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"11px 26px",color:canNext()?"#fff":"rgba(255,255,255,0.2)",cursor:canNext()?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Continue →</button>:<button onClick={save} style={{background:cat.color,border:"none",borderRadius:10,padding:"11px 26px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>{editGoal?"Save ✓":"Create Goal ✓"}</button>}				
        </div>				
      </div>				
    </div>				
  );				
}				
// ─── JOURNAL PANEL ────────────────────────────────────────────────────────────				
function JournalPanel({ goal, onAddNote, onClose, catColor }) {				
  const [note, setNote] = useState("");				
  return (				
    <div style={{background:"#13151E",border:`1px solid ${T.border}`,borderRadius:13,padding:18,marginTop:13}}>				
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>				
        <span style={{color:"#fff",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Journal</span>				
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:17,fontFamily:"inherit"}}>✕</button>				
      </div>				
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="How's this goal going? What did you do today?" rows={3}				
        style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,borderRadius:9,padding:"11px",color:"#fff",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box"}}/>				
      <button onClick={()=>{if(!note.trim())return;onAddNote(goal.id,{date:todayStr(),note:note.trim()});setNote("");}}				
        style={{marginTop:8,background:catColor,border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>Add Entry</button>				
      <div style={{display:"flex",flexDirection:"column",gap:9,maxHeight:170,overflowY:"auto",marginTop:11}}>				
        {[...goal.journal].reverse().map((j,i)=>(				
          <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 13px",borderLeft:`3px solid ${catColor}`}}>				
            <div style={{fontSize:10,color:T.muted,marginBottom:3}}>{j.date}</div>				
            <p style={{fontSize:12,color:"rgba(255,255,255,0.65)",margin:0,lineHeight:1.5}}>{j.note}</p>				
          </div>				
        ))}				
        {goal.journal.length===0&&<p style={{color:"rgba(255,255,255,0.18)",fontSize:11,textAlign:"center",padding:"10px 0"}}>No entries yet</p>}				
      </div>				
    </div>				
  );				
}				
// ─── GOAL CARD ────────────────────────────────────────────────────────────────				
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
          <h3 style={{fontSize:14,fontWeight:700,color:"#fff",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{goal.title}</h3>				
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
// ─── GOALS PAGE ───────────────────────────────────────────────────────────────				
function GoalsPage({ goals, setGoals, saveGoal, deleteGoal, toggleSubtask, addJournalNote, setShowAI, setShowModal, setEditGoal, onImportDemoGoals }) {				
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
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="⌕  Search goals..."				
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
// ─── HABITS PAGE ──────────────────────────────────────────────────────────────
const DAY_SCHEDULES = [
  { id:"daily",    label:"Every day",    short:"Daily",    days:[0,1,2,3,4,5,6] },
  { id:"weekdays", label:"Weekdays",     short:"M–F",      days:[1,2,3,4,5] },
  { id:"weekends", label:"Weekends",     short:"Sat/Sun",  days:[0,6] },
  { id:"custom",   label:"Custom days",  short:"Custom",   days:[] },
];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function HabitsPage({ habits, saveHabit, deleteHabit, habitLogs, toggleHabitLog, addHabits }) {
  const today = todayStr();
  const todayDow = new Date().getDay(); // 0=Sun...6=Sat
  const todayLog = habitLogs[today] || {};
  const [activeCat, setActiveCat] = useState("all");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetCat, setPresetCat] = useState("morning");
  const [newHabit, setNewHabit] = useState({label:"",category:"morning",icon:"✓",color:"#C8A96E",schedule:"daily",customDays:[0,1,2,3,4,5,6]});
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isScheduledToday = (h) => {
    const sched = h.schedule || "daily";
    if (sched === "daily") return true;
    if (sched === "weekdays") return todayDow >= 1 && todayDow <= 5;
    if (sched === "weekends") return todayDow === 0 || todayDow === 6;
    if (sched === "custom") return (h.customDays || []).includes(todayDow);
    return true;
  };

  const toggle = (hid) => toggleHabitLog(today, hid, !!todayLog[hid]);

  const getStreak = (hid) => {
    let streak = 0, d = new Date();
    for (let i = 0; i < 365; i++) {
      d.setDate(d.getDate() - 1);
      const ds = d.toISOString().split("T")[0];
      if (habitLogs[ds]?.[hid]) streak++;
      else break;
    }
    return streak;
  };

  const allCats = [...new Set(habits.map(h => h.category))];
  const knownCatIds = HAB_CATS.map(c => c.id);
  const customCats = allCats.filter(id => !knownCatIds.includes(id)).map(id => ({
    id, label: id.charAt(0).toUpperCase() + id.slice(1), color: "#9B8FE8", icon: "◎"
  }));
  const allHabCats = [...HAB_CATS, ...customCats];

  const todayHabits = habits.filter(isScheduledToday);
  const filtered = activeCat === "all" ? todayHabits : habits.filter(h => h.category === activeCat);
  const allDone = todayHabits.length > 0 && todayHabits.every(h => todayLog[h.id]);
  const doneCnt = todayHabits.filter(h => todayLog[h.id]).length;
  const pct = todayHabits.length > 0 ? Math.round(doneCnt / todayHabits.length * 100) : 0;

  const addHabit = (habitData) => {
    if (!habitData.label.trim()) return;
    const h = {
      id: `h${Date.now()}`,
      category: habitData.category,
      label: habitData.label.trim(),
      icon: habitData.icon || "✓",
      color: habitData.color,
      schedule: habitData.schedule || "daily",
      customDays: habitData.customDays || [0,1,2,3,4,5,6],
    };
    saveHabit(h);
    setNewHabit({label:"",category:"morning",icon:"✓",color:"#C8A96E",schedule:"daily",customDays:[0,1,2,3,4,5,6]});
    setShowAddHabit(false);
    setShowPresets(false);
  };

  const addPreset = (preset, catId) => {
    const cat = allHabCats.find(c => c.id === catId) || HAB_CATS[0];
    addHabit({ label: preset.label, icon: preset.icon, category: catId, color: cat.color, schedule: "daily", customDays: [0,1,2,3,4,5,6] });
  };

  const openEdit = (h) => { setEditingHabit({...h}); setShowEditModal(true); };
  const saveEdit = () => {
    if (editingHabit) { saveHabit(editingHabit); setShowEditModal(false); setEditingHabit(null); }
  };

  const getCatObj = (id) => allHabCats.find(c => c.id === id) || { color:"#9B8FE8", icon:"◎", label: id };

  const SchedulePicker = ({ val, customDays, onChange, onChangeDays }) => (
    <div>
      <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>SCHEDULE</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom: val==="custom"?10:0}}>
        {DAY_SCHEDULES.map(s => (
          <button key={s.id} onClick={()=>onChange(s.id)}
            style={{padding:"6px 13px",borderRadius:8,border:`1.5px solid ${val===s.id?"#9B8FE8":T.faint}`,background:val===s.id?"rgba(155,143,232,0.15)":"transparent",color:val===s.id?"#9B8FE8":T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
            {s.label}
          </button>
        ))}
      </div>
      {val === "custom" && (
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {DAY_LABELS.map((d,i) => {
            const on = customDays.includes(i);
            return (
              <button key={i} onClick={()=>{
                const next = on ? customDays.filter(x=>x!==i) : [...customDays,i];
                onChangeDays(next);
              }} style={{width:36,height:36,borderRadius:8,border:`1.5px solid ${on?"#9B8FE8":T.faint}`,background:on?"rgba(155,143,232,0.2)":"transparent",color:on?"#9B8FE8":T.muted,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>
                {d}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Today header */}
      <div style={{background:T.card,borderRadius:16,padding:"20px 24px",marginBottom:18,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:20}}>
        <div style={{position:"relative",flexShrink:0}}>
          <Ring pct={pct} color={allDone?"#4CAF82":"#9B8FE8"} size={72} strokeWidth={5}/>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18,fontWeight:800,color:allDone?"#4CAF82":"#9B8FE8"}}>{pct}%</span>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Today — {today}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>
            {allDone ? "🎉 All done!" : `${doneCnt} of ${todayHabits.length} habits`}
          </div>
          <div style={{fontSize:12,color:T.muted}}>{allDone?"You crushed it today. Consistency is everything.":"Keep going — every check-off counts."}</div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>setShowPresets(true)} style={{background:"rgba(76,175,130,0.12)",border:"1px solid rgba(76,175,130,0.28)",borderRadius:11,padding:"10px 14px",color:"#4CAF82",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>✦ Presets</button>
          <button onClick={()=>setShowAddHabit(true)} style={{background:"rgba(155,143,232,0.12)",border:"1px solid rgba(155,143,232,0.28)",borderRadius:11,padding:"10px 16px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Custom</button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
        {[{id:"all",label:"All",color:"#9B8FE8",icon:""},...allHabCats].map(c => {
          const cnt = c.id==="all" ? habits.length : habits.filter(h=>h.category===c.id).length;
          if (c.id !== "all" && cnt === 0) return null;
          return (
            <button key={c.id} onClick={()=>setActiveCat(c.id)}
              style={{flexShrink:0,padding:"8px 16px",borderRadius:20,border:`1.5px solid ${activeCat===c.id?c.color:"rgba(255,255,255,0.1)"}`,background:activeCat===c.id?`${c.color}18`:"transparent",color:activeCat===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>
              {c.icon ? c.icon+" " : ""}{c.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Habits by category */}
      {(activeCat === "all"
        ? allHabCats.filter(c => habits.some(h => h.category === c.id))
        : allHabCats.filter(c => c.id === activeCat)
      ).map(cat => {
        const catHabits = (activeCat === "all" ? habits.filter(isScheduledToday) : habits).filter(h => h.category === cat.id);
        if (!catHabits.length) return null;
        const catDone = catHabits.filter(h => todayLog[h.id]).length;
        return (
          <div key={cat.id} style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{cat.icon}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{cat.label}</span>
                <span style={{fontSize:10,color:cat.color,fontWeight:600}}>{catDone}/{catHabits.length}</span>
              </div>
              <div style={{height:3,width:80,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>
                <div style={{height:"100%",borderRadius:2,background:cat.color,width:`${catHabits.length>0?Math.round(catDone/catHabits.length*100):0}%`,transition:"width 0.5s"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {catHabits.map(h => {
                const done = !!todayLog[h.id];
                const streak = getStreak(h.id);
                const schedLabel = DAY_SCHEDULES.find(s=>s.id===(h.schedule||"daily"))?.short || "Daily";
                const notToday = !isScheduledToday(h) && activeCat !== "all";
                return (
                  <div key={h.id}
                    style={{background:done?`${h.color}10`:notToday?"rgba(255,255,255,0.02)":T.card,border:`1px solid ${done?h.color+"44":T.border}`,borderRadius:12,padding:"13px 16px",display:"flex",alignItems:"center",gap:13,transition:"all 0.2s",opacity:notToday?0.45:1}}
                    onClick={() => !notToday && toggle(h.id)}>
                    <div style={{width:26,height:26,borderRadius:8,border:`2px solid ${done?h.color:"rgba(255,255,255,0.2)"}`,background:done?h.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.25s",cursor:notToday?"default":"pointer"}}>
                      {done&&<span style={{color:"#fff",fontSize:13,fontWeight:800}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:done?"rgba(255,255,255,0.45)":"#fff",textDecoration:done?"line-through":"none"}}>{h.label}</div>
                      <div style={{display:"flex",gap:8,marginTop:2,alignItems:"center"}}>
                        {streak>0&&<span style={{fontSize:10,color:h.color}}>🔥 {streak}d streak</span>}
                        <span style={{fontSize:9,color:"rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.05)",padding:"1px 6px",borderRadius:4}}>{schedLabel}</span>
                        {notToday && <span style={{fontSize:9,color:T.muted}}>not scheduled today</span>}
                      </div>
                    </div>
                    <span style={{fontSize:18,opacity:done?1:0.3,transition:"opacity 0.2s"}}>{h.icon}</span>
                    <button onClick={e=>{e.stopPropagation();openEdit(h);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:12,padding:"2px 5px",fontFamily:"inherit"}} title="Edit">✎</button>
                    <button onClick={e=>{e.stopPropagation();deleteHabit(h.id);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:13,padding:"2px 4px",fontFamily:"inherit"}} title="Delete">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Preset Picker Modal */}
      {showPresets && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(10px)"}}>
          <div style={{background:"#13151E",border:`1px solid ${T.border}`,borderRadius:20,width:"min(560px,96vw)",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"22px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,color:"#fff",fontSize:16}}>Habit Presets</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>Pick a category and add ready-made habits</div>
              </div>
              <button onClick={()=>setShowPresets(false)} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,overflowX:"auto"}}>
              {HAB_CATS.map(c => (
                <button key={c.id} onClick={()=>setPresetCat(c.id)}
                  style={{flexShrink:0,padding:"11px 16px",background:"transparent",border:"none",borderBottom:`2px solid ${presetCat===c.id?c.color:"transparent"}`,color:presetCat===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 24px",display:"flex",flexDirection:"column",gap:8}}>
              {(PRESET_HABITS[presetCat]||[]).map((p,i) => {
                const alreadyAdded = habits.some(h => h.label === p.label);
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:11,background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`}}>
                    <span style={{fontSize:20}}>{p.icon}</span>
                    <span style={{flex:1,fontSize:13,color:"#fff",fontWeight:500}}>{p.label}</span>
                    <button onClick={()=>!alreadyAdded&&addPreset(p, presetCat)}
                      style={{padding:"6px 14px",borderRadius:8,border:"none",background:alreadyAdded?"rgba(76,175,130,0.15)":"linear-gradient(135deg,#9B8FE8,#7EB8D4)",color:alreadyAdded?"#4CAF82":"#fff",cursor:alreadyAdded?"default":"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>
                      {alreadyAdded ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Habit Modal */}
      {showAddHabit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>
          <div style={{background:"#13151E",border:`1px solid ${T.border}`,borderRadius:18,width:"min(480px,96vw)",padding:"28px",maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:20,fontFamily:"'DM Sans',sans-serif"}}>Create Custom Habit</h3>
            <input value={newHabit.label} onChange={e=>setNewHabit(n=>({...n,label:e.target.value}))} placeholder="Habit name..." autoFocus
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:"#fff",fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>CATEGORY</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {HAB_CATS.map(c=>(
                  <button key={c.id} onClick={()=>setNewHabit(n=>({...n,category:c.id,color:c.color}))}
                    style={{padding:"7px 13px",borderRadius:8,border:`1.5px solid ${newHabit.category===c.id?c.color:T.faint}`,background:newHabit.category===c.id?`${c.color}20`:"transparent",color:newHabit.category===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <SchedulePicker
                val={newHabit.schedule}
                customDays={newHabit.customDays}
                onChange={s=>setNewHabit(n=>({...n,schedule:s}))}
                onChangeDays={d=>setNewHabit(n=>({...n,customDays:d}))}
              />
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShowAddHabit(false)} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>addHabit(newHabit)} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Add Habit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Habit Modal */}
      {showEditModal && editingHabit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>
          <div style={{background:"#13151E",border:`1px solid ${T.border}`,borderRadius:18,width:"min(480px,96vw)",padding:"28px",maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:20,fontFamily:"'DM Sans',sans-serif"}}>Edit Habit</h3>
            <input value={editingHabit.label} onChange={e=>setEditingHabit(h=>({...h,label:e.target.value}))}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:"#fff",fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>CATEGORY</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {HAB_CATS.map(c=>(
                  <button key={c.id} onClick={()=>setEditingHabit(h=>({...h,category:c.id,color:c.color}))}
                    style={{padding:"7px 13px",borderRadius:8,border:`1.5px solid ${editingHabit.category===c.id?c.color:T.faint}`,background:editingHabit.category===c.id?`${c.color}20`:"transparent",color:editingHabit.category===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <SchedulePicker
                val={editingHabit.schedule || "daily"}
                customDays={editingHabit.customDays || [0,1,2,3,4,5,6]}
                onChange={s=>setEditingHabit(h=>({...h,schedule:s}))}
                onChangeDays={d=>setEditingHabit(h=>({...h,customDays:d}))}
              />
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShowEditModal(false)} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
              <button onClick={saveEdit} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ habits, habitLogs, goals }) {
  const [analyticsTab, setAnalyticsTab] = useState("habits");
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
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

  const getAIInsight = async () => {
    setAiLoading(true); setAiInsight("");
    const topHabits = habitStats.slice(0,5).map(h=>`${h.label}: ${h.pct}%`).join(", ");
    const lowHabits = habitStats.slice(-3).map(h=>`${h.label}: ${h.pct}%`).join(", ");
    const goalSummary = goals.slice(0,5).map(g=>`${g.title}: ${calcProgress(g)}%`).join("; ");
    const avgPct = Math.round(dailyData.reduce((a,d)=>a+d.pct,0)/Math.max(dailyData.length,1));
    const prompt = `You are a personal performance coach. ${analyticsTab==="habits"?`Here's habit tracking data for the past ${period}: Top habits: ${topHabits}. Habits needing work: ${lowHabits}. Avg daily completion: ${avgPct}%. Write a warm, direct 3-paragraph insight: celebrate what's working, identify the key pattern, give one concrete action this week. Under 200 words.`:`Here's goal progress data: ${goalSummary}. Overall avg: ${overallGoalPct}%. ${onTrack} goals on track, ${needsWork} needing attention. Write a warm, direct 3-paragraph insight: celebrate momentum, identify the key gap, give one focused action this week. Under 200 words.`}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      setAiInsight(data.content?.map(b=>b.text||"").join("")||"Could not generate insight.");
    } catch(e) { setAiInsight("Connection error. Try again."); }
    setAiLoading(false);
  };

  const maxBar = Math.max(...dailyData.map(d=>d.pct),1);
  const filteredHabits = filterHabit==="all" ? habitStats : habitStats.filter(h=>h.id===filterHabit);

  const StatCard = ({label,value,sub,color}) => (
    <div style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
      <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color,letterSpacing:-1}}>{value}</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:2}}>{sub}</div>
    </div>
  );

  return (
    <div>
      {/* Analytics Tab Toggle */}
      <div style={{display:"flex",background:T.surface,borderRadius:14,padding:4,border:`1px solid ${T.border}`,marginBottom:20,width:"fit-content"}}>
        {[["habits","✦ Habits"],["goals","◎ Goals"]].map(([id,label])=>(
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
        <button onClick={getAIInsight} disabled={aiLoading} style={{background:"linear-gradient(135deg,#9B8FE8,#E87AAF)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",cursor:aiLoading?"not-allowed":"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",opacity:aiLoading?0.7:1}}>
          {aiLoading?"Analyzing...":"✦ AI Insight"}
        </button>
      </div>

      {/* AI Insight */}
      {(aiInsight||aiLoading)&&(
        <div style={{background:"linear-gradient(135deg,rgba(155,143,232,0.1),rgba(232,122,175,0.08))",border:"1px solid rgba(155,143,232,0.3)",borderRadius:14,padding:"20px 22px",marginBottom:18}}>
          <div style={{fontSize:10,color:"#9B8FE8",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>✦ AI Coach Insight</div>
          {aiLoading?<div style={{display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"rgba(155,143,232,0.8)",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>
            :<p style={{fontSize:13,color:"rgba(255,255,255,0.75)",margin:0,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiInsight}</p>}
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
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.75)",fontWeight:600}}>{c.icon} {c.label} <span style={{color:T.muted,fontWeight:400,fontSize:11}}>({c.count} habits)</span></span>
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
                      <div style={{height:"100%",borderRadius:2,background:h.color,width:`${h.pct}%`,transition:"width 0.6s"}}/>
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

      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── HABIT SUGGESTER ──────────────────────────────────────────────────────────				
function HabitSuggester({ goal, existingHabits, onAdd, onClose }) {				
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
        const res = await fetch("https://api.anthropic.com/v1/messages", {				
          method: "POST",				
          headers: { "Content-Type": "application/json" },				
          body: JSON.stringify({				
            model: "claude-sonnet-4-20250514",				
            max_tokens: 600,				
            messages: [{ role: "user", content: prompt }]				
          })				
        });				
        const data = await res.json();				
        const text = data.content?.map(b => b.text || "").join("") || "[]";				
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
      <div style={{ background:"#13151E",border:`1px solid ${cat.color}44`,borderRadius:22,width:"min(500px,95vw)",padding:"32px",position:"relative" }}>				
        {/* Header */}				
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6 }}>				
          <div style={{ width:38,height:38,borderRadius:11,background:`${cat.color}22`,border:`1px solid ${cat.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{cat.icon}</div>				
          <div>				
            <div style={{ fontSize:10,color:cat.color,fontWeight:700,letterSpacing:2,textTransform:"uppercase" }}>AI Habit Suggester</div>				
            <div style={{ fontSize:15,fontWeight:700,color:"#fff",marginTop:1 }}>Habits for this goal</div>				
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
              Add {selectedCount} Habit{selectedCount!==1?"s":""}  →				
            </button>				
          )}				
        </div>				
        <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>				
      </div>				
    </div>				
  );				
}				
// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────				
function LoginScreen({ onLogin, onDemo, loading }) {				
  return (				
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif"}}>				
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300&display=swap" rel="stylesheet"/>				
      <div style={{textAlign:"center",padding:"0 24px",maxWidth:400,width:"100%"}}>				
        <div style={{fontSize:52,marginBottom:16}}>◎</div>				
        <h1 style={{fontSize:32,fontWeight:700,color:"#fff",letterSpacing:-1,marginBottom:8}}>				
          Life <span style={{color:"rgba(255,255,255,0.3)",fontWeight:300,fontStyle:"italic"}}>Dashboard</span>				
        </h1>				
        <p style={{fontSize:14,color:T.muted,lineHeight:1.6,maxWidth:300,margin:"0 auto 36px"}}>				
          Track your goals, build habits, and analyze your progress — all in one place.				
        </p>				
        {/* Google login */}				
        <button onClick={onLogin} disabled={loading}				
          style={{width:"100%",background:"#fff",border:"none",borderRadius:13,padding:"14px 24px",color:"#111",cursor:loading?"not-allowed":"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:loading?0.7:1,fontFamily:"inherit",boxShadow:"0 4px 24px rgba(255,255,255,0.08)",marginBottom:12}}>				
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>				
          {loading ? "Redirecting to Google..." : "Continue with Google"}				
        </button>				
        {/* Demo mode */}				
        <button onClick={onDemo}				
          style={{width:"100%",background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.3)",borderRadius:13,padding:"14px 24px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",marginBottom:24}}>				
          👀 View Demo (no login)				
        </button>				
        <p style={{fontSize:11,color:"rgba(255,255,255,0.15)"}}>				
          Google sign-in syncs your data across all devices. Demo mode uses sample data only.				
        </p>				
      </div>				
    </div>				
  );				
}				
// ─── ROOT APP ─────────────────────────────────────────────────────────────────				
export default function App() {				
  // ── Auth state ──				
  const [user, setUser] = useState(null);				
  const [authLoading, setAuthLoading] = useState(true);				
  const [loginLoading, setLoginLoading] = useState(false);				
  const [demoMode, setDemoMode] = useState(false);				
  // ── Data state ──				
  // demoMode uses SEED data, logged-in users get their own Firestore data				
  const [goals, setGoals] = useState([]);				
  const [habits, setHabits] = useState([]);				
  const [habitLogs, setHabitLogs] = useState({});				
  const [dataLoaded, setDataLoaded] = useState(false);				
  // ── UI state ──				
  const [tab, setTab] = useState("goals");				
  const [showAI, setShowAI] = useState(false);				
  const [showModal, setShowModal] = useState(false);				
  const [editGoal, setEditGoal] = useState(null);				
  const [suggestFor, setSuggestFor] = useState(null);				
  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);
  // ── Firestore listeners — real-time sync ──				
  useEffect(() => {				
    if (!user) return;				
    const uid = user.uid;				
    // Goals				
    const unsubGoals = onSnapshot(collection(db, "users", uid, "goals"), snap => {				
      const data = snap.docs.map(d => d.data());				
      setGoals(data);				
    });				
    // Habits				
    const unsubHabits = onSnapshot(collection(db, "users", uid, "habits"), snap => {				
      const data = snap.docs.map(d => d.data());				
      setHabits(data);				
    });				
    // Habit logs — last 90 days				
    const unsubLogs = onSnapshot(collection(db, "users", uid, "habitLogs"), snap => {				
      const logs = {};				
      snap.docs.forEach(d => { logs[d.id] = d.data(); });				
      setHabitLogs(logs);				
      setDataLoaded(true);				
    });				
    return () => { unsubGoals(); unsubHabits(); unsubLogs(); };				
  }, [user]);				
  // ── Firebase write helpers ──				
  const fbSaveGoal = async (goal) => {				
    if (!user) return;				
    await setDoc(doc(db, "users", user.uid, "goals", goal.id), goal);				
  };				
  const fbDeleteGoal = async (id) => {				
    if (!user) return;				
    await deleteDoc(doc(db, "users", user.uid, "goals", id));				
  };				
  const fbSaveHabit = async (habit) => {				
    if (!user) return;				
    await setDoc(doc(db, "users", user.uid, "habits", habit.id), habit);				
  };				
  const fbDeleteHabit = async (id) => {				
    if (!user) return;				
    await deleteDoc(doc(db, "users", user.uid, "habits", id));				
  };				
  const fbLogHabit = async (date, habitId, value) => {				
    if (!user) return;				
    const ref = doc(db, "users", user.uid, "habitLogs", date);				
    const current = habitLogs[date] || {};				
    await setDoc(ref, { ...current, [habitId]: value });				
  };				
  // ── Wrapped setters that write to Firestore + update local state ──				
  const saveGoal = (goal) => {				
    setGoals(gs => gs.find(g=>g.id===goal.id) ? gs.map(g=>g.id===goal.id?goal:g) : [...gs,goal]);				
    fbSaveGoal(goal);				
  };				
  const deleteGoal = (id) => {				
    setGoals(gs => gs.filter(g=>g.id!==id));				
    fbDeleteGoal(id);				
  };				
  const toggleSubtask = (goalId, subtaskId) => {				
    setGoals(gs => gs.map(g => {				
      if (g.id !== goalId) return g;				
      const updated = { ...g, subtasks: g.subtasks.map(s => s.id!==subtaskId ? s : {...s, done:!s.done}) };				
      fbSaveGoal(updated);				
      return updated;				
    }));				
  };				
  const addJournalNote = (goalId, entry) => {				
    setGoals(gs => gs.map(g => {				
      if (g.id !== goalId) return g;				
      const updated = { ...g, journal: [...g.journal, entry] };				
      fbSaveGoal(updated);				
      return updated;				
    }));				
  };				
  const saveHabit = (habit) => {				
    setHabits(hs => hs.find(h=>h.id===habit.id) ? hs.map(h=>h.id===habit.id?habit:h) : [...hs,habit]);				
    fbSaveHabit(habit);				
  };				
  const deleteHabit = (id) => {				
    setHabits(hs => hs.filter(h=>h.id!==id));				
    fbDeleteHabit(id);				
  };				
  const toggleHabitLog = (date, habitId, current) => {				
    const newVal = !current;				
    setHabitLogs(logs => ({ ...logs, [date]: { ...(logs[date]||{}), [habitId]: newVal } }));				
    fbLogHabit(date, habitId, newVal);				
  };				
  const addHabits = (newHabits) => {				
    newHabits.forEach(h => saveHabit(h));				
  };				
  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setLoginLoading(false);
    }
  };
  const handleDemo = () => {
    setDemoMode(true);
    setGoals(SEED_GOALS);
    setHabits(SEED_HABITS);
    setHabitLogs(generateDemoLogs(SEED_HABITS));
  };				
  const handleLogout = () => {				
    signOut(auth);				
    setDemoMode(false);				
    setGoals([]);				
    setHabits([]);				
    setHabitLogs({});				
  };				
  const greet = () => { const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; };				
  const today = todayStr();				
  const todayLog = habitLogs[today]||{};				
  const todayPct = habits.length>0 ? Math.round(habits.filter(h=>todayLog[h.id]).length/habits.length*100) : 0;				
  // ── Render states ──				
  if (authLoading) return (				
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>				
      <div style={{display:"flex",gap:8}}>{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#9B8FE8",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>				
      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>				
    </div>				
  );				
  if (!user && !demoMode) return <LoginScreen onLogin={handleLogin} onDemo={handleDemo} loading={loginLoading}/>;				
  return (				
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:T.text}}>				
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300&display=swap" rel="stylesheet"/>				
      {/* Header */}				
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(7,8,12,0.97)",backdropFilter:"blur(20px)",zIndex:10,gap:16,flexWrap:"wrap"}}>				
        <div style={{flexShrink:0}}>				
          <div style={{fontSize:10,color:T.muted,letterSpacing:3,textTransform:"uppercase",marginBottom:1}}>{greet()}, {demoMode ? "Demo" : user?.displayName?.split(" ")[0]}</div>				
          <div style={{display:"flex",alignItems:"center",gap:10}}>				
            <h1 style={{fontSize:18,fontWeight:700,margin:0,letterSpacing:-0.5}}>Life <span style={{color:"rgba(255,255,255,0.28)",fontWeight:300,fontStyle:"italic"}}>Dashboard</span></h1>				
            {tab==="habits"&&<div style={{fontSize:10,color:todayPct===100?"#4CAF82":"#9B8FE8",fontWeight:700,background:todayPct===100?"rgba(76,175,130,0.12)":"rgba(155,143,232,0.12)",padding:"3px 8px",borderRadius:6}}>{todayPct}% today</div>}				
          </div>				
        </div>				
        <Nav tab={tab} setTab={setTab}/>				
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>				
          <button onClick={()=>setShowAI(true)} style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.28)",borderRadius:10,padding:"9px 16px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>✦ AI Coach</button>				
          {tab==="goals"&&<button onClick={()=>{setEditGoal(null);setShowModal(true);}} style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(155,143,232,0.25)"}}>+ New Goal</button>}				
          {demoMode				
            ? <button onClick={handleLogin} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 14px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>Sign in to save →</button>				
            : <img src={user?.photoURL} alt="" onClick={handleLogout} title="Sign out" style={{width:30,height:30,borderRadius:"50%",cursor:"pointer",border:"2px solid rgba(255,255,255,0.15)",flexShrink:0}}/>				
          }				
        </div>				
      </div>				
      <div style={{maxWidth:900,margin:"0 auto",padding:"22px 18px"}}>				
        {tab==="goals"&&<GoalsPage goals={goals} setGoals={setGoals} saveGoal={saveGoal} deleteGoal={deleteGoal} toggleSubtask={toggleSubtask} addJournalNote={addJournalNote} setShowAI={setShowAI} setShowModal={setShowModal} setEditGoal={setEditGoal} onImportDemoGoals={!demoMode ? ()=>SEED_GOALS.forEach(g=>saveGoal({...g,id:"import_"+g.id})) : null}/>}				
        {tab==="habits"&&<HabitsPage habits={habits} saveHabit={saveHabit} deleteHabit={deleteHabit} habitLogs={habitLogs} toggleHabitLog={toggleHabitLog} addHabits={addHabits}/>}				
        {tab==="analytics"&&<AnalyticsPage habits={habits} habitLogs={habitLogs} goals={goals}/>}				
      </div>				
      {showModal&&<SmartModal editGoal={editGoal} onSave={goal=>{				
        const isEdit=!!editGoal;				
        saveGoal(goal);				
        setShowModal(false); setEditGoal(null);				
        if (!isEdit) setSuggestFor(goal);				
      }} onClose={()=>{setShowModal(false);setEditGoal(null);}}/>}				
      {showAI&&<AICoachModal onGoalGenerated={goal=>{				
        saveGoal(goal);				
        setShowAI(false);				
        setSuggestFor(goal);				
      }} onClose={()=>setShowAI(false)}/>}				
      {suggestFor&&<HabitSuggester goal={suggestFor} existingHabits={habits}				
        onAdd={addHabits} onClose={()=>setSuggestFor(null)}/>}				
    </div>				
  );				
}				
