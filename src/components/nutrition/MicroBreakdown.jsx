const MICROS = [
  { key: 'calcium_mg',     label: 'Calcium',   icon: '🦴', rdi: 1000, unit: 'mg',  color: 'bg-purple-400', clinicalNote: 'Bone density risk in AN — aim for 1200mg/day' },
  { key: 'iron_mg',        label: 'Iron',      icon: '💪', rdi: 18,   unit: 'mg',  color: 'bg-red-400',    clinicalNote: 'Anemia common in AN. Pair with vitamin C to boost absorption.' },
  { key: 'vitamin_d_mcg',  label: 'Vitamin D', icon: '☀️', rdi: 15,   unit: 'mcg', color: 'bg-yellow-400', clinicalNote: 'Deficiency extremely common in AN. Check serum levels.' },
]

export default function MicroBreakdown({ micros }) {
  return (
    <div className="space-y-3">
      {MICROS.map(m => (
        <div key={m.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{m.icon} {m.label}</span>
            <span className="text-gray-700 font-medium">
              {micros[m.key]}{m.unit}
              <span className="text-gray-400 font-normal"> / {m.rdi}{m.unit} RDI</span>
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${m.color} rounded-full`} style={{ width: `${Math.min(100, (micros[m.key] / m.rdi) * 100)}%` }} />
          </div>
          <div className="text-xs text-gray-400 italic">{m.clinicalNote}</div>
        </div>
      ))}
    </div>
  )
}
