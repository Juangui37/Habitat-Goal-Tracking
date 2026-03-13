// api/claude.js — secure proxy for Anthropic API					
// Requires ANTHROPIC_API_KEY set in Vercel project settings → Environment Variables.					
export default async function handler(req, res) {					
  if (req.method !== "POST") {					
    return res.status(405).json({ error: "Method not allowed" });					
  }					
  const { prompt, systemPrompt, maxTokens = 600 } = req.body;					
  if (!prompt) return res.status(400).json({ error: "prompt is required" });					
  const apiKey = process.env.ANTHROPIC_API_KEY;					
  if (!apiKey) {					
    return res.status(500).json({					
      error: "ANTHROPIC_API_KEY is not configured. Go to Vercel → Settings → Environment Variables, add ANTHROPIC_API_KEY, then redeploy."					
    });					
  }					
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
      const msg = data?.error?.message || JSON.stringify(data);					
      console.error("Anthropic API error:", msg);					
      return res.status(response.status).json({ error: `Anthropic API error: ${msg}` });					
    }					
    const text = data.content?.map(b => b.text || "").join("") || "";					
    return res.status(200).json({ text });					
  } catch (error) {					
    console.error("Server error:", error);					
    return res.status(500).json({ error: `Server error: ${error.message}` });					
  }					
}					