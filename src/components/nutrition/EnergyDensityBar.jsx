export default function EnergyDensityBar({ level }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>Lighter</span><span>Energy rich</span>
      </div>
      <div className="h-3 rounded-full bg-gray-200 relative overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${
          level === 'low' ? 'w-1/4 bg-blue-400' :
          level === 'moderate' ? 'w-1/2 bg-green-500' :
          'w-3/4 bg-orange-500'
        }`} />
      </div>
      <div className="text-xs text-center mt-1 text-gray-500">
        {level === 'low' && 'This meal is lighter — great as a snack'}
        {level === 'moderate' && 'Well-balanced energy for this meal'}
        {level === 'high' && 'Energy-rich — great for supporting recovery'}
      </div>
    </div>
  )
}
