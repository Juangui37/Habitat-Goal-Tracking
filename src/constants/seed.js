// Demo data — only used in demo mode, never synced to Firestore

const mkDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

export function generateDemoLogs(habits) {
  const logs = {};
  const today = new Date();
  const rates = {
    dh1:0.92,dh2:0.88,dh3:0.95,dh4:0.78,dh5:0.82,
    dh6:0.70,dh7:0.85,dh8:0.83,dh9:0.90,dh10:0.60,
    dh11:0.75,dh12:0.72,dh13:0.68,dh14:0.55,
    dh15:0.88,dh16:0.65,dh17:0.80,dh18:0.73,dh19:0.58,
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

export const SEED_HABITS = [
  { id:"dh1",  category:"morning",   label:"Make bed immediately after waking",  icon:"🛏", color:"#C8A96E" },
  { id:"dh2",  category:"morning",   label:"10 min morning walk outside",        icon:"🌅", color:"#E8A45A" },
  { id:"dh3",  category:"morning",   label:"Shower + get fully dressed",         icon:"🚿", color:"#7EB8D4" },
  { id:"dh4",  category:"morning",   label:"30 min no-phone morning block",      icon:"📵", color:"#9B8FE8" },
  { id:"dh5",  category:"morning",   label:"Review goals for the day",           icon:"◎", color:"#E87AAF" },
  { id:"dh6",  category:"night",     label:"No screens after 10pm",             icon:"🌙", color:"#9B8FE8" },
  { id:"dh7",  category:"night",     label:"Brush & floss teeth",               icon:"🦷", color:"#7EB8D4" },
  { id:"dh8",  category:"night",     label:"Read 20 minutes",                   icon:"📖", color:"#C8A96E" },
  { id:"dh9",  category:"night",     label:"Journal — 3 things grateful for",   icon:"✦", color:"#E8A45A" },
  { id:"dh10", category:"night",     label:"In bed by 10:30pm",                 icon:"💤", color:"#5AC8C8" },
  { id:"dh11", category:"fitness",   label:"Complete planned workout",          icon:"⚡", color:"#E8645A" },
  { id:"dh12", category:"fitness",   label:"Running session logged in Strava",  icon:"🏃", color:"#E8645A" },
  { id:"dh13", category:"fitness",   label:"10 min stretching / mobility",      icon:"🧘", color:"#E87AAF" },
  { id:"dh14", category:"fitness",   label:"Step count 8,000+",                 icon:"👟", color:"#4CAF82" },
  { id:"dh15", category:"nutrition", label:"Eat a high-protein breakfast",      icon:"🥚", color:"#E8A45A" },
  { id:"dh16", category:"nutrition", label:"Drink 2.5L+ water",                 icon:"💧", color:"#5AC8C8" },
  { id:"dh17", category:"nutrition", label:"No alcohol on weekdays",            icon:"🚫", color:"#9B8FE8" },
  { id:"dh18", category:"nutrition", label:"Log meals (MyFitnessPal)",          icon:"📱", color:"#4CAF82" },
  { id:"dh19", category:"nutrition", label:"Meal prepped this week",            icon:"🍱", color:"#4CAF82" },
];

export const SEED_REMINDERS = [
  { id:"r1",  text:"Open a brokerage account on Fidelity", done:true,  createdAt:mkDate(60), dueDate:mkDate(-7),  category:"financial", aiNote:"Linked to your financial goals." },
  { id:"r2",  text:"Schedule dentist appointment", done:true, createdAt:mkDate(55), dueDate:mkDate(5), category:"physical", aiNote:"Part of maintaining your physical health." },
  { id:"r3",  text:"Research CrossFit Level 1 certification dates", done:false, createdAt:mkDate(50), dueDate:mkDate(-14), category:"career", aiNote:"Connects to your personal training business goal." },
  { id:"r4",  text:"Set up automatic $900/month savings transfer", done:true, createdAt:mkDate(48), dueDate:mkDate(10), category:"financial", aiNote:"Directly supports your emergency fund goal." },
  { id:"r5",  text:"Call mom and catch up", done:true, createdAt:mkDate(45), dueDate:mkDate(1), category:"emotional", aiNote:"Nurturing important relationships." },
  { id:"r6",  text:"Register for fall half marathon", done:true, createdAt:mkDate(42), dueDate:mkDate(-3), category:"physical", aiNote:"Aligns with your running performance goals." },
  { id:"r7",  text:"Write a LinkedIn post about my API migration project", done:false, createdAt:mkDate(40), dueDate:mkDate(2), category:"career", aiNote:"Builds visibility for your promotion goal." },
  { id:"r8",  text:"Book therapy appointment for next week", done:true, createdAt:mkDate(38), dueDate:mkDate(3), category:"emotional", aiNote:"Supporting your emotional regulation goal." },
  { id:"r9",  text:"Look into Portugal flights for November", done:false, createdAt:mkDate(35), dueDate:mkDate(10), category:"travel", aiNote:"Related to your solo international travel goal." },
  { id:"r10", text:"Review monthly budget — March spending", done:true, createdAt:mkDate(33), dueDate:mkDate(0), category:"financial", aiNote:"Part of your debt elimination strategy." },
  { id:"r11", text:"Buy new running shoes — current ones are 400+ miles", done:true, createdAt:mkDate(30), dueDate:mkDate(-5), category:"physical", aiNote:"Equipment maintenance for marathon training." },
  { id:"r12", text:"Email Patrick about rotation interest", done:true, createdAt:mkDate(28), dueDate:mkDate(-2), category:"career", aiNote:"Key networking action for LDP rotation goal." },
  { id:"r13", text:"Set up creatine loading protocol", done:true, createdAt:mkDate(26), dueDate:mkDate(-20), category:"physical", aiNote:"Supports your strength and muscle building goal." },
  { id:"r14", text:"Cancel unused streaming subscription", done:true, createdAt:mkDate(24), dueDate:mkDate(-15), category:"financial", aiNote:"Budget optimization." },
  { id:"r15", text:"Read Atomic Habits — finish this week", done:true, createdAt:mkDate(22), dueDate:mkDate(-10), category:"lifestyle", aiNote:"Supports your reading goal." },
  { id:"r16", text:"Schedule 1:1 with Scott Cunningham — Decision Science", done:false, createdAt:mkDate(20), dueDate:mkDate(5), category:"career", aiNote:"Critical networking step for rotation placement." },
  { id:"r17", text:"Take progress photos — month 2 check-in", done:false, createdAt:mkDate(18), dueDate:mkDate(3), category:"physical", aiNote:"Part of measurable muscle gain tracking." },
  { id:"r18", text:"Research Roth vs Traditional 401k implications", done:false, createdAt:mkDate(15), dueDate:mkDate(7), category:"financial", aiNote:"Key decision for investment property strategy." },
  { id:"r19", text:"Plan phone-free activity with Sebastian", done:true, createdAt:mkDate(12), dueDate:mkDate(-2), category:"parenting", aiNote:"Tied to your parenting connection goal." },
  { id:"r20", text:"Attend Catholic Mass — explore faith practice", done:false, createdAt:mkDate(10), dueDate:mkDate(6), category:"religious", aiNote:"Part of your faith exploration goal." },
];

export const SEED_DIARY = [
  { id:"d1",  text:"Had an incredible long run today — 10 miles, negative splits the whole way. Six months ago I couldn't sustain this pace for 3 miles. The marathon training is working. My legs are sore but my mind is clear in a way that only running gives me. Motivation fades. Consistency is the whole game.", categories:["physical","emotional"], mood:"great", wordCount:68, createdAt:mkDate(75)+"T09:00:00.000Z" },
  { id:"d2",  text:"Therapy session today hit different. We talked about how I use achievement as armor — always chasing the next goal so I don't have to sit with the discomfort of the present. Sebastian asked me last night why I was on my phone during dinner. That one hurt.", categories:["emotional","parenting"], mood:"reflective", wordCount:55, createdAt:mkDate(70)+"T21:00:00.000Z" },
  { id:"d3",  text:"First paying client for the freelance work. $950 deposit hit my account today. I've built websites for people for free for three years. The number didn't change. The belief did. Charged what I was worth and they said yes without hesitation.", categories:["career","financial"], mood:"great", wordCount:48, createdAt:mkDate(65)+"T19:00:00.000Z" },
  { id:"d4",  text:"Rough week. Missed three workouts, blew my nutrition Thursday through Saturday, and spent way too much time doomscrolling. Sometimes you just have an off week. The goal is to not let it become two.", categories:["physical","emotional"], mood:"low", wordCount:42, createdAt:mkDate(60)+"T22:00:00.000Z" },
  { id:"d5",  text:"Read The Psychology of Money cover to cover this weekend. Being financially reasonable — making decisions you can stick to — matters more than being theoretically optimal. Applied this to my savings plan immediately.", categories:["financial","lifestyle"], mood:"good", wordCount:45, createdAt:mkDate(55)+"T16:00:00.000Z" },
  { id:"d6",  text:"Sebastian and I went to the farmers market this morning. No phones. Just us. He held my hand and asked me what his favorite fruit was and we argued about it for twenty minutes. These are the moments I want to protect.", categories:["parenting","emotional"], mood:"great", wordCount:50, createdAt:mkDate(50)+"T11:00:00.000Z" },
  { id:"d7",  text:"Manager pulled me aside after the sprint review today. Said my API migration work was exactly the kind of ownership we need at senior level. This is what happens when you stop waiting to be noticed and just do the work loudly on purpose.", categories:["career"], mood:"good", wordCount:46, createdAt:mkDate(46)+"T18:00:00.000Z" },
  { id:"d8",  text:"Something strange happened during my meditation today — for about 90 seconds I genuinely had no internal monologue. Just breath and quiet. Maybe consistency is finally paying off in ways I cannot track on a spreadsheet.", categories:["emotional","lifestyle"], mood:"good", wordCount:44, createdAt:mkDate(42)+"T08:30:00.000Z" },
  { id:"d9",  text:"Weighed in at 147.2 lbs this morning. Up almost 3 lbs from where I started. The creatine is doing its thing but more importantly the eating is consistent. The hang clean felt stronger today too. 195 moved like 185 used to.", categories:["physical"], mood:"great", wordCount:50, createdAt:mkDate(38)+"T07:15:00.000Z" },
  { id:"d10", text:"Had a hard conversation with my mom today. She is worried I am doing too much. But the alternative is doing nothing and waiting. I have spent too long waiting. She said she was proud of me. That hit different.", categories:["emotional","parenting"], mood:"reflective", wordCount:46, createdAt:mkDate(34)+"T20:00:00.000Z" },
  { id:"d11", text:"Deployed the Life Dashboard app today. Something I genuinely built from scratch. React, Firebase, Vercel, Claude API — I did not know any of this four months ago. This is what I have been missing at work. Tangible things.", categories:["career","lifestyle"], mood:"great", wordCount:46, createdAt:mkDate(30)+"T22:00:00.000Z" },
  { id:"d12", text:"Missed therapy this week. I noticed I was more reactive with Sebastian by Thursday — shorter fuse, less patience. The weeks I skip therapy are harder weeks across the board.", categories:["emotional","parenting"], mood:"neutral", wordCount:38, createdAt:mkDate(26)+"T21:30:00.000Z" },
  { id:"d13", text:"Looked into the 401k loan option today. If I keep contributing consistently for 14 more months I will have enough vested to take the loan without penalty. The path exists. I just have to stay disciplined.", categories:["financial"], mood:"good", wordCount:44, createdAt:mkDate(22)+"T19:00:00.000Z" },
  { id:"d14", text:"Long run this morning — 14 miles. Hit a wall at mile 11 that I thought would end me. Walked for 90 seconds. Got back. Finished. There is something about finishing when you want to quit that changes how you think about quitting.", categories:["physical","emotional"], mood:"great", wordCount:50, createdAt:mkDate(18)+"T08:00:00.000Z" },
  { id:"d15", text:"Watched The Bible Project intro series. The way they explain the narrative arc of scripture — I finally understand what I grew up hearing in Spanish but never fully grasped. Faith that I chose feels completely different from faith I inherited.", categories:["religious","emotional"], mood:"reflective", wordCount:48, createdAt:mkDate(14)+"T12:00:00.000Z" },
  { id:"d16", text:"Bad day. Nothing specific, just that heavy feeling where everything feels harder than it should. The old version of me would have spiraled. The current version of me is writing this down instead. Small wins.", categories:["emotional"], mood:"low", wordCount:40, createdAt:mkDate(10)+"T23:00:00.000Z" },
  { id:"d17", text:"Had coffee with a senior engineer from Decision Science today. The work they do is genuinely exciting — building models that inform real business decisions. I came in with three questions and left with twelve more. This is the rotation I want.", categories:["career"], mood:"great", wordCount:48, createdAt:mkDate(7)+"T17:30:00.000Z" },
  { id:"d18", text:"Sebastian told me I was his best friend today. We were driving back from the park and he just said it unprompted. All the guilt about the phone, the yelling, the hard weeks — it shrinks next to a moment like that.", categories:["parenting","emotional"], mood:"great", wordCount:47, createdAt:mkDate(4)+"T20:00:00.000Z" },
  { id:"d19", text:"Strength training PR today. Hit 205 on the hang clean. The shoulder work is paying off. The body adapts when you show up consistently. Every time.", categories:["physical"], mood:"great", wordCount:32, createdAt:mkDate(2)+"T18:00:00.000Z" },
  { id:"d20", text:"Sitting with a question tonight: what does enough look like? Sometimes I wonder if I am running toward something or away from something. Therapy would say both can be true. I think both are true.", categories:["emotional","lifestyle"], mood:"reflective", wordCount:42, createdAt:mkDate(0)+"T22:30:00.000Z" },
];

export const SEED_GOALS = [
  { id:"g1", category:"physical", priority:"High", title:"Run my first marathon under 4 hours",
    specific:"Complete a full 26.2 mile marathon in under 4 hours at the Chicago Marathon in October.",
    measurable:"Official race time tracked via chip timing. Long run distance increases by 10% per week.",
    achievable:"Already running half marathons comfortably. Following an 18-week Hal Higdon plan.",
    relevant:"Running has been on my bucket list for 3 years. This proves I can commit to a long-term goal.",
    timebound:"2026-10-11",
    subtasks:[{id:"g1s1",label:"Register for Chicago Marathon",done:true},{id:"g1s2",label:"Complete first 10-mile long run",done:true},{id:"g1s3",label:"Run a half marathon as training check-in",done:false},{id:"g1s4",label:"Complete 18-mile long run (peak week)",done:false},{id:"g1s5",label:"Taper and rest the final 3 weeks",done:false},{id:"g1s6",label:"Cross the finish line under 4:00:00",done:false}],
    journal:[{id:"j1",text:"Did my first 8-mile long run today. Starting to believe this is actually possible.",date:"2026-02-15"}], createdAt:"2026-01-15" },
  { id:"g2", category:"physical", priority:"High", title:"Gain 5-10 lbs of muscle — reach 150-155 lbs",
    specific:"Increase body weight from 142 to 150-155 lbs through structured strength training and nutrition. Hit 225 hang clean and 315 squat.",
    measurable:"Weekly weigh-ins. Track hang clean and squat PRs monthly. Progress photos every 4 weeks.",
    achievable:"Gym membership active. Already following 5-day training split. Taking creatine and meal prepping.",
    relevant:"Want to be an athletic machine — stronger, faster, more powerful across all disciplines.",
    timebound:"2026-12-31",
    subtasks:[{id:"g2s1",label:"Reach 147 lbs (first milestone)",done:true},{id:"g2s2",label:"Hit 200 lb hang clean",done:true},{id:"g2s3",label:"Reach 150 lbs",done:false},{id:"g2s4",label:"Hit 225 lb hang clean PR",done:false},{id:"g2s5",label:"Hit 315 lb squat",done:false},{id:"g2s6",label:"Reach 155 lbs",done:false}],
    journal:[{id:"j2",text:"Hit 205 on the hang clean. 20 lbs over where I started.",date:"2026-03-14"}], createdAt:"2026-01-15" },
  { id:"g3", category:"financial", priority:"High", title:"Save $15,000 emergency fund by end of year",
    specific:"Build a 6-month emergency fund of $15,000 in a high-yield savings account. Automate $900/month transfers.",
    measurable:"HYSA balance tracked monthly. Reach $15,000 by December 31.",
    achievable:"Take-home pay allows ~$1,100/month savings after expenses. Cutting dining out and subscriptions.",
    relevant:"Lost a job once without savings. Never again. This is the foundation everything else is built on.",
    timebound:"2026-12-31",
    subtasks:[{id:"g3s1",label:"Open high-yield savings account",done:true},{id:"g3s2",label:"Set up $900/month automatic transfer",done:true},{id:"g3s3",label:"Cut 3 unused subscriptions",done:true},{id:"g3s4",label:"Reach $7,500 (halfway)",done:false},{id:"g3s5",label:"Reach $15,000",done:false}],
    journal:[{id:"j3",text:"Set up the automatic transfer. $900 leaves before I can spend it.",date:"2026-01-01"}], createdAt:"2026-01-01" },
  { id:"g4", category:"career", priority:"High", title:"Land a Decision Science or Data Engineering LDP rotation",
    specific:"Network with 5+ people in target teams, complete rotation application, and secure a June 2026 rotation placement.",
    measurable:"5 networking 1:1s logged. Application submitted. Rotation offer received.",
    achievable:"Already in LDP program. Patrick Graziosi is a key connector. Jake and Scott are warm contacts.",
    relevant:"Current role feels too maintenance-focused. Want end-to-end project ownership and tangible products.",
    timebound:"2026-05-31",
    subtasks:[{id:"g4s1",label:"1:1 with Joe (completed)",done:true},{id:"g4s2",label:"1:1 with Jake (completed)",done:true},{id:"g4s3",label:"1:1 with Isabelle (completed)",done:true},{id:"g4s4",label:"1:1 with Scott Cunningham",done:false},{id:"g4s5",label:"Submit formal rotation preference",done:false},{id:"g4s6",label:"Rotation offer confirmed",done:false}],
    journal:[{id:"j4",text:"Had coffee with a senior engineer from Decision Science. This is the rotation I want.",date:"2026-03-07"}], createdAt:"2026-01-10" },
  { id:"g5", category:"parenting", priority:"High", title:"Build a stronger daily connection with Sebastian",
    specific:"Implement one phone-free hour with Sebastian every day, plan one memorable trip per quarter, and establish a consistent bedtime routine.",
    measurable:"Phone-free hour logged daily. 4 quarterly activities completed. Bedtime routine consistent 5/7 nights per week.",
    achievable:"Already picking Sebastian up daily. Just need to put the phone down and be present.",
    relevant:"Sebastian is growing up fast. The memories I build now are the ones he'll carry forever.",
    timebound:"2026-12-31",
    subtasks:[{id:"g5s1",label:"Florida trip April 7-14",done:false},{id:"g5s2",label:"Establish consistent bedtime routine",done:false},{id:"g5s3",label:"Plan Q2 activity (park, museum, etc)",done:false},{id:"g5s4",label:"30 consecutive days of phone-free hour",done:false}],
    journal:[], createdAt:"2026-02-01" },
  { id:"g6", category:"religious", priority:"Medium", title:"Explore faith and build a personal spiritual practice",
    specific:"Attend Mass or a church service at least twice a month, complete The Bible Project video series, and establish a 5-minute daily prayer or reflection habit.",
    measurable:"8+ services attended. Bible Project series completed. Daily reflection logged in journal.",
    achievable:"Access to nearby Catholic church. Bible Project is free on YouTube. Just needs consistency.",
    relevant:"Overcame too much adversity to believe I did it alone. Want to understand and choose my faith.",
    timebound:"2026-12-31",
    subtasks:[{id:"g6s1",label:"Start The Bible Project series",done:false},{id:"g6s2",label:"Attend first Mass intentionally",done:false},{id:"g6s3",label:"Establish daily 5-min reflection habit",done:false},{id:"g6s4",label:"Complete Bible Project video series",done:false}],
    journal:[], createdAt:"2026-02-01" },
  { id:"g7", category:"lifestyle", priority:"Medium", title:"Build a personal style and grooming routine",
    specific:"Establish a consistent skincare routine, upgrade wardrobe with 10 versatile pieces, and research/adopt a signature style that reflects who I am now.",
    measurable:"Skincare routine done 7/7 nights per week. 10 clothing pieces purchased. 1 style Pinterest board built.",
    achievable:"Already started going to office in dress clothes. Have disposable income now. Just need direction.",
    relevant:"People treat you how you look. I want to walk into any room feeling like the most put-together version of myself.",
    timebound:"2026-09-30",
    subtasks:[{id:"g7s1",label:"Get a consistent barber schedule",done:true},{id:"g7s2",label:"Buy 3 key wardrobe pieces",done:false},{id:"g7s3",label:"Start basic skincare routine",done:false},{id:"g7s4",label:"Define personal style direction",done:false}],
    journal:[], createdAt:"2026-02-01" },
];