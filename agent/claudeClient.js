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

  const lastMessage = threadHistory[threadHistory.length - 1]?.text?.toLowerCase() || ''
  const isDirectQuestion = /how|what|which|did|was|any|tell|show|week|meal|food|hard|difficult|refus/i.test(lastMessage)

  const prompt = `Here is the recent conversation:\n${historyText}\n\nHere is the meal data from their app this week:\n${weekSummary}\n\n${isDirectQuestion ? 'Someone asked a direct question about meals. You MUST respond with a warm, helpful answer based on the data above.' : 'Should you add something? Reply YES or NO on the first line. Only say YES if you have something genuinely useful.'}\n\nReply with YES or NO on the first line. If YES, write your response (2-3 sentences max, warm and conversational) after a blank line.`

  const raw = await callClaude(prompt)
  const lines = raw.split('\n')
  const decision = isDirectQuestion || lines[0]?.trim().toUpperCase().startsWith('YES')

  if (!decision) return { shouldRespond: false, reply: null }

  const replyText = lines.slice(2).join(' ').replace(/\s+/g, ' ').trim() || lines.slice(1).join(' ').replace(/\s+/g, ' ').trim()
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
