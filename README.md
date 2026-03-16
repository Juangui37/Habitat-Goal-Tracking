# ✦ Lumina — AI-Powered Life Tracking App

> *your life, illuminated*

Lumina is a full-stack personal growth web app built with React, Firebase, and the Anthropic Claude API. It tracks goals, habits, journal entries, and reminders across every area of your life — and uses AI to surface patterns, generate insights, and connect everything together.

**Live:** [habitat-goal-tracking.vercel.app](https://habitat-goal-tracking.vercel.app)

---

## What It Does

| Page | Purpose |
|------|---------|
| **Goals** | Create SMART goals across 8+ life categories. AI Coach turns rough ideas into structured goals with subtasks, deadlines, and measurable outcomes. |
| **Habits** | Daily habit tracker with streaks, category filters, preset library, and custom schedules (daily / weekdays / weekends / custom days). |
| **Journal** | Free-form journaling. AI auto-categorizes each entry by life area and detects mood. |
| **Reminders** | Simple task reminders. AI categorizes each one to a life area so they show up in Analytics. |
| **Analytics** | Stats, charts, and AI-generated coaching insights across all four pages. Time filters from 7 days to 1 year. |
| **Mind Map** | AI-generated visual overview of every life category — progress rings, insights, highlights, and warnings per area. |
| **Wrapped** | Weekly "Spotify Wrapped"-style summary of your habits, goals, journal, and reminders. Rate-limited to once every 7 days. |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React (JSX) | Component-based UI, fast iteration |
| Build tool | Vite | Compiles JSX → browser-ready JS in seconds |
| Hosting | Vercel | Auto-deploys on every GitHub push |
| Database | Firebase Firestore | Real-time sync, per-user data isolation |
| Auth | Firebase Auth | Google OAuth + Email/Password |
| AI | Anthropic Claude API | Goal generation, insights, categorization |
| API proxy | Vercel Serverless Function | Keeps API key server-side, never in browser |

---

## Project Structure

```
lumina/
├── api/
│   └── claude.js              # Serverless function — proxies all Claude API calls
│                              # API key lives here, never touches the browser
│
├── src/
│   ├── App.jsx                # Root component — auth, data state, routing, layout
│   │                          # ~240 lines. Only wires things together, no UI logic
│   ├── firebase.js            # Firebase config — exports db, auth, googleProvider
│   ├── main.jsx               # React entry point — mounts App into index.html
│   │
│   ├── constants/
│   │   ├── theme.js           # DARK_THEME, LIGHT_THEME, and T (live theme object)
│   │   │                      # T is mutated on every render by App — all components read from it
│   │   ├── index.js           # All app-wide constants:
│   │   │                      #   CATS — 8 goal life categories
│   │   │                      #   HAB_CATS — 8 habit categories
│   │   │                      #   PRESET_HABITS — preset library per category
│   │   │                      #   DAY_SCHEDULES, DAY_LABELS
│   │   │                      #   ADMIN_UID, DISPOSABLE_DOMAINS, PLAN_LIMITS
│   │   │                      #   todayStr, calcProgress, daysLeft (utility fns)
│   │   │                      #   getCustomCats, saveCustomCats (localStorage helpers)
│   │   │                      #   LOADING_MESSAGES, EMOJI_OPTIONS
│   │   └── seed.js            # Demo mode data — SEED_GOALS, SEED_HABITS,
│   │                          # SEED_REMINDERS, SEED_DIARY, generateDemoLogs()
│   │                          # Only loaded when user clicks "View Demo"
│   │
│   ├── utils/
│   │   └── ai.js              # callClaude(prompt, system, maxTokens)
│   │                          # useLoadingMessage(isLoading) — rotating messages hook
│   │                          # trackAIUsage(uid, feature) — Firestore usage counter
│   │
│   ├── components/
│   │   ├── Ring.jsx           # SVG circular progress ring — used on Goals and Habits
│   │   ├── Nav.jsx            # Top navigation bar — tabs + admin detection
│   │   ├── JournalPanel.jsx   # Per-goal journal — shows/adds entries inside GoalCard
│   │   │
│   │   └── modals/
│   │       ├── AICoachModal.jsx          # AI Goal Coach — Chat mode + Bulk Import mode
│   │       │                             # Chat: conversational single-goal creation
│   │       │                             # Bulk: paste any text → extracts all goals
│   │       ├── SmartModal.jsx            # Manual SMART goal builder — 9-step flow
│   │       │                             # Category → Specific → Measurable → etc.
│   │       ├── HabitSuggester.jsx        # Fires after new goal creation
│   │       │                             # AI suggests 3-5 habits tied to the goal
│   │       ├── OnboardingModal.jsx       # First-time user flow — 6 steps:
│   │       │                             # Welcome → Tour → AI goal → AI habits
│   │       │                             # → Journal intro → Done
│   │       │                             # Saved to Firestore, never shows again
│   │       ├── EmailVerificationGate.jsx # Blocks app until email is verified
│   │       │                             # Auto-sends verification email on mount
│   │       │                             # Only fires for email/password accounts
│   │       │                             # (Google accounts are pre-verified)
│   │       └── CustomCategoryModal.jsx   # Create custom goal/habit categories
│   │                                     # Emoji picker + color picker
│   │                                     # Saved to localStorage
│   │                                     # useAllCats() hook merges built-in + custom
│   │
│   └── pages/
│       ├── GoalsPage.jsx      # Goals list + filters + category overview cards
│       │                      # Contains GoalCard component (subtasks, journal, edit)
│       ├── HabitsPage.jsx     # Daily habit tracker — check-off, streaks, completion %
│       │                      # Preset library with multi-select
│       │                      # Custom habit creation with schedule picker
│       ├── AnalyticsPage.jsx  # 4 tabs: Goals / Habits / Journal / Reminders
│       │                      # Charts, stats, AI insight button per tab
│       │                      # Time filter: 7d → 1yr
│       ├── RemindersPage.jsx  # Simple to-do style reminders with due dates
│       │                      # AI categorizes each reminder to a life area
│       ├── DiaryPage.jsx      # Journal entries — write, search, filter by mood/category
│       │                      # AI auto-categorizes on save
│       │                      # PIN lock option
│       ├── MindMapPage.jsx    # SVG mind map — center node (you) + category nodes
│       │                      # Each node: progress %, AI insights, highlight, warning
│       │                      # 7-day Firestore cache
│       ├── WeeklyWrapped.jsx  # Weekly summary card — habit streaks, goal moments,
│       │                      # journal themes, next-week recommendation
│       │                      # 7-day rate limit (admin bypasses)
│       ├── LoginScreen.jsx    # Auth options: Google, Email/Password, Apple (stub), Demo
│       ├── SettingsPage.jsx   # Dark/light mode, diary PIN, sign out, profile
│       └── AdminPanel.jsx     # Hidden — only visible when user UID = ADMIN_UID
│                              # Shows per-user AI call counts + estimated monthly cost
│
├── index.html                 # Single HTML shell — React mounts into <div id="root">
├── package.json               # Dependencies: react, firebase, vite
├── vite.config.js             # Vite build config
└── vercel.json                # SPA rewrite rule — all routes → index.html
```

---

## Firestore Data Structure

Every user's data lives under `users/{uid}/`. No user can read another user's data.

```
users/
  {uid}/
    goals/          {id}  → { title, category, priority, specific, measurable,
                              achievable, relevant, timebound, subtasks[], journal[] }
    habits/         {id}  → { label, icon, category, color, schedule, customDays[] }
    habitLogs/    {date}  → { habitId: true/false, habitId: true/false, ... }
    reminders/      {id}  → { text, done, dueDate, category, aiNote, createdAt }
    diary/          {id}  → { text, mood, categories[], wordCount, createdAt }
    usage/       {month}  → { totalCalls, goalsCalls, habitsCalls, ..., lastCall }
    meta/
      onboarding   → { onboardingComplete, completedAt }
      profile      → { createdAt, email, plan, uid }
      mindMap      → { nodes[], generatedAt }
      wrappedLastRun → { lastRun }
```

---

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**.

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | Yes |

After changing any environment variable, you must **redeploy** for it to take effect.

---

## One-Time Setup Checklist

These things need to be configured manually — they can't be done in code.

**Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com))
- [ ] Authentication → Sign-in method → **Google** → Enable
- [ ] Authentication → Sign-in method → **Email/Password** → Enable
- [ ] Authentication → Settings → Authorized domains → Add your Vercel URL
- [ ] Firestore → Rules → Replace with production rules (see below)

**Vercel** ([vercel.com](https://vercel.com))
- [ ] Settings → Environment Variables → Add `ANTHROPIC_API_KEY`
- [ ] After adding key: Deployments → Redeploy

**In the code**
- [ ] `src/constants/index.js` → Replace `REPLACE_WITH_YOUR_UID` in `ADMIN_UID`
  - Find your UID: Firebase Console → Authentication → Users → copy the UID column

---

## Firestore Security Rules

Replace the default "test mode" rules with these before sharing with real users:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each user can only read and write their own data.

---

## How AI Features Work

Every AI call goes through this path:

```
Browser → /api/claude (Vercel serverless) → Anthropic API → response → Browser
```

The API key **never** touches the browser. It lives only in Vercel's environment variables, read server-side by `api/claude.js`.

**AI features and what they send:**

| Feature | Data sent to Claude | Where result goes |
|---------|-------------------|-----------------|
| Goal Coach (chat) | Conversation history | Goal card on dashboard |
| Goal Coach (bulk import) | Pasted raw text | Multiple goal cards |
| Habit Suggester | Goal title + category | Habit suggestions modal |
| SMART goal step | Single rough idea | Structured goal preview |
| Journal categorization | Journal entry text | Category tags on entry |
| Analytics insight | Habit/goal/journal stats | Insight card on Analytics |
| Weekly Wrapped | 7-day data snapshot | Full-screen Wrapped card |
| Mind Map | All categories + progress | SVG node map with insights |

---

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev
# → opens http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

The local dev server calls `/api/claude` which won't work without a local serverless runtime. For local AI testing, either:
- Set up Vercel CLI: `npx vercel dev`
- Or temporarily hardcode a direct API call in `utils/ai.js` for development only (never commit this)

---

## Deployment

Vercel auto-deploys on every push to `main`. Manual deploy:

1. Push to GitHub
2. Vercel picks it up automatically (usually < 60 seconds)
3. Visit your Vercel URL to verify

If you changed environment variables, trigger a manual redeploy:
Vercel → Deployments → three dots on latest → Redeploy

---

## What's Been Built (Phase History)

**Phase 1 — Core App**
React app with Goals, Habits, and Analytics. SMART goal coach and AI Habit Suggester. localStorage for data.

**Phase 2 — Deployment**
GitHub → Vercel CI/CD pipeline. Firebase project setup. Authorized domains configured. Popup auth debugged.

**Phase 3 — Firebase Cloud**
Firestore real-time sync. Google OAuth + Email/Password auth. Per-user data isolation. Demo mode with 90-day generated habit history. Habit scheduling (daily / weekdays / custom days).

**Phase 3.5 — Feature Expansion**
Journal page with AI categorization and PIN lock. Reminders page with AI category tagging. Weekly Wrapped. Settings with dark/light mode. Analytics across all 4 pages.

**Phase 4 — Security + AI + Onboarding**
Email verification gate. Disposable domain blocklist. 6-step onboarding flow with AI goal and habit generation. Serverless API proxy (AI now works on live site). Mind Map page. Admin panel. Weekly Wrapped rate limiting. Custom categories. Multi-select habit presets.

**Next (Phase 5)**
- PWA (installable on phone)
- Subscription / freemium tier with Stripe
- AWS migration (Cognito + DynamoDB + Amplify)
- Journal → goal suggestion engine
- Full code audit and test coverage

---

## Built By

Juan Villegas — Data Engineer, Travelers Insurance BI&A LDP Program  
Built from scratch with no prior frontend experience.  
Stack learned entirely through building this project.