export function getFamilyId() {
  return localStorage.getItem('demoFamilyId') || '11111111-1111-1111-1111-111111111111'
}
export const DEMO_FAMILY_ID = '11111111-1111-1111-1111-111111111111'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function getWeekDates(offset = 0) {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offset * 7)
  const result = {}
  DAY_KEYS.forEach((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    result[key] = d.toISOString().slice(0, 10)
  })
  return result
}
