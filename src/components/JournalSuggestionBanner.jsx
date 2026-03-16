import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, todayStr } from "../constants/index.js";
import { callClaude } from "../utils/ai.js";

// ─── JOURNAL → GOAL SUGGESTION ENGINE ────────────────────────────────────────
// Runs monthly. Reads last 30 days of journal entries, finds topics the user
// writes about repeatedly that don't have a goal yet, surfaces as a dismissible
// banner on the Goals page.

function JournalSuggestionBanner({ diary, goals, user, onCreateGoal }) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState({});
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || !diary.length || checked) return;
    checkAndGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, diary.length]);

  const checkAndGenerate = async () => {
    setChecked(true);
    try {
      // Check when we last ran
      const snap = await getDoc(doc(db, "users", user.uid, "meta", "journalSuggestions"));
      if (snap.exists()) {
        const data = snap.data();
        const age = Date.now() - new Date(data.lastRun).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (age < thirtyDays && data.suggestions?.length) {
          // Load cached suggestions, filter out dismissed ones
          const saved = data.suggestions.filter(s => !data.dismissed?.[s.id]);
          setSuggestions(saved);
          setDismissed(data.dismissed || {});
          return;
        }
      }
      // Check if user writes about same topic 5+ times in last 30 days
      // (mid-month trigger)
      const recent = diary.filter(e =>
        new Date(e.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      if (recent.length < 3) return; // not enough data yet
      await generate(recent);
    } catch(e) { /* non-blocking */ }
  };

  const generate = async (recentEntries) => {
    setLoading(true);
    try {
      const existingGoalTopics = goals.map(g => `${g.category}: ${g.title}`).join("; ");
      const entryTexts = recentEntries.slice(0, 20).map(e => e.text).join("\n\n---\n\n");

      const prompt = `Read these journal entries from the past 30 days. Identify topics the user writes about repeatedly that are NOT already covered by their existing goals. Return ONLY a JSON array of up to 3 suggestions:\n[{"id":"sug1","category":"physical","suggestedGoalTitle":"...","reasoning":"one sentence explaining the pattern you noticed","urgency":"high"}]\n\nExisting goals: ${existingGoalTopics}\n\nJournal entries:\n${entryTexts}`;

      const sys = `You find goal opportunities from journal patterns. Return valid JSON array only. Category must be: physical,financial,religious,parenting,career,lifestyle,emotional,travel. urgency: high, medium, or low.`;

      const text = await callClaude(prompt, sys, 600);
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.length > 0) {
        setSuggestions(parsed);
        await setDoc(doc(db, "users", user.uid, "meta", "journalSuggestions"), {
          suggestions: parsed,
          lastRun: new Date().toISOString(),
          dismissed: {},
        }, { merge: true });
      }
    } catch(e) { /* silent — this is a background feature */ }
    setLoading(false);
  };

  const dismiss = async (id, permanent = false) => {
    const newDismissed = { ...dismissed, [id]: true };
    setDismissed(newDismissed);
    setSuggestions(s => s.filter(x => x.id !== id));
    if (user && permanent) {
      await setDoc(doc(db, "users", user.uid, "meta", "journalSuggestions"),
        { dismissed: newDismissed }, { merge: true }).catch(() => {});
    }
  };

  const handleCreate = (sug) => {
    const cat = CATS.find(c => c.id === sug.category) || CATS[0];
    onCreateGoal({
      title: sug.suggestedGoalTitle,
      category: sug.category,
      priority: sug.urgency === "high" ? "High" : sug.urgency === "medium" ? "Medium" : "Low",
    });
    dismiss(sug.id, true);
  };

  if (loading) return null; // silent background check
  if (!suggestions.length) return null;

  const urgencyColor = { high: "#E8645A", medium: "#C8A96E", low: "#4CAF82" };

  return (
    <div style={{ marginBottom: 20 }}>
      {suggestions.map(sug => {
        if (dismissed[sug.id]) return null;
        const cat = CATS.find(c => c.id === sug.category) || CATS[0];
        return (
          <div key={sug.id} style={{
            background: `${cat.color}0C`,
            border: `1px solid ${cat.color}44`,
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: urgencyColor[sug.urgency] || "#9B8FE8", textTransform: "uppercase" }}>
                  💡 Journal Insight
                </span>
                <span style={{ fontSize: 9, background: `${cat.color}22`, color: cat.color, padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>
                  {cat.label}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                {sug.suggestedGoalTitle}
              </div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>
                {sug.reasoning}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => handleCreate(sug)}
                style={{ background: cat.color, border: "none", borderRadius: 9, padding: "8px 16px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
                Create this goal →
              </button>
              <button onClick={() => dismiss(sug.id, true)}
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 12px", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                Not now
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { JournalSuggestionBanner };