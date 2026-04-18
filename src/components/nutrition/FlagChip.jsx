const FLAG_CONFIG = {
  'good calcium source':   { icon: '🦴', label: 'Bone health',    color: 'bg-purple-100 text-purple-700' },
  'iron rich':             { icon: '🩸', label: 'Iron rich',       color: 'bg-red-100 text-red-700' },
  'vitamin D source':      { icon: '☀️', label: 'Vitamin D',       color: 'bg-yellow-100 text-yellow-700' },
  'high energy density':   { icon: '⚡', label: 'Energy rich',     color: 'bg-orange-100 text-orange-700' },
  'complete protein':      { icon: '🥩', label: 'Protein',         color: 'bg-pink-100 text-pink-700' },
  'contains healthy fats': { icon: '🫒', label: 'Healthy fats',    color: 'bg-green-100 text-green-700' },
  'high fiber':            { icon: '🌾', label: 'High fiber',      color: 'bg-amber-100 text-amber-700' },
}

export { FLAG_CONFIG }

export default function FlagChip({ flag }) {
  const cfg = FLAG_CONFIG[flag]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}
