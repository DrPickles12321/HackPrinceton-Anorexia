# iMessage Agent — Design Spec
_Date: 2026-04-18_

## Overview

A quiet, warm AI agent embedded in the parent ↔ clinician iMessage thread. It has read access to the app's meal log data and behaves like a thoughtful third participant who has been watching the app all week — choosing when to speak rather than always responding.

Integrated via [Spectrum (Photon)](https://photon.codes/spectrum). Runs as a lightweight Express server alongside the existing React + Supabase app.

---

## Data Layer

### New Supabase tables

**`meal_events`** — written by the React app on every meal log action:

| column | type | notes |
|---|---|---|
| id | uuid | pk |
| date | text | ISO date, e.g. `2026-04-18` |
| meal_type | text | `breakfast` / `lunch` / `snack` / `dinner` |
| status | text | `okay` / `difficult` / `refused` / `unlogged` |
| food_items | jsonb | array of `{ name, category }` |
| created_at | timestamptz | auto |

**`appointments`** — written by the clinician view when scheduling a session:

| column | type | notes |
|---|---|---|
| id | uuid | pk |
| scheduled_at | timestamptz | when the session starts |
| clinician_name | text | |
| patient_name | text | |
| prep_sent | bool | default false — flipped after agent sends prep summary |

### React app changes

- `MealLogModal` — on status save, write one row to `meal_events`
- `ClinicianView` — on appointment creation, write one row to `appointments`
- All existing localStorage state and UI logic stays untouched
- Agent never writes to app data

---

## Express Agent Server

**Location:** `agent/server.js`

**Environment variables (`.env`):**
```
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
SPECTRUM_API_KEY
SPECTRUM_THREAD_ID
DINNER_WINDOW_HOUR=20        # 8pm local — hour to check for unlogged/refused dinner
DINNER_WINDOW_MINUTE=30
```

### Webhook handler

```
POST /webhook
```

Spectrum sends this on every incoming iMessage in the registered thread.

1. Parse `{ text, sender, threadId, timestamp }` from body
2. Append message to in-memory thread history buffer (capped at last 20 messages)
3. Fetch last 7 days of `meal_events` from Supabase
4. Build 7-day meal summary string
5. Call Claude with reactive prompt (see Prompting section), passing last 5 messages from buffer
6. If Claude says YES → POST reply to Spectrum send endpoint
7. If Claude says NO → do nothing

### Dinner window timer

Runs every 15 minutes via `setInterval`.

At `DINNER_WINDOW_HOUR:DINNER_WINDOW_MINUTE` local time:
1. Check in-memory cooldown — skip if already fired today
2. Query `meal_events` for today's dinner row
3. If status is `refused` or no row exists → send proactive dinner message
4. Set cooldown flag for today

### Appointment prep timer

Runs every 15 minutes via `setInterval`.

1. Query `appointments WHERE scheduled_at BETWEEN now AND now + 35min AND prep_sent = false`
2. For each match:
   - Fetch last 7 days of `meal_events`
   - Call Claude with prep prompt
   - Send summary to thread
   - Set `prep_sent = true` in Supabase

---

## Spectrum Integration

**One-time setup:**
1. Sign up at `app.photon.codes` (promo code: `HACKPTON2026`)
2. Connect iMessage account
3. Register webhook: `https://<ngrok-id>.ngrok.io/webhook`
4. Copy `SPECTRUM_API_KEY` and `SPECTRUM_THREAD_ID` into `.env`

**Receiving messages** — Spectrum POSTs to `/webhook`:
```json
{ "text": "...", "sender": "...", "threadId": "...", "timestamp": "..." }
```

**Sending messages** — verify exact endpoint and payload shape from [Spectrum docs](https://photon.codes/spectrum) after setup:
```
POST https://api.photon.codes/v1/messages   ← confirm URL
Authorization: Bearer <SPECTRUM_API_KEY>
{ "threadId": "...", "text": "..." }         ← confirm field names
```

No SDK required — plain `fetch` calls only.

---

## Claude Prompting

### Shared system prompt (all behaviors)

> You are a quiet, warm support agent embedded in a conversation between a parent and clinician caring for someone in eating disorder recovery. You have access to meal log data from their app. You are NOT a therapist or doctor. You speak briefly, like a thoughtful friend who has been watching — never intrusive, never clinical. You only speak when you have something genuinely worth adding.

### Behavior 1 — Reactive (incoming message)

User message includes: last 5 thread messages + 7-day meal summary.

Ask Claude two things in one call:
1. Should you respond? Reply `YES` or `NO` and one sentence why.
2. If YES, what would you say? One or two sentences max.

Parse the response: if it starts with `NO`, stay silent. If `YES`, extract and send the reply.

### Behavior 2 — Dinner window proactive

Context: today's meal events.

> Dinner wasn't logged (or was marked refused) tonight. Write one gentle, non-alarming message to the parent-clinician thread — offer to show context, don't diagnose. One sentence.

### Behavior 3 — Appointment prep

Context: full 7-day meal_events summary.

> A clinician session starts in 30 minutes. Write a brief, warm summary of this week's meal patterns the clinician can glance at before walking in. 3–4 bullet points max. No medical language.

---

## System Diagram

```
React app  ──write──▶  Supabase (meal_events, appointments)
                              ▲
                              │ read
Spectrum  ──webhook──▶  Express agent  ──Claude──▶  Spectrum (reply)
               ▲              │
          iMessage thread  timers (dinner window + appointment prep)
```

---

## Files to Create / Modify

| path | action |
|---|---|
| `agent/server.js` | create — main agent server |
| `agent/supabaseClient.js` | create — Supabase service-key client |
| `agent/claudeClient.js` | create — Claude API wrapper |
| `agent/spectrumClient.js` | create — Spectrum send helper |
| `agent/mealSummary.js` | create — formats meal_events rows into prompt-ready text |
| `agent/.env.example` | create |
| `agent/package.json` | create |
| `src/components/MealLogModal.jsx` | modify — add Supabase write on status save |
| `src/pages/ClinicianView.jsx` | modify — add appointment creation + Supabase write |

---

## What's Out of Scope

- Multi-patient / multi-thread support (one thread, one patient for now)
- Persistent thread history storage (agent uses only the last 5 messages from the webhook payload)
- Authentication on the webhook endpoint (add HMAC verification post-hackathon)
- Appointment UI in ClinicianView beyond a simple date/time input
