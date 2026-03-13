import { useState, useEffect, useRef, useCallback } from "react";					
import { db, auth, googleProvider } from "./firebase.js";					
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";					
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";					
const APP_NAME = "Lumina";					
const APP_TAGLINE = "your life, illuminated";					
const DARK_THEME = {					
  bg: "#07080C", surface: "#0E1018", card: "#13151E", border: "rgba(255,255,255,0.07)",					
  text: "#F0F0F8", muted: "rgba(255,255,255,0.38)", faint: "rgba(255,255,255,0.12)",					
  inputBg: "rgba(255,255,255,0.05)", isDark: true,					
};					
const LIGHT_THEME = {					
  bg: "#F4F5F8", surface: "#FFFFFF", card: "#FFFFFF", border: "rgba(0,0,0,0.08)",					
  text: "#0E1018", muted: "rgba(0,0,0,0.45)", faint: "rgba(0,0,0,0.1)",					
  inputBg: "rgba(0,0,0,0.04)", isDark: false,					
};					
let T = DARK_THEME;					
const CATS = [					
  { id:"physical",  label:"Physical",   icon:"⚡", color:"#E8645A" },					
  { id:"financial", label:"Financial",  icon:"◈",  color:"#4CAF82" },					
  { id:"religious", label:"Religious",  icon:"✦",  color:"#C8A96E" },					
  { id:"parenting", label:"Parenting",  icon:"❋",  color:"#7EB8D4" },					
  { id:"career",    label:"Career",     icon:"▲",  color:"#9B8FE8" },					
  { id:"lifestyle", label:"Lifestyle",  icon:"◎",  color:"#E8A45A" },					
  { id:"emotional", label:"Emotional",  icon:"◐",  color:"#E87AAF" },					
  { id:"travel",    label:"Travel",     icon:"⊕",  color:"#5AC8C8" },					
  { id:"health",    label:"Health",     icon:"♥",  color:"#E8645A" },					
  { id:"social",    label:"Social",     icon:"❤",  color:"#E87AAF" },					
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
  morning:     [{ label:"Make bed immediately", icon:"🛏️" },{ label:"10 min morning walk", icon:"🌅" },{ label:"Cold shower", icon:"🚿" },{ label:"No-phone morning block", icon:"📵" },{ label:"Review goals for the day", icon:"◎" },{ label:"Morning journaling (5 min)", icon:"📓" },{ label:"Drink 500ml water on waking", icon:"💧" },{ label:"Sunlight exposure within 1hr", icon:"☀️" }],					
  night:       [{ label:"No screens after 10pm", icon:"🌙" },{ label:"Brush & floss teeth", icon:"🦷" },{ label:"Read 20 minutes", icon:"📖" },{ label:"Journal — 3 things grateful", icon:"✦" },{ label:"In bed by 10:30pm", icon:"💤" },{ label:"Plan tomorrow (2 min)", icon:"📋" },{ label:"Skincare routine", icon:"✨" },{ label:"Put clothes out for tomorrow", icon:"👔" }],					
  fitness:     [{ label:"Complete planned workout", icon:"⚡" },{ label:"Running session", icon:"🏃" },{ label:"10 min stretching", icon:"🧘" },{ label:"Step count 8,000+", icon:"👟" },{ label:"Swim session", icon:"🏊" },{ label:"Cycling workout", icon:"🚴" },{ label:"Active recovery walk", icon:"🚶" },{ label:"Track lifts in app", icon:"📊" }],					
  nutrition:   [{ label:"Eat a high-protein breakfast", icon:"🥚" },{ label:"Drink 2.5L+ water", icon:"💧" },{ label:"No alcohol on weekdays", icon:"🚫" },{ label:"Log meals (MyFitnessPal)", icon:"📱" },{ label:"Meal prepped this week", icon:"🍱" },{ label:"Hit protein target", icon:"🥩" },{ label:"No processed food today", icon:"🥦" },{ label:"Take supplements", icon:"💊" }],					
  mindfulness: [{ label:"Meditate 10 minutes", icon:"🧘" },{ label:"Breathing exercise", icon:"🌬️" },{ label:"Gratitude entry (3 things)", icon:"💛" },{ label:"Screen-free hour", icon:"📵" },{ label:"Therapy session", icon:"💬" },{ label:"Spend time in nature", icon:"🌿" },{ label:"Digital detox after 9pm", icon:"🌙" },{ label:"Affirmations / visualization", icon:"✦" }],					
  learning:    [{ label:"Read 20 min non-fiction", icon:"📚" },{ label:"Watch 1 educational video", icon:"🎓" },{ label:"Practice a language", icon:"🌍" },{ label:"Review flashcards", icon:"🃏" },{ label:"Work on side project", icon:"💻" },{ label:"Write something", icon:"✍️" },{ label:"Listen to a podcast", icon:"🎧" },{ label:"Practice an instrument", icon:"🎵" }],					
  social:      [{ label:"Reach out to a friend", icon:"📞" },{ label:"Quality time with loved ones", icon:"❤️" },{ label:"Send an encouraging message", icon:"💌" },{ label:"Social media max 30 min", icon:"📱" },{ label:"1:1 with a mentor", icon:"🤝" },{ label:"No complaining today", icon:"🙅" },{ label:"Random act of kindness", icon:"🌟" },{ label:"Attend a community event", icon:"🏘️" }],					
  finances:    [{ label:"Review daily spending", icon:"💳" },{ label:"Log expenses in budget app", icon:"📊" },{ label:"No impulse purchases", icon:"🛑" },{ label:"Check investment accounts", icon:"📈" },{ label:"Pack lunch (save money)", icon:"🥪" },{ label:"Transfer to savings", icon:"🏦" },{ label:"Review weekly budget", icon:"📋" },{ label:"Read 15 min finance content", icon:"💰" }],					
};					
const DAY_SCHEDULES = [					
  { id:"daily",    label:"Every day",   short:"Daily",  days:[0,1,2,3,4,5,6] },					
  { id:"weekdays", label:"Weekdays",    short:"M–F",    days:[1,2,3,4,5] },					
  { id:"weekends", label:"Weekends",    short:"Sat/Sun",days:[0,6] },					
  { id:"custom",   label:"Custom days", short:"Custom", days:[] },					
];					
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];					
const todayStr = () => new Date().toISOString().split("T")[0];					
const calcProgress = g => { const t=g.subtasks.length,d=g.subtasks.filter(s=>s.done).length; return t>0?Math.round(d/t*100):0; };					
const daysLeft = tb => tb ? Math.ceil((new Date(tb)-new Date())/86400000) : null;					
const fmtDate = d => new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});					
function callClaude(prompt, systemPrompt, maxTokens=600) {					
  return fetch("https://api.anthropic.com/v1/messages", {					
    method:"POST", headers:{"Content-Type":"application/json"},					
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens: maxTokens,					
      ...(systemPrompt ? {system: systemPrompt} : {}),					
      messages:[{role:"user", content:prompt}]					
    })					
  }).then(r=>r.json()).then(d=>d.content?.map(b=>b.text||"").join("")||"");					
}					
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
const mkDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate()-daysAgo); return d.toISOString().split("T")[0]; };					
const SEED_REMINDERS = [					
  { id:"r1", text:"Open a brokerage account on Fidelity", done:false, createdAt:mkDate(30), dueDate:mkDate(-7), category:"financial", aiNote:"Linked to your financial goals around investing." },					
  { id:"r2", text:"Schedule dentist appointment", done:true, createdAt:mkDate(25), dueDate:mkDate(5), category:"health", aiNote:"Part of maintaining your physical health." },					
  { id:"r3", text:"Research CrossFit Level 1 certification dates", done:false, createdAt:mkDate(20), dueDate:mkDate(-14), category:"career", aiNote:"Connects to your personal training business goal." },					
  { id:"r4", text:"Set up automatic $900/month savings transfer", done:true, createdAt:mkDate(18), dueDate:mkDate(10), category:"financial", aiNote:"Directly supports your emergency fund goal." },					
  { id:"r5", text:"Call mom and catch up", done:false, createdAt:mkDate(14), dueDate:mkDate(1), category:"social", aiNote:"Nurturing important relationships." },					
  { id:"r6", text:"Register for fall half marathon", done:false, createdAt:mkDate(10), dueDate:mkDate(-3), category:"physical", aiNote:"Aligns with your running performance goals." },					
  { id:"r7", text:"Write a LinkedIn post about my API migration project", done:false, createdAt:mkDate(7), dueDate:mkDate(2), category:"career", aiNote:"Builds visibility for your promotion goal." },					
  { id:"r8", text:"Book therapy appointment for next week", done:true, createdAt:mkDate(5), dueDate:mkDate(3), category:"emotional", aiNote:"Supporting your emotional regulation goal." },					
  { id:"r9", text:"Look into Portugal flights for November", done:false, createdAt:mkDate(3), dueDate:mkDate(10), category:"travel", aiNote:"Related to your solo international travel goal." },					
  { id:"r10", text:"Review monthly budget — March spending", done:false, createdAt:mkDate(1), dueDate:mkDate(0), category:"financial", aiNote:"Part of your debt elimination strategy." },					
];					
const SEED_DIARY = [					
  { id:"d1", text:"Had an incredible long run today — 10 miles, negative splits the whole way. Six months ago I couldn't sustain this pace for 3 miles. The marathon training is working. My legs are sore but my mind is clear in a way that only running gives me. I've been thinking a lot about what it means to be consistent vs. being motivated. Motivation fades. Consistency is the whole game.", categories:["physical","emotional"], mood:"great", wordCount:78, createdAt:mkDate(45)+"T09:00:00.000Z" },					
  { id:"d2", text:"Therapy session today hit different. We talked about how I use achievement as armor — always chasing the next goal so I don't have to sit with the discomfort of the present. There's something real there. I genuinely love building and growing, but I need to make sure I'm also present. Sebastian asked me last night why I was on my phone during dinner. That one hurt.", categories:["emotional","parenting"], mood:"reflective", wordCount:82, createdAt:mkDate(38)+"T21:00:00.000Z" },					
  { id:"d3", text:"First paying client for the freelance work. $950 deposit hit my account today. I've built websites for people for free for three years. The number didn't change. The belief did. Charged what I was worth and they said yes without hesitation. The only thing that was ever in the way was me.", categories:["career","financial"], mood:"great", wordCount:55, createdAt:mkDate(30)+"T19:00:00.000Z" },					
  { id:"d4", text:"Rough week. Missed three workouts, blew my nutrition Thursday through Saturday, and spent way too much time doomscrolling. I'm not going to pretend it didn't happen or spin it into some lesson. Sometimes you just have an off week. The goal is to not let it become two.", categories:["physical","emotional"], mood:"low", wordCount:52, createdAt:mkDate(22)+"T22:00:00.000Z" },					
  { id:"d5", text:"Read The Psychology of Money cover to cover this weekend. The concept of 'reasonable vs rational' is going to stick with me for a long time. Being financially reasonable — making decisions you can stick to — matters more than being theoretically optimal. Applied this to my savings plan immediately. Moved from trying to maximize returns to just automating consistency.", categories:["financial","lifestyle"], mood:"good", wordCount:68, createdAt:mkDate(16)+"T16:00:00.000Z" },					
  { id:"d6", text:"Sebastian and I went to the farmers market this morning. No phones. Just us. He held my hand and asked me what my favorite fruit was and we argued about it for twenty minutes. These are the moments I want to protect. Not the races or the PRs or the promotions. This.", categories:["parenting","emotional"], mood:"great", wordCount:56, createdAt:mkDate(10)+"T11:00:00.000Z" },					
  { id:"d7", text:"Manager pulled me aside after the sprint review today. Said my API migration work was 'exactly the kind of ownership we need at senior level.' Didn't know how to respond. Just said thank you. Later I thought: this is what happens when you stop waiting to be noticed and just do the work loudly on purpose.", categories:["career"], mood:"good", wordCount:58, createdAt:mkDate(6)+"T18:00:00.000Z" },					
  { id:"d8", text:"Something strange happened during my meditation today — for about 90 seconds I genuinely had no internal monologue. Just breath and quiet. I've been meditating on and off for two years and that's never happened. Maybe consistency is finally paying off in ways I can't track on a spreadsheet.", categories:["emotional","lifestyle"], mood:"good", wordCount:57, createdAt:mkDate(2)+"T08:30:00.000Z" },					
];					
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
function Nav({ tab, setTab }) {					
  const tabs = [					
    { id:"goals",     icon:"◎", label:"Goals" },					
    { id:"habits",    icon:"✦", label:"Habits" },					
    { id:"reminders", icon:"🔔", label:"Reminders" },					
    { id:"diary",     icon:"📓", label:"Diary" },					
    { id:"analytics", icon:"▲", label:"Analytics" },					
  ];					
  return (					
    <div style={{display:"flex",gap:3,background:T.surface,borderRadius:14,padding:4,border:`1px solid ${T.border}`,overflowX:"auto"}}>					
      {tabs.map(t => (					
        <button key={t.id} onClick={()=>setTab(t.id)}					
          style={{flexShrink:0,padding:"8px 16px",borderRadius:11,border:"none",background:tab===t.id?"linear-gradient(135deg,#9B8FE8 0%,#7EB8D4 100%)":"transparent",color:tab===t.id?"#fff":T.muted,cursor:"pointer",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",fontFamily:"inherit"}}>					
          <span>{t.icon}</span>{t.label}					
        </button>					
      ))}					
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
function LoginScreen({ onGoogleLogin, onEmailLogin, onEmailSignup, loading, onDemo }) {					
  const [authMode, setAuthMode] = useState("options"); // options | email-login | email-signup					
  const [email, setEmail] = useState("");					
  const [password, setPassword] = useState("");					
  const [name, setName] = useState("");					
  const [error, setError] = useState("");					
  const [emailLoading, setEmailLoading] = useState(false);					
  const [resetSent, setResetSent] = useState(false);					
  const handleEmailSubmit = async () => {					
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }					
    setEmailLoading(true); setError("");					
    try {					
      if (authMode === "email-signup") {					
        await onEmailSignup(email, password, name);					
      } else {					
        await onEmailLogin(email, password);					
      }					
    } catch(e) {					
      setError(e.message?.replace("Firebase: ","").replace(/\(auth\/.*?\)/,"").trim() || "Something went wrong.");					
    }					
    setEmailLoading(false);					
  };					
  const handleReset = async () => {					
    if (!email.trim()) { setError("Enter your email address first."); return; }					
    try {					
      await sendPasswordResetEmail(auth, email);					
      setResetSent(true); setError("");					
    } catch(e) { setError("Couldn't send reset email. Check the address."); }					
  };					
  const inp = {width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:11,padding:"13px 16px",color:T.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:10};					
  return (					
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif"}}>					
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,300&display=swap" rel="stylesheet"/>					
      <div style={{textAlign:"center",padding:"0 24px",maxWidth:420,width:"100%"}}>					
        {/* Logo */}					
        <div style={{marginBottom:20}}>					
          <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28,boxShadow:"0 8px 32px rgba(155,143,232,0.35)"}}>✦</div>					
          <h1 style={{fontSize:34,fontWeight:700,color:T.text,letterSpacing:-1,margin:"0 0 6px"}}>					
            {APP_NAME}					
          </h1>					
          <p style={{fontSize:13,color:T.muted,letterSpacing:1,margin:0,textTransform:"lowercase"}}>{APP_TAGLINE}</p>					
        </div>					
        {authMode === "options" && (					
          <>					
            <p style={{fontSize:14,color:T.muted,lineHeight:1.6,maxWidth:300,margin:"0 auto 28px"}}>					
              Track goals, build habits, capture thoughts — all in one place.					
            </p>					
            {/* Google */}					
            <button onClick={onGoogleLogin} disabled={loading}					
              style={{width:"100%",background:T.isDark?"#fff":"#fff",border:`1px solid ${T.border}`,borderRadius:13,padding:"14px 24px",color:"#111",cursor:loading?"not-allowed":"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:loading?0.7:1,fontFamily:"inherit",boxShadow:"0 2px 16px rgba(0,0,0,0.15)",marginBottom:10}}>					
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>					
              {loading ? "Signing in..." : "Continue with Google"}					
            </button>					
            {/* Email */}					
            <button onClick={()=>setAuthMode("email-login")}					
              style={{width:"100%",background:"transparent",border:`1px solid ${T.border}`,borderRadius:13,padding:"14px 24px",color:T.text,cursor:"pointer",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"inherit",marginBottom:10}}>					
              ✉️ Continue with Email					
            </button>					
            {/* Apple - shows but notes it needs enabling */}					
            <button onClick={()=>alert("To enable Apple Sign-In, go to Firebase Console → Authentication → Sign-in method → Apple, and follow the setup steps. Requires Apple Developer account.")}					
              style={{width:"100%",background:T.isDark?"#fff":"#000",border:"none",borderRadius:13,padding:"14px 24px",color:T.isDark?"#000":"#fff",cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"inherit",marginBottom:24}}>					
              <svg width="16" height="18" viewBox="0 0 814 1000"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-161-39.5c-74 0-102.1 39.5-163 39.5s-103.4-61.7-155.5-122.9C92.3 772.7 15.5 658.3 15.5 552.5C15.5 371 141 278 264.1 278c66.4 0 121.9 43.7 163.6 43.7 41.4 0 106.4-46.4 181.3-46.4zm-235.4-158.1c31.1-37.9 53.1-90.8 53.1-143.6 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.1-55.1 135.9 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-68.5z"/></svg>					
              Continue with Apple					
            </button>					
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16,marginBottom:16}}>					
              <button onClick={onDemo}					
                style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.3)",borderRadius:13,padding:"12px 28px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>					
                👀 View Demo					
              </button>					
            </div>					
            <p style={{fontSize:11,color:"rgba(128,128,128,0.5)"}}>Your data is private and synced across devices.</p>					
          </>					
        )}					
        {(authMode === "email-login" || authMode === "email-signup") && (					
          <div style={{textAlign:"left"}}>					
            <button onClick={()=>{setAuthMode("options");setError("");}} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,marginBottom:20,padding:0,fontFamily:"inherit"}}>← Back</button>					
            <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:20}}>{authMode==="email-signup"?"Create account":"Sign in"}</h2>					
            {authMode === "email-signup" && (					
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp}/>					
            )}					
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={inp}/>					
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}/>					
            {error && <div style={{color:"#E8645A",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(232,100,90,0.1)",borderRadius:8}}>{error}</div>}					
            {resetSent && <div style={{color:"#4CAF82",fontSize:12,marginBottom:10}}>Reset email sent! Check your inbox.</div>}					
            <button onClick={handleEmailSubmit} disabled={emailLoading}					
              style={{width:"100%",background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"14px",color:"#fff",cursor:emailLoading?"not-allowed":"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",marginBottom:12,opacity:emailLoading?0.7:1}}>					
              {emailLoading?"Processing...":(authMode==="email-signup"?"Create Account":"Sign In")}					
            </button>					
            {authMode==="email-login" && (					
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>					
                <button onClick={()=>setAuthMode("email-signup")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Create account →</button>					
                <button onClick={handleReset} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Forgot password?</button>					
              </div>					
            )}					
            {authMode==="email-signup" && (					
              <button onClick={()=>setAuthMode("email-login")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Already have an account? Sign in →</button>					
            )}					
          </div>					
        )}					
      </div>					
    </div>					
  );					
}					
// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────					
function SettingsPage({ user, demoMode, onLogout, darkMode, setDarkMode, diaryPin, setDiaryPin }) {					
  const [showPinSetup, setShowPinSetup] = useState(false);					
  const [pinInput, setPinInput] = useState("");					
  const [pinConfirm, setPinConfirm] = useState("");					
  const [pinError, setPinError] = useState("");					
  const [pinSuccess, setPinSuccess] = useState(false);					
  const savePin = () => {					
    if (pinInput.length < 4) { setPinError("PIN must be at least 4 digits."); return; }					
    if (pinInput !== pinConfirm) { setPinError("PINs don't match."); return; }					
    setDiaryPin(pinInput);					
    setPinError(""); setPinSuccess(true);					
    setTimeout(()=>{ setShowPinSetup(false); setPinInput(""); setPinConfirm(""); setPinSuccess(false); }, 1500);					
  };					
  const Section = ({title, children}) => (					
    <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:14,border:`1px solid ${T.border}`}}>					
      <div style={{fontSize:10,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>{title}</div>					
      {children}					
    </div>					
  );					
  const Row = ({icon, label, sub, right, onClick}) => (					
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:14,padding:"11px 0",borderBottom:`1px solid ${T.border}`,cursor:onClick?"pointer":"default"}} >					
      <div style={{width:36,height:36,borderRadius:10,background:"rgba(155,143,232,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>					
      <div style={{flex:1}}>					
        <div style={{fontSize:13,fontWeight:600,color:T.text}}>{label}</div>					
        {sub && <div style={{fontSize:11,color:T.muted,marginTop:1}}>{sub}</div>}					
      </div>					
      {right}					
    </div>					
  );					
  const Toggle = ({on, onToggle}) => (					
    <div onClick={onToggle} style={{width:46,height:26,borderRadius:13,background:on?"#9B8FE8":"rgba(255,255,255,0.15)",position:"relative",cursor:"pointer",transition:"background 0.25s",flexShrink:0}}>					
      <div style={{position:"absolute",top:3,left:on?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.25s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>					
    </div>					
  );					
  return (					
    <div style={{maxWidth:560,margin:"0 auto"}}>					
      <h2 style={{fontSize:22,fontWeight:700,color:T.text,marginBottom:20,letterSpacing:-0.5}}>Settings</h2>					
      <Section title="Account">					
        {!demoMode && user ? (					
          <Row icon={user.photoURL ? <img src={user.photoURL} style={{width:36,height:36,borderRadius:10}} alt=""/> : "👤"}					
            label={user.displayName || user.email || "User"}					
            sub={user.email || "Signed in"}					
            right={<span style={{fontSize:11,color:"#4CAF82",fontWeight:600}}>Active</span>}					
          />					
        ) : (					
          <Row icon="👤" label="Demo Mode" sub="Sign in to save your data" />					
        )}					
        <div style={{paddingTop:4}}>					
          <button onClick={onLogout}					
            style={{width:"100%",background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.25)",borderRadius:10,padding:"11px",color:"#E8645A",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",marginTop:10}}>					
            {demoMode ? "Exit Demo" : "Sign Out"}					
          </button>					
        </div>					
      </Section>					
      <Section title="Appearance">					
        <Row icon={darkMode?"🌙":"☀️"} label="Dark Mode" sub={darkMode?"Currently using dark theme":"Currently using light theme"}					
          right={<Toggle on={darkMode} onToggle={()=>setDarkMode(d=>!d)}/>}					
        />					
      </Section>					
      <Section title="Privacy & Security">					
        <Row icon="🔒" label="Diary PIN Lock"					
          sub={diaryPin ? "PIN is set — diary entries are protected" : "No PIN set — diary is open"}					
          onClick={()=>setShowPinSetup(true)}					
          right={<span style={{fontSize:11,color:diaryPin?"#4CAF82":T.muted,fontWeight:600}}>{diaryPin?"Enabled":"Set PIN →"}</span>}					
        />					
        {diaryPin && (					
          <Row icon="🔓" label="Remove Diary PIN" sub="Clear existing PIN protection"					
            onClick={()=>{ setDiaryPin(""); }}					
            right={<span style={{fontSize:11,color:"#E8645A",fontWeight:600}}>Remove</span>}					
          />					
        )}					
      </Section>					
      <Section title="About">					
        <Row icon="✦" label={APP_NAME} sub={`${APP_TAGLINE} · v2.0`} />					
        <Row icon="🔥" label="Firebase Sync" sub="Real-time data sync across devices" right={<span style={{fontSize:11,color:"#4CAF82"}}>Active</span>}/>					
        <Row icon="🤖" label="AI Features" sub="Powered by Claude (Anthropic)" />					
      </Section>					
      {showPinSetup && (					
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,backdropFilter:"blur(10px)"}}>					
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,width:"min(380px,94vw)",padding:"32px"}}>					
            <h3 style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:20}}>Set Diary PIN</h3>					
            <input value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="Enter PIN (4–8 digits)" type="password" inputMode="numeric"					
              style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:T.text,fontSize:18,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit",letterSpacing:4,textAlign:"center"}}/>					
            <input value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="Confirm PIN" type="password" inputMode="numeric"					
              style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:T.text,fontSize:18,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit",letterSpacing:4,textAlign:"center"}}					
              onKeyDown={e=>e.key==="Enter"&&savePin()}/>					
            {pinError && <div style={{color:"#E8645A",fontSize:12,marginBottom:10}}>{pinError}</div>}					
            {pinSuccess && <div style={{color:"#4CAF82",fontSize:12,marginBottom:10}}>✓ PIN saved!</div>}					
            <div style={{display:"flex",gap:10}}>					
              <button onClick={()=>{setShowPinSetup(false);setPinInput("");setPinConfirm("");setPinError("");}} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>					
              <button onClick={savePin} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Save PIN</button>					
            </div>					
          </div>					
        </div>					
      )}					
    </div>					
  );					
}					
// ─── REMINDERS PAGE ───────────────────────────────────────────────────────────					
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
                <button onClick={()=>deleteReminder(r.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:14,padding:"2px 4px",flexShrink:0}}>✕</button>					
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
// ─── DIARY PAGE ───────────────────────────────────────────────────────────────					
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
    { id:"good",  label:"Good",  emoji:"😊" },					
    { id:"ok",    label:"Okay",  emoji:"😐" },					
    { id:"low",   label:"Low",   emoji:"😔" },					
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
    const ai = await categorizeEntry(entryText);					
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
          <button onClick={()=>setViewMode("timeline")} style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${viewMode==="timeline"?"rgba(255,255,255,0.3)":T.border}`,background:viewMode==="timeline"?"rgba(255,255,255,0.1)":"transparent",color:viewMode==="timeline"?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>📅 Timeline</button>					
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
              style={{background:searchQuery.trim()?"linear-gradient(135deg,#9B8FE8,#7EB8D4)":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,padding:"11px 18px",color:searchQuery.trim()?"#fff":"rgba(255,255,255,0.2)",cursor:searchQuery.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>					
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
                <button onClick={()=>deleteEntry(e.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:13,padding:"2px 4px",flexShrink:0}}>✕</button>					
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
              <button onClick={()=>setShowWrite(false)} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>					
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
// ─── WEEKLY WRAPPED ───────────────────────────────────────────────────────────					
function WeeklyWrapped({ habits, habitLogs, goals, reminders, diary, onClose }) {					
  const [loading, setLoading] = useState(true);					
  const [summary, setSummary] = useState(null);					
  useEffect(() => {					
    generateSummary();					
  }, []);					
  const generateSummary = async () => {					
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
    } catch { setSummary("Couldn't generate summary. Try again later."); }					
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
// ─── ROOT APP ─────────────────────────────────────────────────────────────────					
export default function App() {					
  const [darkMode, setDarkMode] = useState(true);					
  // Apply theme globally					
  Object.assign(T, darkMode ? DARK_THEME : LIGHT_THEME);					
  // ── Auth state ──					
  const [user, setUser] = useState(null);					
  const [authLoading, setAuthLoading] = useState(true);					
  const [loginLoading, setLoginLoading] = useState(false);					
  const [demoMode, setDemoMode] = useState(false);					
  // ── Data state ──					
  const [goals, setGoals] = useState([]);					
  const [habits, setHabits] = useState([]);					
  const [habitLogs, setHabitLogs] = useState({});					
  const [reminders, setReminders] = useState([]);					
  const [diary, setDiary] = useState([]);					
  const [dataLoaded, setDataLoaded] = useState(false);					
  // ── UI state ──					
  const [tab, setTab] = useState("goals");					
  const [showAI, setShowAI] = useState(false);					
  const [showModal, setShowModal] = useState(false);					
  const [editGoal, setEditGoal] = useState(null);					
  const [suggestFor, setSuggestFor] = useState(null);					
  const [showWrapped, setShowWrapped] = useState(false);					
  const [diaryPin, setDiaryPin] = useState(() => { try { return localStorage.getItem("lumina_diary_pin")||""; } catch { return ""; }});					
  useEffect(() => { try { localStorage.setItem("lumina_diary_pin", diaryPin); } catch {} }, [diaryPin]);					
  // ── Auth listener ──					
  useEffect(() => {					
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });					
    return unsub;					
  }, []);					
  // ── Firestore listeners ──					
  useEffect(() => {					
    if (!user) return;					
    const uid = user.uid;					
    const unsubGoals    = onSnapshot(collection(db,"users",uid,"goals"),    snap=>setGoals(snap.docs.map(d=>d.data())));					
    const unsubHabits   = onSnapshot(collection(db,"users",uid,"habits"),   snap=>setHabits(snap.docs.map(d=>d.data())));					
    const unsubLogs     = onSnapshot(collection(db,"users",uid,"habitLogs"),snap=>{ const l={}; snap.docs.forEach(d=>{l[d.id]=d.data();}); setHabitLogs(l); setDataLoaded(true); });					
    const unsubReminders= onSnapshot(collection(db,"users",uid,"reminders"),snap=>setReminders(snap.docs.map(d=>d.data())));					
    const unsubDiary    = onSnapshot(collection(db,"users",uid,"diary"),    snap=>setDiary(snap.docs.map(d=>d.data())));					
    return ()=>{ unsubGoals(); unsubHabits(); unsubLogs(); unsubReminders(); unsubDiary(); };					
  }, [user]);					
  // ── Firestore helpers ──					
  const fbSave  = (col, data) => { if(!user||demoMode) return; setDoc(doc(db,"users",user.uid,col,data.id), data); };					
  const fbDel   = (col, id)   => { if(!user||demoMode) return; deleteDoc(doc(db,"users",user.uid,col,id)); };					
  const fbSaveGoal    = g  => fbSave("goals", g);					
  const fbDeleteGoal  = id => fbDel("goals", id);					
  const fbSaveHabit   = h  => fbSave("habits", h);					
  const fbDeleteHabit = id => fbDel("habits", id);					
  const fbLogHabit    = (date, hId, val) => { if(!user||demoMode) return; setDoc(doc(db,"users",user.uid,"habitLogs",date),{[hId]:val},{merge:true}); };					
  const fbSaveReminder= r  => fbSave("reminders", r);					
  const fbDelReminder = id => fbDel("reminders", id);					
  const fbSaveDiary   = e  => fbSave("diary", e);					
  const fbDelDiary    = id => fbDel("diary", id);					
  // ── Goal handlers ──					
  const saveGoal = goal => { setGoals(gs=>gs.find(g=>g.id===goal.id)?gs.map(g=>g.id===goal.id?goal:g):[...gs,goal]); fbSaveGoal(goal); };					
  const deleteGoal = id => { setGoals(gs=>gs.filter(g=>g.id!==id)); fbDeleteGoal(id); };					
  const toggleSubtask = (goalId, subtaskId) => {					
    setGoals(gs=>gs.map(g=>{					
      if(g.id!==goalId) return g;					
      const updated = {...g, subtasks:g.subtasks.map(s=>s.id!==subtaskId?s:{...s,done:!s.done})};					
      fbSaveGoal(updated); return updated;					
    }));					
  };					
  const addJournalNote = (goalId, entry) => {					
    setGoals(gs=>gs.map(g=>{					
      if(g.id!==goalId) return g;					
      const updated = {...g, journal:[...g.journal,entry]};					
      fbSaveGoal(updated); return updated;					
    }));					
  };					
  // ── Habit handlers ──					
  const saveHabit = h => { setHabits(hs=>hs.find(x=>x.id===h.id)?hs.map(x=>x.id===h.id?h:x):[...hs,h]); fbSaveHabit(h); };					
  const deleteHabit = id => { setHabits(hs=>hs.filter(h=>h.id!==id)); fbDeleteHabit(id); };					
  const toggleHabitLog = (date, habitId, current) => {					
    const nv = !current;					
    setHabitLogs(l=>({...l,[date]:{...(l[date]||{}),[habitId]:nv}}));					
    fbLogHabit(date, habitId, nv);					
  };					
  const addHabits = newHabits => newHabits.forEach(h=>saveHabit(h));					
  // ── Reminder handlers ──					
  const saveReminder = r => { setReminders(rs=>rs.find(x=>x.id===r.id)?rs.map(x=>x.id===r.id?r:x):[...rs,r]); fbSaveReminder(r); };					
  const deleteReminder = id => { setReminders(rs=>rs.filter(r=>r.id!==id)); fbDelReminder(id); };					
  const toggleReminder = id => {					
    setReminders(rs=>rs.map(r=>{					
      if(r.id!==id) return r;					
      const updated = {...r, done:!r.done};					
      fbSaveReminder(updated); return updated;					
    }));					
  };					
  // ── Diary handlers ──					
  const saveDiaryEntry = e => { setDiary(ds=>ds.find(x=>x.id===e.id)?ds.map(x=>x.id===e.id?e:x):[...ds,e]); fbSaveDiary(e); };					
  const deleteDiaryEntry = id => { setDiary(ds=>ds.filter(e=>e.id!==id)); fbDelDiary(id); };					
  // ── Auth handlers ──					
  const handleGoogleLogin = async () => {					
    setLoginLoading(true);					
    try { await signInWithPopup(auth, googleProvider); }					
    catch(err) { console.error("Login error:", err); }					
    finally { setLoginLoading(false); }					
  };					
  const handleEmailLogin = async (email, password) => {					
    await signInWithEmailAndPassword(auth, email, password);					
  };					
  const handleEmailSignup = async (email, password, name) => {					
    const cred = await createUserWithEmailAndPassword(auth, email, password);					
    if (name && cred.user) {					
      await cred.user.updateProfile({ displayName: name }).catch(()=>{});					
    }					
  };					
  const handleLogout = () => {					
    signOut(auth);					
    setDemoMode(false); setGoals([]); setHabits([]); setHabitLogs({}); setReminders([]); setDiary([]);					
  };					
  const handleDemo = () => {					
    setDemoMode(true);					
    setGoals(SEED_GOALS); setHabits(SEED_HABITS); setHabitLogs(generateDemoLogs(SEED_HABITS));					
    setReminders(SEED_REMINDERS); setDiary(SEED_DIARY);					
  };					
  const greet = () => { const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; };					
  const today = todayStr();					
  const todayLog = habitLogs[today]||{};					
  const todayPct = habits.length>0 ? Math.round(habits.filter(h=>todayLog[h.id]).length/habits.length*100) : 0;					
  // ── Loading ──					
  if (authLoading) return (					
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>					
      <div style={{display:"flex",gap:8}}>{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#9B8FE8",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>					
      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>					
    </div>					
  );					
  // ── Login screen ──					
  if (!user && !demoMode) return (					
    <LoginScreen					
      onGoogleLogin={handleGoogleLogin}					
      onEmailLogin={handleEmailLogin}					
      onEmailSignup={handleEmailSignup}					
      loading={loginLoading}					
      onDemo={handleDemo}					
    />					
  );					
  return (					
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:T.text,transition:"background 0.3s,color 0.3s"}}>					
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,300&display=swap" rel="stylesheet"/>					
      {/* Header */}					
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:darkMode?"rgba(7,8,12,0.97)":"rgba(244,245,248,0.97)",backdropFilter:"blur(20px)",zIndex:10,gap:12,flexWrap:"wrap"}}>					
        <div style={{flexShrink:0}}>					
          <div style={{fontSize:9,color:T.muted,letterSpacing:3,textTransform:"uppercase",marginBottom:1}}>{greet()}, {demoMode?"Demo":user?.displayName?.split(" ")[0]||"You"}</div>					
          <div style={{display:"flex",alignItems:"center",gap:8}}>					
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✦</div>					
            <h1 style={{fontSize:17,fontWeight:700,margin:0,letterSpacing:-0.5,color:T.text}}>{APP_NAME}</h1>					
            {tab==="habits"&&<div style={{fontSize:10,color:todayPct===100?"#4CAF82":"#9B8FE8",fontWeight:700,background:todayPct===100?"rgba(76,175,130,0.12)":"rgba(155,143,232,0.12)",padding:"3px 8px",borderRadius:6}}>{todayPct}% today</div>}					
          </div>					
        </div>					
        <Nav tab={tab} setTab={setTab}/>					
        <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>					
          <button onClick={()=>setShowWrapped(true)} title="Weekly Wrapped" style={{background:"rgba(200,169,110,0.12)",border:"1px solid rgba(200,169,110,0.3)",borderRadius:10,padding:"8px 13px",color:"#C8A96E",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit"}}>🎁 Wrapped</button>					
          <button onClick={()=>setShowAI(true)} style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.28)",borderRadius:10,padding:"8px 13px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit"}}>✦ AI Coach</button>					
          {tab==="goals"&&<button onClick={()=>{setEditGoal(null);setShowModal(true);}} style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(155,143,232,0.25)"}}>+ Goal</button>}					
          {demoMode					
            ? <button onClick={handleGoogleLogin} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"8px 12px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>Sign in →</button>					
            : <div style={{display:"flex",gap:7,alignItems:"center"}}>					
                {user?.photoURL && <img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.15)",flexShrink:0}}/>}					
                <button onClick={()=>setTab("settings")} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:9,padding:"7px 11px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>⚙</button>					
              </div>					
          }					
        </div>					
      </div>					
      {/* Main content */}					
      <div style={{maxWidth:920,margin:"0 auto",padding:"22px 18px"}}>					
        {tab==="goals"&&<GoalsPage goals={goals} setGoals={setGoals} saveGoal={saveGoal} deleteGoal={deleteGoal} toggleSubtask={toggleSubtask} addJournalNote={addJournalNote} setShowAI={setShowAI} setShowModal={setShowModal} setEditGoal={setEditGoal} onImportDemoGoals={!demoMode ? ()=>SEED_GOALS.forEach(g=>saveGoal({...g,id:"import_"+g.id})) : null}/>}					
        {tab==="habits"&&<HabitsPage habits={habits} saveHabit={saveHabit} deleteHabit={deleteHabit} habitLogs={habitLogs} toggleHabitLog={toggleHabitLog} addHabits={addHabits}/>}					
        {tab==="reminders"&&<RemindersPage reminders={reminders} saveReminder={saveReminder} deleteReminder={deleteReminder} toggleReminder={toggleReminder}/>}					
        {tab==="diary"&&<DiaryPage entries={diary} saveEntry={saveDiaryEntry} deleteEntry={deleteDiaryEntry} diaryPin={diaryPin}/>}					
        {tab==="analytics"&&<AnalyticsPage habits={habits} habitLogs={habitLogs} goals={goals} reminders={reminders} diary={diary}/>}					
        {tab==="settings"&&<SettingsPage user={user} demoMode={demoMode} onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} diaryPin={diaryPin} setDiaryPin={setDiaryPin}/>}					
      </div>					
      {/* Modals */}					
      {showModal&&<SmartModal editGoal={editGoal} onSave={goal=>{					
        const isEdit=!!editGoal; saveGoal(goal); setShowModal(false); setEditGoal(null);					
        if(!isEdit) setSuggestFor(goal);					
      }} onClose={()=>{setShowModal(false);setEditGoal(null);}}/>}					
      {showAI&&<AICoachModal onGoalGenerated={goal=>{ saveGoal(goal); setShowAI(false); setSuggestFor(goal); }} onClose={()=>setShowAI(false)}/>}					
      {suggestFor&&<HabitSuggester goal={suggestFor} existingHabits={habits} onAdd={addHabits} onClose={()=>setSuggestFor(null)}/>}					
      {showWrapped&&<WeeklyWrapped habits={habits} habitLogs={habitLogs} goals={goals} reminders={reminders} diary={diary} onClose={()=>setShowWrapped(false)}/>}					
      <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}} * { box-sizing: border-box; }`}</style>					
    </div>					
  );					
}					