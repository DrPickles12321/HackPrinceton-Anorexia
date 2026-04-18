import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a quiet, warm support agent embedded in a conversation between a parent and clinician caring for someone in eating disorder recovery. You have access to meal log data from their app. You are NOT a therapist or doctor. You speak briefly, like a thoughtful friend who has been watching — never intrusive, never clinical. You only speak when you have something genuinely worth adding.`

async function callClaude(userContent) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })
  return msg.content[0]?.text?.trim() || ''
}

/**
 * Decide whether to respond to a conversation message and what to say.
 * Returns { shouldRespond: boolean, reply: string | null }
 */
export async function reactiveResponse(threadHistory, weekSummary) {
  const historyText = threadHistory
    .map(m => `${m.sender}: ${m.text}`)
    .join('\n')

  const prompt = `Here is the recent conversation:\n${historyText}\n\nHere is the meal data from their app this week:\n${weekSummary}\n\nShould you add something to this conversation? Reply with YES or NO on the first line, then one sentence explaining why. If YES, add a second paragraph with what you would say (1-2 sentences max, warm and brief).`

  const raw = await callClaude(prompt)
  const lines = raw.split('\n')
  const decision = lines[0]?.trim().toUpperCase().startsWith('YES')

  if (!decision) return { shouldRespond: false, reply: null }

  const replyText = lines.slice(2).join(' ').replace(/\s+/g, ' ').trim()
  return { shouldRespond: true, reply: replyText || null }
}

/**
 * Generate a gentle proactive message when dinner was skipped or refused.
 */
export async function dinnerWindowMessage(dinnerEvent) {
  const status = dinnerEvent ? `marked as "${dinnerEvent.status}"` : 'not logged yet'
  const prompt = `Dinner tonight was ${status}. Write one gentle, non-alarming message to the parent-clinician thread — offer to share context from the app, don't diagnose or prescribe. One sentence, warm tone.`
  return callClaude(prompt)
}

/**
 * Generate a pre-session summary for the clinician.
 */
export async function appointmentPrepMessage(weekSummary, clinicianName) {
  const prompt = `${clinicianName} has a session starting in 30 minutes. Here is this week's meal data:\n\n${weekSummary}\n\nWrite a brief, warm pre-session summary the clinician can glance at before walking in. 3-4 bullet points max. No medical language, no diagnoses.`
  return callClaude(prompt)
}
