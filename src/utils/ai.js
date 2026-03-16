import { db } from "../firebase.js";
import { doc, setDoc, increment } from "firebase/firestore";
import { LOADING_MESSAGES } from "../constants/index.js";
import { useState, useEffect } from "react";

// ─── CLAUDE API PROXY ─────────────────────────────────────────────────────────
export async function callClaude(prompt, systemPrompt, maxTokens = 600) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt, maxTokens }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      res.status === 404
        ? "AI function not found. Make sure api/claude.js is in your GitHub repo root and redeploy."
        : `Server error (${res.status}). Check Vercel logs — the serverless function may have crashed.`
    );
  }

  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.text || "";
}

// ─── ROTATING LOADING MESSAGE HOOK ───────────────────────────────────────────
export function useLoadingMessage(isLoading) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!isLoading) { setIdx(0); return; }
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MESSAGES.length), 2500);
    return () => clearInterval(t);
  }, [isLoading]);
  return LOADING_MESSAGES[idx];
}

// ─── AI USAGE TRACKER ─────────────────────────────────────────────────────────
export async function trackAIUsage(uid, feature) {
  if (!uid) return;
  try {
    const month = new Date().toISOString().slice(0, 7);
    const ref = doc(db, "users", uid, "usage", month);
    await setDoc(ref, {
      month,
      totalCalls: increment(1),
      [`${feature}Calls`]: increment(1),
      lastCall: new Date().toISOString(),
    }, { merge: true });
  } catch (e) { /* non-blocking */ }
}