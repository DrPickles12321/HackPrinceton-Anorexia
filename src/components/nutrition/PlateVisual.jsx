const ZONE_COLORS = { grain: '#F59E0B', protein: '#EF4444', produce: '#22C55E', fat: '#FACC15', dairy: '#60A5FA' }
const ZONE_LABELS = { grain: 'Grains', protein: 'Protein', produce: 'Produce', fat: 'Fats', dairy: 'Dairy' }

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  if (endAngle - startAngle >= 360) endAngle = startAngle + 359.99
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`
}

export default function PlateVisual({ plateBalance }) {
  const zones = Object.entries(plateBalance || {})
    .map(([key, pct]) => ({ key: key.replace('_pct', ''), pct }))
    .filter(z => z.pct > 0 && z.key in ZONE_COLORS)

  const total = zones.reduce((s, z) => s + z.pct, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-[120px] h-[120px] rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
          <span className="text-xs text-gray-400 text-center px-2">Plate data unavailable</span>
        </div>
      </div>
    )
  }

  const cx = 60, cy = 60, r = 54, innerR = 20
  let angle = 0
  const arcs = zones.map(z => {
    const sweep = (z.pct / total) * 360
    const path = arcPath(cx, cy, r, angle, angle + sweep)
    angle += sweep
    return { ...z, path }
  })

  const ariaLabel = `Plate showing ${zones.map(z => `${z.pct}% ${ZONE_LABELS[z.key] || z.key}`).join(', ')}`

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="120" height="120" role="img" aria-label={ariaLabel}>
        <circle cx={cx} cy={cy} r={r + 5} fill="white" stroke="#e5e7eb" strokeWidth="1" />
        {arcs.map(z => (
          <path key={z.key} d={z.path} fill={ZONE_COLORS[z.key]} stroke="white" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r={innerR} fill="white" />
      </svg>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {zones.map(z => (
          <span key={z.key} className="flex items-center gap-1 text-xs text-gray-600">
            <span style={{ color: ZONE_COLORS[z.key] }}>⬤</span>
            {ZONE_LABELS[z.key] || z.key}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center">Target: 50% grains · 25% protein · 25% produce + fats</p>
    </div>
  )
}
