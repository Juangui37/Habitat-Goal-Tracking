// api/claude.js					
// Proxies requests to Anthropic API securely.					
// Set ANTHROPIC_API_KEY="mock" in Vercel env vars to use mock mode for free testing.					
const MOCK_RESPONSES = {					
  habits: `Your habit consistency over the past month shows real momentum. Morning routines are your strongest category — completing them at over 80% is genuinely impressive for a busy single parent balancing work, training, and everything else. The streak you have built is the foundation everything else rests on.\n\nThe pattern worth noting: your fitness habits drop noticeably on weekends. This is not a discipline issue — it is a scheduling one. Weekdays have structure built in. Weekends are open, which means your habits need to be more intentional rather than routine-triggered.\n\nOne action for this week: pick one specific weekend habit you want to protect and attach it to an existing anchor. If you always make coffee Saturday morning, that is your trigger. Attach the habit to the coffee. Small but it works.`,					
  goals: `You have solid momentum across your goal portfolio — three of your High Priority goals show meaningful subtask completion, which means you are not just setting intentions, you are taking action. The physical goals in particular show the most progress, which tracks with how consistently you have shown up for training.\n\nThe gap worth paying attention to is the career rotation goal. The deadline is approaching and the networking subtasks are largely incomplete. These feel less urgent than a workout because there is no immediate feedback loop. But they are the highest-leverage actions on your entire list right now.\n\nThis week: complete one networking 1:1. Just one. Send the message today before you close this app. The rest will follow.`,					
  journal: `Your recent journal entries reveal someone in genuine transition — not just going through motions, but actively reconstructing who you are and what you want. The emotional and physical categories dominate your writing, which tells you where your mental energy is actually going versus where your to-do list says it should go.\n\nThe pattern that stands out is the recurring tension between achievement and presence. You write beautifully about the moments that matter and then the next entry is about feeling behind. That oscillation is not a flaw. It is the honest rhythm of someone trying to do too many meaningful things at once.\n\nThis week's prompt: write one entry that starts with "What I don't want to rush right now is..." See what comes out.`,					
  reminders: `Your reminder completion rate tells an interesting story about priority vs intention. The reminders you actually complete tend to cluster around physical goals and financial actions — things with clear, tangible outcomes. The ones that sit undone are mostly relational and spiritual.\n\nThis is not laziness. It is that reminder apps are optimized for tasks, not for the kinds of things that require emotional readiness. You are not forgetting to call your mom. You are waiting until you have the right kind of energy for it.\n\nOne shift to try: for any reminder that has been pending more than two weeks, ask yourself if it is actually a reminder or a want. If it is a want, move it to your goals. If it is a task you are avoiding, set a five-minute timer and just start.`,					
  default: `Looking at your data holistically, you are someone who shows up. The consistency across habits, the goal progress, the journal entries — it all points to someone who has made a real commitment to growth and is actually following through.\n\nThe biggest opportunity right now is integration. Your habits, goals, reminders, and journal entries are all pointing at the same core themes — but they are living in separate buckets. The weeks where you feel most aligned are the weeks where those things reinforce each other.\n\nOne thing to do this week: look at your top pending reminder and ask which goal it connects to. Then look at your journal from this week and find the sentence that describes why that goal matters. That is your why. Write it somewhere visible.`,					
};					
const MOCK_GOAL = `Great — let me structure that for you.					
<GOAL_JSON>					
{"title":"Build a consistent daily workout habit","category":"physical","priority":"High","specific":"Complete a 45-minute workout 5 days per week, alternating strength and cardio, logged in a training app.","measurable":"Track sessions weekly. Success = 5 sessions completed. Miss no more than 2 sessions per month.","achievable":"Gym membership active. Schedule allows morning workouts before work on weekdays.","relevant":"Physical consistency underpins energy, mental clarity, and confidence across all other life areas.","timebound":"2026-12-31","subtasks":["Complete first full week of 5 sessions","Log workouts for 30 consecutive days","Hit first strength PR","Maintain streak through a travel week","Review and adjust program at 90 days"]}					
</GOAL_JSON>					
This gives you a solid foundation. Want to adjust anything to better match your situation?`;					
const MOCK_HABITS = JSON.stringify([					
  { label:"Morning workout completed", category:"fitness", icon:"⚡", color:"#E8645A" },					
  { label:"Log meals in MyFitPal", category:"nutrition", icon:"📱", color:"#4CAF82" },					
  { label:"Review goals for the day", category:"morning", icon:"◎", color:"#E87AAF" },					
  { label:"Read 20 minutes before bed", category:"night", icon:"📖", color:"#C8A96E" },					
  { label:"Take progress notes", category:"morning", icon:"✍️", color:"#9B8FE8" },					
]);					
export default async function handler(req, res) {					
  if (req.method !== "POST") {					
    return res.status(405).json({ error: "Method not allowed" });					
  }					
  const { prompt, systemPrompt, maxTokens = 600 } = req.body;					
  if (!prompt) return res.status(400).json({ error: "prompt is required" });					
  const apiKey = process.env.ANTHROPIC_API_KEY;					
  // ── Mock mode — free testing, no API calls ──────────────────────────────					
  if (!apiKey || apiKey === "mock") {					
    await new Promise(r => setTimeout(r, 900));					
    const p = (prompt + (systemPrompt || "")).toLowerCase();					
    if (p.includes("goal_json") || p.includes("smart goal coach")) {					
      return res.status(200).json({ text: MOCK_GOAL });					
    }					
    if (p.includes("habit coach") || (p.includes("suggest") && p.includes("habit"))) {					
      return res.status(200).json({ text: MOCK_HABITS });					
    }					
    let text = MOCK_RESPONSES.default;					
    if (p.includes("habit")) text = MOCK_RESPONSES.habits;					
    else if (p.includes("goal")) text = MOCK_RESPONSES.goals;					
    else if (p.includes("journal") || p.includes("diary") || p.includes("mood")) text = MOCK_RESPONSES.journal;					
    else if (p.includes("reminder")) text = MOCK_RESPONSES.reminders;					
    return res.status(200).json({ text });					
  }					
  // ── Real Anthropic API call ─────────────────────────────────────────────					
  try {					
    const response = await fetch("https://api.anthropic.com/v1/messages", {					
      method: "POST",					
      headers: {					
        "Content-Type": "application/json",					
        "x-api-key": apiKey,					
        "anthropic-version": "2023-06-01",					
      },					
      body: JSON.stringify({					
        model: "claude-sonnet-4-20250514",					
        max_tokens: maxTokens,					
        ...(systemPrompt ? { system: systemPrompt } : {}),					
        messages: [{ role: "user", content: prompt }],					
      }),					
    });					
    const data = await response.json();					
    if (!response.ok) {					
      console.error("Anthropic API error:", data);					
      return res.status(response.status).json({ error: data.error?.message || "API error" });					
    }					
    const text = data.content?.map(b => b.text || "").join("") || "";					
    return res.status(200).json({ text });					
  } catch (error) {					
    console.error("Claude API error:", error);					
    return res.status(500).json({ error: "Internal server error" });					
  }					
}					