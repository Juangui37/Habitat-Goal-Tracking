import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { useIsMobile } from "../utils/mobile.js";
import { todayStr, calcProgress, ADMIN_UID, fmtDate } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";

const SECTION_DEFS = [
  { emoji: "🌟", title: "This Week's Highlight",  color: "#C8A96E", bg: "rgba(200,169,110,0.08)", border: "rgba(200,169,110,0.25)" },
  { emoji: "📊", title: "By the Numbers",          color: "#7EB8D4", bg: "rgba(126,184,212,0.08)", border: "rgba(126,184,212,0.25)" },
  { emoji: "🔍", title: "Pattern Spotted",          color: "#9B8FE8", bg: "rgba(155,143,232,0.08)", border: "rgba(155,143,232,0.25)" },
  { emoji: "⚡", title: "Challenge for Next Week", color: "#4CAF82", bg: "rgba(76,175,130,0.08)",  border: "rgba(76,175,130,0.25)"  },
];

function parseSections(text) {
  if (!text) return [];
  return SECTION_DEFS.map(def => {
    const emojiIdx = text.indexOf(def.emoji);
    if (emojiIdx === -1) return null;
    const afterHeader = text.indexOf("\n", emojiIdx);
    if (afterHeader === -1) return { ...def, body: "" };
    const nextEmoji = SECTION_DEFS
      .filter(d => d.emoji !== def.emoji)
      .map(d => text.indexOf(d.emoji, emojiIdx + 1))
      .filter(i => i > emojiIdx)
      .sort((a, b) => a - b)[0] || text.length;
    const body = text.slice(afterHeader, nextEmoji)
      .trim()
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .trim();
    return { ...def, body };
  }).filter(Boolean);
}

function WeeklyWrapped({ habits, habitLogs, goals, reminders, diary, onClose, user }) {
  const isMobile = useIsMobile();
  const [loading, setLoading]             = useState(false);
  const [summary, setSummary]             = useState(null);
  const [nextAvailable, setNextAvailable] = useState(null);
  const loadMsg = useLoadingMessage(loading);

  useEffect(() => {
    const init = async () => {
      // 1. Load from cache if fresh
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid, "meta", "wrappedCache"));
          if (snap.exists()) {
            const cached = snap.data();
            const age = Date.now() - new Date(cached.generatedAt).getTime();
            if (age < 7 * 24 * 60 * 60 * 1000 && cached.summary) {
              setSummary(cached.summary);
              return;
            }
          }
        } catch (e) {}
      }
      // 2. Check rate limit
      if (user && user.uid !== ADMIN_UID) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid, "meta", "wrappedLastRun"));
          if (snap.exists()) {
            const next = new Date(new Date(snap.data().lastRun).getTime() + 7 * 24 * 60 * 60 * 1000);
            if (next > new Date()) { setNextAvailable(next); return; }
          }
        } catch (e) {}
      }
      // 3. Generate fresh
      generate();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setLoading(true);
    const weekDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      weekDates.push(d.toISOString().split("T")[0]);
    }
    const habitCompletion = weekDates.map(d => {
      const log = habitLogs[d] || {};
      const done = habits.filter(h => log[h.id]).length;
      return { pct: habits.length > 0 ? Math.round(done / habits.length * 100) : 0 };
    });
    const avgHabit  = Math.round(habitCompletion.reduce((a, d) => a + d.pct, 0) / 7);
    const topHabit  = habits.map(h => ({ ...h, done: weekDates.filter(d => habitLogs[d]?.[h.id]).length })).sort((a, b) => b.done - a.done)[0];
    const weekDiary = diary.filter(e => e.createdAt?.split("T")[0] >= weekDates[0]);
    const goalTop   = goals.map(g => ({ title: g.title, pct: calcProgress(g) })).sort((a, b) => b.pct - a.pct).slice(0, 3);
    const weekRems  = reminders.filter(r => r.createdAt >= weekDates[0]);

    const prompt = `Generate a Weekly Wrapped summary for someone's personal growth app. Make it warm, specific, and motivating. Use ONLY these exact section headers (with the emoji):

🌟 THIS WEEK'S HIGHLIGHT
📊 BY THE NUMBERS
🔍 PATTERN SPOTTED
⚡ CHALLENGE FOR NEXT WEEK

Data this week:
- Habit completion: ${avgHabit}% average daily
- Best habit: ${topHabit?.label || "none"} (${topHabit?.done || 0}/7 days)
- Journal entries: ${weekDiary.length} (${weekDiary.reduce((a, e) => a + (e.wordCount || 0), 0)} words written)
- Reminders completed: ${weekRems.filter(r => r.done).length}/${weekRems.length}
- Top goals: ${goalTop.map(g => `${g.title} at ${g.pct}%`).join(", ") || "none tracked"}

Keep it under 250 words. Write in plain conversational prose. No markdown symbols like ** or ##.`;

    try {
      const result = await callClaude(prompt, null, 600);
      setSummary(result);
      if (user) {
        const now = new Date().toISOString();
        await setDoc(doc(db, "users", user.uid, "meta", "wrappedLastRun"), { lastRun: now }, { merge: true }).catch(() => {});
        await setDoc(doc(db, "users", user.uid, "meta", "wrappedCache"), { summary: result, generatedAt: now }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      setSummary("Couldn't generate your Wrapped. Check your connection and try again.");
    }
    setLoading(false);
  };

  const sections      = parseSections(summary);
  const isRateLimited = !!nextAvailable && !summary;
  const today         = todayStr();
  const sixDaysAgo    = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];

  return (
    <div style={{ position: "fixed", inset: 0, background: T.isDark ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(20px)", padding: "16px" }}>
      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 24, width: "min(560px,100%)", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 32px", position: "relative", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>

        {/* Actions */}
        <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
          {summary && !loading && (
            <button onClick={generate}
              style={{ background: "rgba(155,143,232,0.1)", border: "1px solid rgba(155,143,232,0.3)", borderRadius: 8, padding: "6px 12px", color: "#9B8FE8", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
              ↺ Refresh
            </button>
          )}
          <button onClick={onClose}
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            ✕ Close
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24, paddingTop: 4 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#9B8FE8,#C8A96E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24 }}>🎁</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 5px", letterSpacing: -0.5 }}>Weekly Wrapped</h2>
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>{fmtDate(sixDaysAgo)} — {fmtDate(today)}</p>
        </div>

        {/* Rate limited */}
        {isRateLimited && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗓️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>Next Wrapped available</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>
              {nextAvailable?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>Wrapped refreshes every 7 days to capture a full week of data.</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "48px 0" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#9B8FE8", animation: "blink 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>{loadMsg}</div>
          </div>
        )}

        {/* Content */}
        {!loading && summary && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sections.length > 0
              ? sections.map((sec, i) => (
                <div key={i} style={{ background: sec.bg, border: `1px solid ${sec.border}`, borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{sec.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sec.color, letterSpacing: 1, textTransform: "uppercase" }}>{sec.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: T.text, margin: 0, lineHeight: 1.75 }}>{sec.body}</p>
                </div>
              ))
              : (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px" }}>
                  <p style={{ fontSize: 13, color: T.text, margin: 0, lineHeight: 1.75 }}>{summary}</p>
                </div>
              )
            }
          </div>
        )}

        {/* Empty / error */}
        {!loading && !summary && !isRateLimited && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎁</div>
            <p style={{ fontSize: 14, color: T.muted, marginBottom: 16 }}>Couldn't generate your Wrapped.</p>
            <button onClick={generate}
              style={{ background: "linear-gradient(135deg,#9B8FE8,#7EB8D4)", border: "none", borderRadius: 10, padding: "10px 20px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
              Try again
            </button>
          </div>
        )}

        <style>{`@keyframes blink{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    </div>
  );
}

export { WeeklyWrapped };