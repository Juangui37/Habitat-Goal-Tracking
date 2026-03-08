import { useState, useEffect, useRef, useCallback } from "react";				
import { db, auth, googleProvider } from "./firebase.js";				
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";				
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";				
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
const SEED_GOALS = [				
  { id:"g1", category:"physical", priority:"High", title:"Gain 10-15 lbs of lean muscle & hit strength PRs",				
    specific:"Gain 10–15 lbs of lean muscle bringing bodyweight to 150–155 lbs, hit a 225 lb hang clean and 315 lb squat, with visible improvements in shoulder size and glute development.",				
    measurable:"Weekly weigh-ins via MyFitPal scale. Log all lifts in training journal. PRs are pass/fail. Progress photos every 4 weeks.",				
    achievable:"Currently ~140–145 lbs, 185 hang clean, prior 315 squat at 145 lbs. On 17-week Runna plan + 5-day gym schedule + creatine + meal prep.",				
    relevant:"You've conquered endurance — sub-3hr marathon and Half Ironman. Muscle is the next frontier.",				
    timebound:"2026-09-01",				
    subtasks:[{id:"g1s1",label:"Reach 148 lbs bodyweight",done:false},{id:"g1s2",label:"Hit 205 lb hang clean",done:false},{id:"g1s3",label:"Hit 225 lb hang clean PR",done:false},{id:"g1s4",label:"Hit 275 lb squat",done:false},{id:"g1s5",label:"Hit 315 lb squat",done:false},{id:"g1s6",label:"Reach 150–155 lbs bodyweight",done:false},{id:"g1s7",label:"Take 4-week progress photo comparison",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g2", category:"physical", priority:"High", title:"Run a half marathon in 1:25 or faster while building muscle",				
    specific:"Complete a half marathon in sub-1:25 while simultaneously gaining lean muscle mass — proving that strength and speed gains are not mutually exclusive.",				
    measurable:"Time tracked via Garmin or running app. Half marathon race registered and completed. Current baseline to be established in a time trial.",				
    achievable:"Already following a 17-week Runna plan with 4 runs/week. Sub-2:58 marathon proves elite aerobic base. This is a speed + efficiency goal, not a volume increase.",				
    relevant:"You want to be the complete athletic machine — fast, strong, and built. This proves you can do both at once.",				
    timebound:"2026-12-31",				
    subtasks:[{id:"g2s1",label:"Run a half marathon time trial to establish baseline",done:false},{id:"g2s2",label:"Complete 8 weeks of Runna speed-focused training",done:false},{id:"g2s3",label:"Run a half marathon under 1:35",done:false},{id:"g2s4",label:"Register for an official half marathon race",done:false},{id:"g2s5",label:"Complete race in sub-1:25",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g3", category:"physical", priority:"Medium", title:"Master nutrition — hit calorie & macro targets consistently",				
    specific:"Hit daily calorie targets and macro splits (protein/carb/fat) for at least 5 out of 7 days per week using MyFitPal tracking and meal prepping every Sunday.",				
    measurable:"MyFitPal streak tracked. Protein target: 160g+/day. Weekly Sunday meal prep completed = pass/fail. Weight trending toward 150–155 lbs.",				
    achievable:"Already bought Tupperware, MyFitPal subscription, and a food scale. Meal prep has started. This is about consistency, not starting from zero.",				
    relevant:"Nutrition is 80% of the body composition goal. You can outwork a bad diet for a while — not forever.",				
    timebound:"2026-09-01",				
    subtasks:[{id:"g3s1",label:"Set up MyFitPal goals — calorie target + macro split",done:false},{id:"g3s2",label:"Complete first full week of tracking every meal",done:false},{id:"g3s3",label:"Maintain 30-day MyFitPal streak",done:false},{id:"g3s4",label:"Meal prep every Sunday for 8 consecutive weeks",done:false},{id:"g3s5",label:"Hit protein target (160g+) for 30 consecutive days",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g4", category:"career", priority:"High", title:"Land a stimulating LDP rotation in Decision Science or Data Engineering",				
    specific:"Secure a rotation placement in Decision Science, Data Engineering, or technical Business Insights by June 8th — via active networking, 3+ informational interviews, and 2+ formal rotation interviews.",				
    measurable:"Track: networking 1:1s completed, interviews scheduled, placement confirmed by July 2026.",				
    achievable:"Already submitted rotate decision. Patrick Graziosi and EDDA leaders are warm contacts. Real project work (Jenkins pipeline, Streamlit app, Terraform IaC) to showcase.",				
    relevant:"You're wasting your early 20s on maintenance work. End-to-end ownership and tangible products are what fill you up.",				
    timebound:"2026-06-08",				
    subtasks:[{id:"g4s1",label:"Complete 1:1s with Decision Science contacts (Scott Cunningham, Jake's team)",done:false},{id:"g4s2",label:"Complete 1:1s with Data Engineering contacts (Trevor Stuart, Joe's teams)",done:false},{id:"g4s3",label:"Prep 5-min project portfolio walkthrough",done:false},{id:"g4s4",label:"Apply to 2–3 internal rotation postings",done:false},{id:"g4s5",label:"Complete at least 2 rotation interviews",done:false},{id:"g4s6",label:"Confirm placement by July 2026",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g5", category:"career", priority:"Medium", title:"Get certified and launch a personal training side gig",				
    specific:"Obtain a recognized personal training certification (CrossFit L1, NASM, or ACE), charge at least 2 paying clients, and define a clear niche.",				
    measurable:"Certification = pass/fail. 2 paying clients minimum. $200+/month revenue within 3 months of launching.",				
    achievable:"Already training a friend for free. Elite athletic credentials (Half Ironman, sub-3hr marathon). Knowledge is there — this is about formalizing and pricing it.",				
    relevant:"You've never wanted a 9–5. Helping people reach their goals lights you up. This is step one toward owning a business.",				
    timebound:"2026-12-31",				
    subtasks:[{id:"g5s1",label:"Research CrossFit L1 vs NASM CPT vs ACE — pick one",done:false},{id:"g5s2",label:"Register and schedule certification",done:false},{id:"g5s3",label:"Pass certification",done:false},{id:"g5s4",label:"Define niche and ideal client",done:false},{id:"g5s5",label:"Set your rates — research local PT pricing",done:false},{id:"g5s6",label:"Convert current free client to paid",done:false},{id:"g5s7",label:"Acquire 1 additional paying client",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g6", category:"career", priority:"Medium", title:"Learn to charge for my skills and think like an entrepreneur",				
    specific:"Stop giving away fitness plans, Excel builds, and technical help for free. Set rates for 3 services. Complete at least one paid transaction for a previously-free service.",				
    measurable:"Rate card for 3 services defined. 1 paid transaction completed by end of 2026.",				
    achievable:"You already build the product. The gap is pricing and the ask — a mindset shift, not a skill gap.",				
    relevant:"You want a business with people working under you. That starts with knowing your worth.",				
    timebound:"2026-12-31",				
    subtasks:[{id:"g6s1",label:"List 3 services you currently give away free",done:false},{id:"g6s2",label:"Research market rates for each",done:false},{id:"g6s3",label:"Write a one-page rate card",done:false},{id:"g6s4",label:"Say your rate out loud in a real conversation",done:false},{id:"g6s5",label:"Complete one paid transaction",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g7", category:"financial", priority:"High", title:"Understand and execute a 401k strategy for buying an investment property",				
    specific:"Document your friend's 401k home-buying strategy, understand loan vs. withdrawal mechanics, and create a written 12-month savings and execution plan for an investment property.",				
    measurable:"1 in-depth conversation documented. Written plan created. Know exact 401k balance and 12-month projection.",				
    achievable:"Already bought a house before, saved $50k from scratch. You're a minimalist who executes on savings plans.",				
    relevant:"You want passive income and financial independence — not just a paycheck. Real estate is the vehicle.",				
    timebound:"2027-03-01",				
    subtasks:[{id:"g7s1",label:"Schedule 1:1 with older friend about his 401k strategy",done:false},{id:"g7s2",label:"Research 401k loan vs. hardship withdrawal rules",done:false},{id:"g7s3",label:"Log into 401k portal — note balance and contribution rate",done:false},{id:"g7s4",label:"Decide: Roth vs Traditional 401k going forward",done:false},{id:"g7s5",label:"Set monthly savings target for down payment",done:false},{id:"g7s6",label:"Create written 12-month investment property plan",done:false},{id:"g7s7",label:"Connect with a real estate investor or HUD counselor",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g8", category:"financial", priority:"Medium", title:"Build a monthly budget and eliminate financial blind spots",				
    specific:"Create a zero-based monthly budget, identify all recurring subscriptions and expenses, and establish a clear savings rate with automatic transfers.",				
    measurable:"Budget created and followed for 3 consecutive months. All subscriptions audited. Savings rate defined as % of take-home pay.",				
    achievable:"You're already minimalist by nature. You saved $50k before — you just need a system, not a lifestyle change.",				
    relevant:"Financial intelligence is the foundation of the investment property goal. You can't invest what you don't track.",				
    timebound:"2026-06-30",				
    subtasks:[{id:"g8s1",label:"List every monthly expense and subscription",done:false},{id:"g8s2",label:"Cancel unused subscriptions",done:false},{id:"g8s3",label:"Build a zero-based monthly budget",done:false},{id:"g8s4",label:"Set up automatic savings transfer",done:false},{id:"g8s5",label:"Follow the budget for 3 consecutive months",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g9", category:"religious", priority:"Medium", title:"Study the major world religions and establish a personal faith practice",				
    specific:"Spend 6 months learning about Catholicism, Protestant Christianity, and 1–2 other faiths. Establish a weekly worship practice by end of 2026.",				
    measurable:"Complete 3+ structured resources. Maintain weekly practice for 8+ consecutive weeks.",				
    achievable:"Grew up Catholic but with a language barrier. English-language resources (The Bible Project on YouTube) are free.",				
    relevant:"You've overcome too much to chalk it up to coincidence. Build a real relationship with God, not just inherited religion.",				
    timebound:"2026-12-31",				
    subtasks:[{id:"g9s1",label:"Watch The Bible Project intro series on YouTube",done:false},{id:"g9s2",label:"Read or listen to the Gospel of Matthew in English",done:false},{id:"g9s3",label:"Attend 2 different church services",done:false},{id:"g9s4",label:"Research one non-Christian faith",done:false},{id:"g9s5",label:"Journal: What do I believe? What resonates?",done:false},{id:"g9s6",label:"Establish a weekly worship/prayer habit",done:false},{id:"g9s7",label:"Maintain the habit for 8 consecutive weeks",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g10", category:"lifestyle", priority:"Medium", title:"Build a consistent male grooming and style routine",				
    specific:"Build a daily skincare routine, establish a consistent haircare routine, and curate 10 versatile outfits across office, social, and active contexts.",				
    measurable:"Skincare streak: 60+ consecutive days. 10 complete outfits catalogued. Own 1–2 signature scents.",				
    achievable:"Already wearing dress pants to the office and bought dress shoes. Building on existing momentum.",				
    relevant:"People treat you how you look. Your presentation should match your ambition.",				
    timebound:"2026-09-01",				
    subtasks:[{id:"g10s1",label:"Research and build a 3-step skincare routine",done:false},{id:"g10s2",label:"Visit a barber and establish a haircut schedule",done:false},{id:"g10s3",label:"Find a signature fragrance",done:false},{id:"g10s4",label:"Audit wardrobe — donate what doesn't fit the vision",done:false},{id:"g10s5",label:"Build 5 office-ready outfits",done:false},{id:"g10s6",label:"Build 5 social outfits",done:false},{id:"g10s7",label:"Maintain daily skincare for 60 consecutive days",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g11", category:"emotional", priority:"High", title:"Develop emotional regulation skills and reduce reactive behavior",				
    specific:"Work in therapy to identify 3 core emotional triggers, develop 2–3 healthy coping strategies, and reduce reactive outbursts — especially toward Sebastian.",				
    measurable:"Therapy 2x/month minimum. Journal 3x/week. Reactive episodes reduced by 50% over 6 months.",				
    achievable:"Already in therapy. Already self-aware enough to name the patterns. Now it's about tools and consistency.",				
    relevant:"You go go go without stopping to feel. This is the foundation everything else rests on.",				
    timebound:"2026-12-31",				
    subtasks:[{id:"g11s1",label:"Attend therapy consistently — minimum 2x/month",done:false},{id:"g11s2",label:"Start a 3x/week feelings journal",done:false},{id:"g11s3",label:"Identify and write down 3 core emotional triggers",done:false},{id:"g11s4",label:"Learn and practice 1 regulation technique with therapist",done:false},{id:"g11s5",label:"Track reactive moments toward Sebastian for 30 days",done:false},{id:"g11s6",label:"Share the parenting goal with your therapist explicitly",done:false},{id:"g11s7",label:"Review progress at month 3 and month 6",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g12", category:"parenting", priority:"High", title:"Create a consistent, connected parenting rhythm with Sebastian",				
    specific:"Establish a weekly phone-free 1:1 activity with Sebastian. Replace phone-as-babysitter with 3 go-to activities. Take Sebastian on at least 2 trips this year.",				
    measurable:"Weekly 1:1 tracked. 2 trips completed. No yelling for 7 consecutive days = first milestone.",				
    achievable:"You already take him to the gym and salsa. The love is there. This is about structure and self-regulation.",				
    relevant:"Sebastian is the most important relationship in your life. Breaking the cycle is the most meaningful thing you can do.",				
    timebound:"2026-12-31",				
    subtasks:[{id:"g12s1",label:"Complete Florida trip April 7–14 with Sebastian ✈️",done:false},{id:"g12s2",label:"Establish 1 weekly phone-free activity with Sebastian",done:false},{id:"g12s3",label:"Identify 3 go-to non-phone activities Sebastian loves",done:false},{id:"g12s4",label:"Go 7 consecutive days without yelling",done:false},{id:"g12s5",label:"Discuss parenting triggers in therapy",done:false},{id:"g12s6",label:"Plan and complete a second trip with Sebastian",done:false},{id:"g12s7",label:"Ask Sebastian what his favorite things to do with you are",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g13", category:"travel", priority:"Medium", title:"Complete a Las Vegas to Southwest National Parks road trip",				
    specific:"Fly to Las Vegas, rent a car, road trip through 3+ national parks (Zion, Bryce Canyon, Grand Canyon, Joshua Tree) with one athletic challenge at each park.",				
    measurable:"3+ national parks visited. 1 athletic activity per park. Trip planned 6 weeks in advance.",				
    achievable:"Already solo traveled to Puerto Rico and Miami. Comfortable with independent travel and hard physical challenges.",				
    relevant:"You want to see what the US has to offer. Solo travel shapes you. This is the road trip version — epic and formative.",				
    timebound:"2026-11-30",				
    subtasks:[{id:"g13s1",label:"Pick a travel window (fall 2026 — best Southwest weather)",done:false},{id:"g13s2",label:"Research Zion, Bryce Canyon, Grand Canyon, Joshua Tree",done:false},{id:"g13s3",label:"Book flights to Las Vegas",done:false},{id:"g13s4",label:"Book rental car",done:false},{id:"g13s5",label:"Book accommodations (campsite or budget lodging)",done:false},{id:"g13s6",label:"Plan 1 athletic activity per park",done:false},{id:"g13s7",label:"Complete the trip 🏜️",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
  { id:"g14", category:"travel", priority:"Low", title:"Plan a California and West Coast exploration trip",				
    specific:"Take a West Coast trip covering California (LA, SF, or both) plus one additional coastal or nature destination — incorporating an athletic component like a coastal run, bike ride, or hike.",				
    measurable:"Trip planned and booked. At least 2 distinct destinations visited. 1 athletic challenge completed.",				
    achievable:"Comfortable solo traveler. Domestic trip — no passport required. Budget-conscious traveler who plans well.",				
    relevant:"You've explored the Northeast. The West Coast is a completely different world. This broadens who you are.",				
    timebound:"2027-06-30",				
    subtasks:[{id:"g14s1",label:"Decide: LA, SF, both, or Pacific Coast Highway road trip",done:false},{id:"g14s2",label:"Research top athletic/outdoor experiences on West Coast",done:false},{id:"g14s3",label:"Book flights",done:false},{id:"g14s4",label:"Book accommodations",done:false},{id:"g14s5",label:"Complete the trip 🌊",done:false}],				
    journal:[], createdAt:"2026-03-06" },				
];				
// ─── SEED HABITS ──────────────────────────────────────────────────────────────				
const SEED_HABITS = [				
  { id:"h1",  category:"morning",   label:"Thank God / morning prayer",     icon:"✦", color:"#C8A96E" },				
  { id:"h2",  category:"morning",   label:"Eat breakfast",                  icon:"🥣", color:"#E8A45A" },				
  { id:"h3",  category:"morning",   label:"Shower",                         icon:"🚿", color:"#7EB8D4" },				
  { id:"h4",  category:"morning",   label:"Gym / morning workout",          icon:"⚡", color:"#E8645A" },				
  { id:"h5",  category:"morning",   label:"Pack food for work",             icon:"🥗", color:"#4CAF82" },				
  { id:"h6",  category:"night",     label:"Put tomorrow's clothes out",     icon:"👔", color:"#9B8FE8" },				
  { id:"h7",  category:"night",     label:"Floss",                          icon:"🦷", color:"#7EB8D4" },				
  { id:"h8",  category:"night",     label:"Interdental brush",              icon:"🪥", color:"#7EB8D4" },				
  { id:"h9",  category:"night",     label:"Brush teeth",                    icon:"✔",  color:"#4CAF82" },				
  { id:"h10", category:"night",     label:"Read 30 minutes",                icon:"📖", color:"#C8A96E" },				
  { id:"h11", category:"night",     label:"Fluoride mouthwash",             icon:"💧", color:"#5AC8C8" },				
  { id:"h12", category:"fitness",   label:"Runna workout completed",        icon:"🏃", color:"#E8645A" },				
  { id:"h13", category:"fitness",   label:"Hevy strength session",          icon:"🏋️", color:"#E8645A" },				
  { id:"h14", category:"fitness",   label:"Stretch / mobility work",        icon:"🧘", color:"#E87AAF" },				
  { id:"h15", category:"nutrition", label:"Take creatine",                  icon:"💊", color:"#9B8FE8" },				
  { id:"h16", category:"nutrition", label:"Hit protein target (160g+)",     icon:"🥩", color:"#E8645A" },				
  { id:"h17", category:"nutrition", label:"Log food in MyFitPal",           icon:"📱", color:"#4CAF82" },				
  { id:"h18", category:"nutrition", label:"Drink 3L+ water",                icon:"💧", color:"#5AC8C8" },				
  { id:"h19", category:"nutrition", label:"Meal prepped this week",         icon:"🍱", color:"#4CAF82" },				
  { id:"h20", category:"morning",   label:"Skincare routine",               icon:"✨", color:"#E87AAF" },				
];				
const HAB_CATS = [				
  { id:"morning",   label:"Morning Routine", color:"#C8A96E", icon:"☀" },				
  { id:"night",     label:"Night Routine",   color:"#9B8FE8", icon:"🌙" },				
  { id:"fitness",   label:"Fitness",         color:"#E8645A", icon:"⚡" },				
  { id:"nutrition", label:"Nutrition",       color:"#4CAF82", icon:"◈" },				
];				
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
function GoalsPage({ goals, setGoals, saveGoal, deleteGoal, toggleSubtask, addJournalNote, setShowAI, setShowModal, setEditGoal }) {				
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
      {filtered.length===0?(<div style={{textAlign:"center",padding:"80px 0"}}><div style={{fontSize:48,marginBottom:16}}>◎</div><h3 style={{color:"#fff",fontWeight:700,fontSize:18,margin:"0 0 8px"}}>No goals yet</h3><p style={{color:T.muted,fontSize:13,margin:"0 0 24px",lineHeight:1.6}}>Start by creating your first SMART goal,<br/>or let the AI Coach guide you.</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>setShowModal(true)} style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"12px 24px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>+ Create First Goal</button><button onClick={()=>setShowAI(true)} style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.3)",borderRadius:11,padding:"12px 24px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>✦ AI Coach</button></div></div>)				
        :(filtered.map(g=><GoalCard key={g.id} goal={g} onToggleSubtask={toggleSubtask} onDelete={deleteGoal} onEdit={eg=>{setEditGoal(eg);setShowModal(true);}} onAddNote={addJournalNote}/>))}				
    </div>				
  );				
}				
// ─── HABITS PAGE ──────────────────────────────────────────────────────────────				
function HabitsPage({ habits, saveHabit, deleteHabit, habitLogs, toggleHabitLog, addHabits }) {				
  const today = todayStr();				
  const todayLog = habitLogs[today] || {};				
  const [activeCat, setActiveCat] = useState("all");				
  const [showAddHabit, setShowAddHabit] = useState(false);				
  const [newHabit, setNewHabit] = useState({label:"",category:"morning",icon:"✓",color:"#9B8FE8"});				
  const toggle = (hid) => toggleHabitLog(today, hid, !!todayLog[hid]);				
  const getStreak = (hid) => {				
    let streak = 0, d = new Date();				
    while (true) {				
      d.setDate(d.getDate()-1);				
      const ds = d.toISOString().split("T")[0];				
      if (habitLogs[ds]?.[hid]) streak++; else break;				
      if (streak > 365) break;				
    }				
    return streak;				
  };				
  const filtered = activeCat==="all" ? habits : habits.filter(h=>h.category===activeCat);				
  const allDone = filtered.every(h=>todayLog[h.id]);				
  const doneCnt = filtered.filter(h=>todayLog[h.id]).length;				
  const pct = filtered.length>0 ? Math.round(doneCnt/filtered.length*100) : 0;				
  const addHabit = () => {				
    if (!newHabit.label.trim()) return;				
    const h = {id:`h${Date.now()}`,category:newHabit.category,label:newHabit.label.trim(),icon:newHabit.icon,color:newHabit.color};				
    saveHabit(h);				
    setNewHabit({label:"",category:"morning",icon:"✓",color:"#9B8FE8"});				
    setShowAddHabit(false);				
  };				
  const deleteHabitLocal = (id) => deleteHabit(id);				
  const catColors = {morning:"#C8A96E",night:"#9B8FE8",fitness:"#E8645A",nutrition:"#4CAF82"};				
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
            {allDone ? "🎉 All done!" : `${doneCnt} of ${filtered.length} habits`}				
          </div>				
          <div style={{fontSize:12,color:T.muted}}>{allDone?"You crushed it today. Consistency is everything.":"Keep going — every check-off counts."}</div>				
        </div>				
        <button onClick={()=>setShowAddHabit(true)} style={{background:"rgba(155,143,232,0.12)",border:"1px solid rgba(155,143,232,0.28)",borderRadius:11,padding:"10px 16px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Add Habit</button>				
      </div>				
      {/* Category filter */}				
      <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2}}>				
        {[{id:"all",label:"All",color:"#9B8FE8"},...HAB_CATS].map(c=>{				
          const cnt = c.id==="all" ? habits.length : habits.filter(h=>h.category===c.id).length;				
          return (<button key={c.id} onClick={()=>setActiveCat(c.id)} style={{flexShrink:0,padding:"8px 16px",borderRadius:20,border:`1.5px solid ${activeCat===c.id?c.color:"rgba(255,255,255,0.1)"}`,background:activeCat===c.id?`${c.color}18`:"transparent",color:activeCat===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>{c.id==="all"?"":c.icon+" "}{c.label} ({cnt})</button>);				
        })}				
      </div>				
      {/* Habits by category */}				
      {(activeCat==="all" ? HAB_CATS : HAB_CATS.filter(c=>c.id===activeCat)).map(cat => {				
        const catHabits = habits.filter(h=>h.category===cat.id);				
        if (!catHabits.length) return null;				
        const catDone = catHabits.filter(h=>todayLog[h.id]).length;				
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
                return (				
                  <div key={h.id} style={{background:done?`${h.color}10`:T.card,border:`1px solid ${done?h.color+"44":T.border}`,borderRadius:12,padding:"13px 16px",display:"flex",alignItems:"center",gap:13,transition:"all 0.2s",cursor:"pointer"}} onClick={()=>toggle(h.id)}>				
                    <div style={{width:26,height:26,borderRadius:8,border:`2px solid ${done?h.color:"rgba(255,255,255,0.2)"}`,background:done?h.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.25s"}}>				
                      {done&&<span style={{color:"#fff",fontSize:13,fontWeight:800}}>✓</span>}				
                    </div>				
                    <div style={{flex:1}}>				
                      <div style={{fontSize:13,fontWeight:600,color:done?"rgba(255,255,255,0.45)":"#fff",textDecoration:done?"line-through":"none"}}>{h.label}</div>				
                      {streak>0&&<div style={{fontSize:10,color:h.color,marginTop:2}}>🔥 {streak} day streak</div>}				
                    </div>				
                    <span style={{fontSize:18,opacity:done?1:0.3,transition:"opacity 0.2s"}}>{h.icon}</span>				
                    <button onClick={e=>{e.stopPropagation();deleteHabitLocal(h.id);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:13,padding:"2px 4px",fontFamily:"inherit"}}>✕</button>				
                  </div>				
                );				
              })}				
            </div>				
          </div>				
        );				
      })}				
      {/* Add habit modal */}				
      {showAddHabit&&(				
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>				
          <div style={{background:"#13151E",border:`1px solid ${T.border}`,borderRadius:18,width:"min(440px,94vw)",padding:"32px"}}>				
            <h3 style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:20,fontFamily:"Georgia,serif"}}>Add New Habit</h3>				
            <input value={newHabit.label} onChange={e=>setNewHabit(n=>({...n,label:e.target.value}))} placeholder="Habit name..." autoFocus				
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.faint}`,borderRadius:10,padding:"13px 15px",color:"#fff",fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"inherit"}}/>				
            <div style={{marginBottom:14}}>				
              <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>CATEGORY</div>				
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>				
                {HAB_CATS.map(c=><button key={c.id} onClick={()=>setNewHabit(n=>({...n,category:c.id,color:c.color}))} style={{padding:"7px 14px",borderRadius:8,border:`1.5px solid ${newHabit.category===c.id?c.color:T.faint}`,background:newHabit.category===c.id?`${c.color}20`:"transparent",color:newHabit.category===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>{c.icon} {c.label}</button>)}				
              </div>				
            </div>				
            <div style={{display:"flex",gap:10,marginTop:8}}>				
              <button onClick={()=>setShowAddHabit(false)} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>				
              <button onClick={addHabit} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Add Habit</button>				
            </div>				
          </div>				
        </div>				
      )}				
    </div>				
  );				
}				
// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────				
function AnalyticsPage({ habits, habitLogs, goals }) {				
  const [aiInsight, setAiInsight] = useState("");				
  const [aiLoading, setAiLoading] = useState(false);				
  const [period, setPeriod] = useState("week");				
  const [filterHabit, setFilterHabit] = useState("all");				
  // Build date range				
  const getDates = (p) => {				
    const dates = [], d = new Date();				
    const n = p==="week"?7:p==="month"?30:p==="quarter"?90:p==="halfyear"?180:365;				
    for (let i=n-1;i>=0;i--) { const dd=new Date(d); dd.setDate(d.getDate()-i); dates.push(dd.toISOString().split("T")[0]); }				
    return dates;				
  };				
  const dates = getDates(period);				
  // Overall completion by day				
  const dailyData = dates.map(date => {				
    const log = habitLogs[date]||{};				
    const done = habits.filter(h=>log[h.id]).length;				
    return { date, done, total:habits.length, pct:habits.length>0?Math.round(done/habits.length*100):0 };				
  });				
  // Per-habit completion rate				
  const habitStats = habits.map(h => {				
    const done = dates.filter(d=>habitLogs[d]?.[h.id]).length;				
    return { ...h, done, pct:dates.length>0?Math.round(done/dates.length*100):0 };				
  }).sort((a,b)=>b.pct-a.pct);				
  // Weekly summaries				
  const weekSummaries = [];				
  for (let i=0;i<Math.min(dates.length,90);i+=7) {				
    const week = dates.slice(i,i+7);				
    const avg = week.length>0?Math.round(week.reduce((a,d)=>a+(dailyData.find(x=>x.date===d)?.pct||0),0)/week.length):0;				
    weekSummaries.push({label:week[0],avg});				
  }				
  // Category habit completion				
  const catStats = HAB_CATS.map(cat => {				
    const ch = habits.filter(h=>h.category===cat.id);				
    const avg = ch.length>0&&dates.length>0 ? Math.round(ch.reduce((a,h)=>{				
      const done=dates.filter(d=>habitLogs[d]?.[h.id]).length;				
      return a+done/dates.length*100;				
    },0)/ch.length) : 0;				
    return {...cat,avg,count:ch.length};				
  });				
  // Goal progress overview				
  const goalStats = goals.map(g=>({...g,pct:calcProgress(g)})).sort((a,b)=>b.pct-a.pct);				
  const getAIInsight = async () => {				
    setAiLoading(true);				
    setAiInsight("");				
    const recentDays = dates.slice(-14).map(d=>({date:d,...(habitLogs[d]||{})}));				
    const habitNames = habits.reduce((a,h)=>({...a,[h.id]:h.label}),{});				
    const topHabits = habitStats.slice(0,5).map(h=>`${h.label}: ${h.pct}%`).join(", ");				
    const lowHabits = habitStats.slice(-3).map(h=>`${h.label}: ${h.pct}%`).join(", ");				
    const goalSummary = goals.slice(0,5).map(g=>`${g.title}: ${calcProgress(g)}%`).join("; ");				
    const prompt = `You are a personal performance coach giving a data-driven insight to Juan. Here's his tracking data for the past ${period}:				
Top habits by completion: ${topHabits}				
Habits needing attention: ${lowHabits}				
Goal progress: ${goalSummary}				
Overall avg daily completion: ${Math.round(dailyData.reduce((a,d)=>a+d.pct,0)/dailyData.length)}%				
Write a warm, direct, specific 3-paragraph insight. Paragraph 1: what's working and celebrate it. Paragraph 2: the key pattern or gap you see in the data. Paragraph 3: one concrete action for this week. Keep it under 200 words. Talk directly to Juan like a coach who knows him well.`;				
    try {				
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:prompt}]})});				
      const data = await res.json();				
      setAiInsight(data.content?.map(b=>b.text||"").join("")||"Could not generate insight.");				
    } catch(e) { setAiInsight("Connection error. Try again."); }				
    setAiLoading(false);				
  };				
  const maxBar = Math.max(...dailyData.map(d=>d.pct),1);				
  const filtered = filterHabit==="all" ? habitStats : habitStats.filter(h=>h.id===filterHabit);				
  return (				
    <div>				
      {/* Period selector */}				
      <div style={{display:"flex",gap:7,marginBottom:18,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>				
        <div style={{display:"flex",gap:7}}>				
          {[["week","7 Days"],["month","30 Days"],["quarter","90 Days"],["halfyear","6 Months"],["year","1 Year"]].map(([k,l])=>(				
            <button key={k} onClick={()=>setPeriod(k)} style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${period===k?"rgba(255,255,255,0.35)":T.border}`,background:period===k?"rgba(255,255,255,0.1)":"transparent",color:period===k?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{l}</button>				
          ))}				
        </div>				
        <button onClick={getAIInsight} disabled={aiLoading} style={{background:"linear-gradient(135deg,#9B8FE8,#E87AAF)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",cursor:aiLoading?"not-allowed":"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",opacity:aiLoading?0.7:1}}>				
          {aiLoading?"Analyzing...":"✦ Get AI Insight"}				
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
      {/* Summary stats */}				
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18}}>				
        {[				
          {l:"Avg Daily",v:`${Math.round(dailyData.reduce((a,d)=>a+d.pct,0)/Math.max(dailyData.length,1))}%`,s:`over ${dates.length} days`,c:"#9B8FE8"},				
          {l:"Best Day",v:`${Math.max(...dailyData.map(d=>d.pct))}%`,s:"single day high",c:"#4CAF82"},				
          {l:"Perfect Days",v:dailyData.filter(d=>d.pct===100).length,s:"100% completion",c:"#C8A96E"},				
          {l:"Active Habits",v:habits.length,s:"being tracked",c:"#7EB8D4"},				
        ].map(x=>(				
          <div key={x.l} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>				
            <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{x.l}</div>				
            <div style={{fontSize:26,fontWeight:700,color:x.c,letterSpacing:-1}}>{x.v}</div>				
            <div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:2}}>{x.s}</div>				
          </div>				
        ))}				
      </div>				
      {/* Daily bar chart */}				
      <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>				
        <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Daily Habit Completion</div>				
        <div style={{display:"flex",alignItems:"flex-end",gap:period==="year"?1:period==="halfyear"?2:period==="quarter"?3:4,height:80,overflow:"hidden"}}>				
          {dailyData.map((d,i)=>(				
            <div key={i} title={`${d.date}: ${d.pct}%`} style={{flex:1,minWidth:0,background:d.pct===100?"#4CAF82":d.pct>70?"#9B8FE8":d.pct>40?"#C8A96E":"rgba(255,255,255,0.1)",borderRadius:"2px 2px 0 0",height:`${Math.max((d.pct/maxBar)*100,d.pct>0?8:2)}%`,transition:"height 0.3s",cursor:"pointer"}}/>				
          ))}				
        </div>				
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>				
          <span style={{fontSize:10,color:T.muted}}>{dates[0]}</span>				
          <span style={{fontSize:10,color:T.muted}}>{dates[dates.length-1]}</span>				
        </div>				
      </div>				
      {/* Category breakdown */}				
      <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>				
        <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Completion by Category</div>				
        {catStats.map(c=>(				
          <div key={c.id} style={{marginBottom:12}}>				
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>				
              <span style={{fontSize:13,color:"rgba(255,255,255,0.75)",fontWeight:600}}>{c.icon} {c.label}</span>				
              <span style={{fontSize:12,fontWeight:700,color:c.color}}>{c.avg}%</span>				
            </div>				
            <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.07)"}}>				
              <div style={{height:"100%",borderRadius:3,background:c.color,width:`${c.avg}%`,transition:"width 0.6s ease"}}/>				
            </div>				
          </div>				
        ))}				
      </div>				
      {/* Per-habit leaderboard */}				
      <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:18,border:`1px solid ${T.border}`}}>				
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>				
          <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase"}}>Habit Performance</div>				
          <select value={filterHabit} onChange={e=>setFilterHabit(e.target.value)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",color:T.muted,fontSize:11,outline:"none",fontFamily:"inherit"}}>				
            <option value="all">All habits</option>				
            {habits.map(h=><option key={h.id} value={h.id}>{h.label}</option>)}				
          </select>				
        </div>				
        {filtered.map((h,i)=>(				
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${i<filtered.length-1?T.border:"transparent"}`}}>				
            <span style={{fontSize:11,color:T.muted,width:16,textAlign:"right",fontWeight:700}}>{i+1}</span>				
            <div style={{flex:1}}>				
              <div style={{fontSize:12,color:"#fff",fontWeight:600,marginBottom:3}}>{h.label}</div>				
              <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>				
                <div style={{height:"100%",borderRadius:2,background:h.color,width:`${h.pct}%`,transition:"width 0.6s"}}/>				
              </div>				
            </div>				
            <span style={{fontSize:12,fontWeight:700,color:h.pct>=80?"#4CAF82":h.pct>=50?"#C8A96E":"#E8645A",minWidth:36,textAlign:"right"}}>{h.pct}%</span>				
            <span style={{fontSize:10,color:T.muted,minWidth:50,textAlign:"right"}}>{h.done}/{dates.length}d</span>				
          </div>				
        ))}				
      </div>				
      {/* Goals progress */}				
      <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}>				
        <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Goal Progress Overview</div>				
        {goalStats.slice(0,8).map(g=>{				
          const cat = CATS.find(c=>c.id===g.category)||CATS[0];				
          return (				
            <div key={g.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>				
              <span style={{fontSize:16,flexShrink:0}}>{cat.icon}</span>				
              <div style={{flex:1,minWidth:0}}>				
                <div style={{fontSize:12,color:"#fff",fontWeight:600,marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.title}</div>				
                <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>				
                  <div style={{height:"100%",borderRadius:2,background:cat.color,width:`${g.pct}%`,transition:"width 0.6s"}}/>				
                </div>				
              </div>				
              <span style={{fontSize:12,fontWeight:700,color:cat.color,minWidth:34,textAlign:"right"}}>{g.pct}%</span>				
            </div>				
          );				
        })}				
      </div>				
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
  // ── Auth listener + redirect result ──				
  useEffect(() => {				
    // Check if returning from Google redirect				
    getRedirectResult(auth)				
      .then((result) => {				
        if (result && result.user) {				
          setUser(result.user);				
          setAuthLoading(false);				
        }				
      })				
      .catch((err) => {				
        console.error("redirect result error:", err);				
      });				
    // Listen for auth state changes				
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
  const handleLogin = () => {				
    signInWithRedirect(auth, googleProvider);				
  };				
  const handleDemo = () => {				
    setDemoMode(true);				
    setGoals(SEED_GOALS);				
    setHabits(SEED_HABITS);				
    setHabitLogs({});				
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
        {tab==="goals"&&<GoalsPage goals={goals} setGoals={setGoals} saveGoal={saveGoal} deleteGoal={deleteGoal} toggleSubtask={toggleSubtask} addJournalNote={addJournalNote} setShowAI={setShowAI} setShowModal={setShowModal} setEditGoal={setEditGoal}/>}				
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
