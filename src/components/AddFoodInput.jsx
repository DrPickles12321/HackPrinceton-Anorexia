import { useState, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'
import { COMMON_FOODS } from '../data/commonFoods'

const fuse = new Fuse(COMMON_FOODS, { keys: ['name'], threshold: 0.4 })

const CATEGORY_CONFIG = {
  familiar:   { label: 'Familiar',    dot: 'bg-green-500',  pill: 'bg-green-100 text-green-800 border-green-400' },
  working_on: { label: 'Working On',  dot: 'bg-yellow-400', pill: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
  challenge:  { label: 'Challenge',   dot: 'bg-red-400',    pill: 'bg-red-100 text-red-800 border-red-400' },
}

export default function AddFoodInput({ onAddFood, existingFoodNames = [] }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('familiar')
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  function handleChange(e) {
    const val = e.target.value
    setName(val)
    setActiveIndex(-1)
    if (val.trim().length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const results = fuse.search(val).slice(0, 5).map(r => r.item)
    setSuggestions(results)
    setOpen(results.length > 0)
  }

  function selectSuggestion(food) {
    setName(food.name)
    setCategory(food.suggestedCategory)
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) return
    const duplicate = existingFoodNames.some(
      n => n.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      setToast("You already have that food — check the sidebar.")
      return
    }
    onAddFood({ name: trimmed, category })
    setName('')
    setCategory('familiar')
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="relative">
      {toast && (
        <div className="mb-2 rounded bg-amber-100 border border-amber-300 text-amber-800 text-sm px-3 py-2">
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Add a food..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {open && (
            <ul
              ref={listRef}
              className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
            >
              {suggestions.map((food, i) => (
                <li
                  key={food.name}
                  onMouseDown={() => selectSuggestion(food)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                    i === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_CONFIG[food.suggestedCategory].dot}`} />
                  <span>{food.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </form>

      <div className="flex gap-2 mt-2">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`flex-1 text-xs px-2 py-1 rounded-full border font-medium transition-colors ${
              category === key ? cfg.pill : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>
    </div>
  )
}
