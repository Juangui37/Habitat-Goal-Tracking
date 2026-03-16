// ─── APP IDENTITY ─────────────────────────────────────────────────────────────
export const APP_NAME = "Lumina";
export const APP_TAGLINE = "your life, illuminated";

// ─── SECURITY ─────────────────────────────────────────────────────────────────
export const ADMIN_UID = "REPLACE_WITH_YOUR_UID"; // Firebase Auth console → Users → copy UID

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","tempmail.com","guerrillamail.com","10minutemail.com",
  "throwam.com","fakeinbox.com","trashmail.com","yopmail.com","sharklasers.com",
  "getairmail.com","dispostable.com","maildrop.cc","spamgourmet.com","trashmail.me",
  "tempr.email","discard.email","spamfree24.org","mailnull.com","spamgourmet.org",
  "spam4.me","grr.la","guerrillamailblock.com","zzrgg.com","wegwerfemail.de",
  "sogetthis.com","spamherelots.com","binkmail.com","spamavert.com","spambob.com",
  "spamspot.com","tempemail.co","jetable.fr.nf","nospamfor.us","mailexpire.com",
  "mailzilla.org","cool.fr.nf",
]);

export const PLAN_LIMITS = {
  free: { aiCallsPerMonth: 50, wrappedPerMonth: 4, mindMapPerMonth: 2 },
  pro:  { aiCallsPerMonth: 999, wrappedPerMonth: 99, mindMapPerMonth: 99 },
};

// ─── GOAL CATEGORIES ──────────────────────────────────────────────────────────
export const CATS = [
  { id:"physical",  label:"Physical",  icon:"⚡", color:"#E8645A" },
  { id:"financial", label:"Financial", icon:"◈",  color:"#4CAF82" },
  { id:"religious", label:"Religious", icon:"✦",  color:"#C8A96E" },
  { id:"parenting", label:"Parenting", icon:"❋",  color:"#7EB8D4" },
  { id:"career",    label:"Career",    icon:"▲",  color:"#9B8FE8" },
  { id:"lifestyle", label:"Lifestyle", icon:"◎",  color:"#E8A45A" },
  { id:"emotional", label:"Emotional", icon:"◐",  color:"#E87AAF" },
  { id:"travel",    label:"Travel",    icon:"⊕",  color:"#5AC8C8" },
  { id:"health",    label:"Health",    icon:"♥",  color:"#E8645A" },
  { id:"social",    label:"Social",    icon:"❤",  color:"#E87AAF" },
];

// ─── HABIT CATEGORIES ─────────────────────────────────────────────────────────
export const HAB_CATS = [
  { id:"morning",     label:"Morning Routine", color:"#C8A96E", icon:"☀️" },
  { id:"night",       label:"Night Routine",   color:"#9B8FE8", icon:"🌙" },
  { id:"fitness",     label:"Fitness",         color:"#E8645A", icon:"⚡" },
  { id:"nutrition",   label:"Nutrition",       color:"#4CAF82", icon:"🥗" },
  { id:"mindfulness", label:"Mindfulness",     color:"#7EB8D4", icon:"🧘" },
  { id:"learning",    label:"Learning",        color:"#E8A45A", icon:"📚" },
  { id:"social",      label:"Social",          color:"#E87AAF", icon:"💬" },
  { id:"finances",    label:"Finances",        color:"#4CAF82", icon:"💰" },
];

// ─── PRESET HABITS ────────────────────────────────────────────────────────────
export const PRESET_HABITS = {
  morning:     [{ label:"Make bed immediately", icon:"🛏️" },{ label:"10 min morning walk", icon:"🌅" },{ label:"Cold shower", icon:"🚿" },{ label:"No-phone morning block", icon:"📵" },{ label:"Review goals for the day", icon:"◎" },{ label:"Morning journaling (5 min)", icon:"📓" },{ label:"Drink 500ml water on waking", icon:"💧" },{ label:"Sunlight exposure within 1hr", icon:"☀️" }],
  night:       [{ label:"No screens after 10pm", icon:"🌙" },{ label:"Brush & floss teeth", icon:"🦷" },{ label:"Read 20 minutes", icon:"📖" },{ label:"Journal — 3 things grateful", icon:"✦" },{ label:"In bed by 10:30pm", icon:"💤" },{ label:"Plan tomorrow (2 min)", icon:"📋" },{ label:"Skincare routine", icon:"✨" },{ label:"Put clothes out for tomorrow", icon:"👔" }],
  fitness:     [{ label:"Complete planned workout", icon:"⚡" },{ label:"Running session", icon:"🏃" },{ label:"10 min stretching", icon:"🧘" },{ label:"Step count 8,000+", icon:"👟" },{ label:"Swim session", icon:"🏊" },{ label:"Cycling workout", icon:"🚴" },{ label:"Active recovery walk", icon:"🚶" },{ label:"Track lifts in app", icon:"📊" }],
  nutrition:   [{ label:"Eat a high-protein breakfast", icon:"🥚" },{ label:"Drink 2.5L+ water", icon:"💧" },{ label:"No alcohol on weekdays", icon:"🚫" },{ label:"Log meals (MyFitnessPal)", icon:"📱" },{ label:"Meal prepped this week", icon:"🍱" },{ label:"Hit protein target", icon:"🥩" },{ label:"No processed food today", icon:"🥦" },{ label:"Take supplements", icon:"💊" }],
  mindfulness: [{ label:"Meditate 10 minutes", icon:"🧘" },{ label:"Breathing exercise", icon:"🌬️" },{ label:"Gratitude entry (3 things)", icon:"💛" },{ label:"Screen-free hour", icon:"📵" },{ label:"Therapy session", icon:"💬" },{ label:"Spend time in nature", icon:"🌿" },{ label:"Digital detox after 9pm", icon:"🌙" },{ label:"Affirmations / visualization", icon:"✦" }],
  learning:    [{ label:"Read 20 min non-fiction", icon:"📚" },{ label:"Watch 1 educational video", icon:"🎓" },{ label:"Practice a language", icon:"🌍" },{ label:"Review flashcards", icon:"🃏" },{ label:"Work on side project", icon:"💻" },{ label:"Write something", icon:"✍️" },{ label:"Listen to a podcast", icon:"🎧" },{ label:"Practice an instrument", icon:"🎵" }],
  social:      [{ label:"Reach out to a friend", icon:"📞" },{ label:"Quality time with loved ones", icon:"❤️" },{ label:"Send an encouraging message", icon:"💌" },{ label:"Social media max 30 min", icon:"📱" },{ label:"1:1 with a mentor", icon:"🤝" },{ label:"No complaining today", icon:"🙅" },{ label:"Random act of kindness", icon:"🌟" },{ label:"Attend a community event", icon:"🏘️" }],
  finances:    [{ label:"Review daily spending", icon:"💳" },{ label:"Log expenses in budget app", icon:"📊" },{ label:"No impulse purchases", icon:"🛑" },{ label:"Check investment accounts", icon:"📈" },{ label:"Pack lunch (save money)", icon:"🥪" },{ label:"Transfer to savings", icon:"🏦" },{ label:"Review weekly budget", icon:"📋" },{ label:"Read 15 min finance content", icon:"💰" }],
};

// ─── HABIT SCHEDULES ──────────────────────────────────────────────────────────
export const DAY_SCHEDULES = [
  { id:"daily",    label:"Every day",   short:"Daily",  days:[0,1,2,3,4,5,6] },
  { id:"weekdays", label:"Weekdays",    short:"M–F",    days:[1,2,3,4,5] },
  { id:"weekends", label:"Weekends",    short:"Sat/Sun",days:[0,6] },
  { id:"custom",   label:"Custom days", short:"Custom", days:[] },
];
export const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── CUSTOM CATEGORIES (localStorage) ─────────────────────────────────────────
const CUSTOM_CATS_KEY = "lumina_custom_cats";
export function getCustomCats() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY)) || []; } catch { return []; }
}
export function saveCustomCats(cats) {
  try { localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(cats)); } catch {}
}
export const EMOJI_OPTIONS = ["🎯","💪","🧠","❤️","🌱","🎨","🏠","💼","📚","🎵","🍎","✈️","🌍","🔥","⭐","🎓","💡","🤝","🙏","🌸","🏋️","🧘","💰","🎁","🌈","🦋","🚀","🎪","🍕","🏆"];

// ─── LOADING MESSAGES ─────────────────────────────────────────────────────────
export const LOADING_MESSAGES = [
  "Thinking through your goals...",
  "Analyzing your patterns...",
  "Finding insights...",
  "Connecting the dots...",
  "Almost there...",
  "Making it SMART...",
  "Crafting your plan...",
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
export const todayStr = () => new Date().toISOString().split("T")[0];
export const calcProgress = g => { const t=g.subtasks.length,d=g.subtasks.filter(s=>s.done).length; return t>0?Math.round(d/t*100):0; };
export const daysLeft = tb => tb ? Math.ceil((new Date(tb)-new Date())/86400000) : null;
export const fmtDate = d => new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});