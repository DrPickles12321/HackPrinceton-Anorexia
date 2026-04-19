import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a quiet, warm support agent embedded in a conversation between a parent and clinician caring for someone in eating disorder recovery. You have access to meal log data from their app. You are NOT a therapist or doctor. You speak briefly, like a thoughtful friend who has been watching — never intrusive, never clinical. Always be warm, specific, and encouraging. Never use medical jargon.`

async function callClaude(userContent, imageBase64 = null) {
  const content = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: userContent },
      ]
    : userContent

  const msg = await anthropic.messages.create({
    model: imageBase64 ? 'claude-opus-4-7' : 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  })
  return msg.content[0]?.text?.trim() || ''
}

export async function reactiveResponse(threadHistory, weekSummary, streaks) {
  const historyText = threadHistory.map(m => `${m.sender}: ${m.text}`).join('\n')
  const lastMessage = threadHistory[threadHistory.length - 1]?.text?.toLowerCase() || ''
  const isDirectQuestion = /how|what|which|did|was|any|tell|show|week|meal|food|hard|difficult|refus/i.test(lastMessage)

  const streakNote = streaks?.longestOkayStreak >= 3 ? `Notable streak: ${streaks.longestOkayStreak} okay meals in a row.` : ''
  const challengeNote = streaks?.recentChallengeOkay ? `Challenge food win: ${streaks.recentChallengeOkay} marked okay.` : ''

  const prompt = `Here is the recent conversation:\n${historyText}\n\nMeal data this week:\n${weekSummary}\n\n${streakNote}\n${challengeNote}\n\n${isDirectQuestion ? 'Someone asked a direct question. You MUST respond helpfully. Mention streaks or challenge wins if relevant.' : 'Should you add something? Only YES if genuinely useful.'}\n\nReply YES or NO on the first line. If YES, write your response (2-3 sentences, warm and specific) after a blank line.`

  const raw = await callClaude(prompt)
  const lines = raw.split('\n')
  const decision = isDirectQuestion || lines[0]?.trim().toUpperCase().startsWith('YES')
  if (!decision) return { shouldRespond: false, reply: null }

  const replyText = lines.slice(2).join(' ').replace(/\s+/g, ' ').trim() || lines.slice(1).join(' ').replace(/\s+/g, ' ').trim()
  return { shouldRespond: true, reply: replyText || null }
}

export async function dinnerWindowMessage(dinnerEvent) {
  const status = dinnerEvent ? `marked as "${dinnerEvent.status}"` : 'not logged yet'
  return callClaude(`Dinner tonight was ${status}. Write one gentle, non-alarming message to the parent-clinician thread. One sentence, warm tone.`)
}

export async function appointmentPrepMessage(weekSummary, clinicianName, streaks) {
  const streakNote = streaks?.longestOkayStreak >= 3 ? `Streak: ${streaks.longestOkayStreak} okay meals in a row.` : ''
  const challengeNote = streaks?.recentChallengeOkay ? `Challenge win: ${streaks.recentChallengeOkay}.` : ''
  return callClaude(`${clinicianName} has a session in 30 min.\n\n${weekSummary}\n\n${streakNote}\n${challengeNote}\n\nWrite a brief pre-session summary. 3-4 bullets. Highlight wins. No medical language.`)
}

export async function sundaySummaryMessage(weekSummary, streaks) {
  const streakNote = streaks?.longestOkayStreak >= 2 ? `Best streak: ${streaks.longestOkayStreak} okay meals in a row.` : ''
  const challengeNote = streaks?.recentChallengeOkay ? `Challenge food completed: ${streaks.recentChallengeOkay}.` : ''
  return callClaude(`End of week meal data:\n\n${weekSummary}\n\n${streakNote}\n${challengeNote}\n\nWrite a warm 3-4 sentence end-of-week summary for the parent. Celebrate wins, gently acknowledge hard moments, end with encouragement for next week.`)
}

// Better SOS — two-step: ask what's happening, then relay full context to clinician
export async function sosFollowUpQuestion() {
  return callClaude(`A parent just texted SOS. Write one short, calm question asking what's happening right now. Warm, not alarming. One sentence.`)
}

export async function sosClinicianAlert(parentMessage, weekSummary) {
  return callClaude(`A parent sent an SOS. Their message: "${parentMessage}"\n\nThis week's meal context:\n${weekSummary}\n\nWrite a brief, clear alert for the clinician. Include the parent's message and 1-2 sentences of relevant meal context. Stay calm and factual.`)
}

// Meal photo analysis
export async function analyzeMealPhoto(imageBase64) {
  return callClaude(`A parent just sent a photo of a meal. Describe what you see warmly and briefly — what foods are visible, how it looks. Then ask if they'd like to log this meal. 2 sentences max.`, imageBase64)
}

export async function mealPhotoLogConfirmation(description) {
  return callClaude(`A parent confirmed they want to log a meal that was described as: "${description}". Write a warm one-sentence confirmation that it's been noted.`)
}

// Daily morning check-in
export async function morningCheckin(yesterdayDinner) {
  const dinnerNote = yesterdayDinner?.status
    ? `Yesterday's dinner was logged as "${yesterdayDinner.status}".`
    : 'Yesterday\'s dinner wasn\'t logged.'
  return callClaude(`${dinnerNote} Write a warm, brief morning check-in message for the parent. Ask how yesterday evening went and encourage them for today. 2 sentences, friendly tone.`)
}
