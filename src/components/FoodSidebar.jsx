import { useState, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import AddFoodInput from './AddFoodInput'

const FAMILY_ID = import.meta.env.VITE_FAMILY_ID

const CATEGORIES = [
  { key: 'familiar',   label: 'Familiar',   bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
  { key: 'working_on', label: 'Working On',  bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  { key: 'challenge',  label: 'Challenge',   bar: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50' },
]

const CATEGORY_LABELS = {
  familiar:   'Move to Familiar',
  working_on: 'Move to Working On',
  challenge:  'Move to Challenge',
}

function FoodCard({ food, onDelete, onChangeCategory }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: food.id, data: { food } })

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 mb-1 shadow-sm"
      >
        <span
          {...listeners}
          {...attributes}
          className="text-sm text-gray-700 flex-1 cursor-grab active:cursor-grabbing select-none"
        >
          {food.name}
        </span>

        <div className="flex items-center gap-1 relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="text-gray-400 hover:text-gray-600 px-1 text-base leading-none"
          >
            ⋮
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-gray-300 hover:text-red-500 text-xs px-1"
          >
            ×
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-44 py-1">
              {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== food.category).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onChangeCategory(food, key); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {label}
                </button>
              ))}
              <hr className="my-1 border-gray-100" />
              <button
                onClick={() => { setConfirmDelete(true); setMenuOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <p className="text-sm text-gray-700 mb-4">
              This food may be on your weekly plan. Remove it and clear those slots?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(food); setConfirmDelete(false) }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ config, foods, onDelete, onChangeCategory }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="mb-3">
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${config.bg} ${config.text} font-semibold text-sm`}
      >
        <span className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.bar}`} />
          {config.label} ({foods.length})
        </span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="mt-1 pl-1">
          {foods.length === 0 && (
            <p className="text-xs text-gray-400 px-2 py-1">No foods yet</p>
          )}
          {foods.map(food => (
            <FoodCard
              key={food.id}
              food={food}
              onDelete={onDelete}
              onChangeCategory={onChangeCategory}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FoodSidebar() {
  const [foods, setFoods] = useState([])

  useEffect(() => {
    supabase
      .from('food_items')
      .select('*')
      .eq('family_id', FAMILY_ID)
      .then(({ data }) => { if (data) setFoods(data) })

    const channel = supabase
      .channel('food_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_items', filter: `family_id=eq.${FAMILY_ID}` }, payload => {
        if (payload.eventType === 'INSERT') setFoods(f => [...f, payload.new])
        if (payload.eventType === 'DELETE') setFoods(f => f.filter(x => x.id !== payload.old.id))
        if (payload.eventType === 'UPDATE') setFoods(f => f.map(x => x.id === payload.new.id ? payload.new : x))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function handleAddFood({ name, category }) {
    const optimistic = { id: crypto.randomUUID(), family_id: FAMILY_ID, name, category }
    setFoods(f => [...f, optimistic])
    const { data } = await supabase
      .from('food_items')
      .insert({ family_id: FAMILY_ID, name, category })
      .select()
      .single()
    if (data) setFoods(f => f.map(x => x.id === optimistic.id ? data : x))
  }

  async function handleDelete(food) {
    setFoods(f => f.filter(x => x.id !== food.id))
    await supabase.from('food_items').delete().eq('id', food.id)
  }

  async function handleChangeCategory(food, newCategory) {
    setFoods(f => f.map(x => x.id === food.id ? { ...x, category: newCategory } : x))
    await supabase.from('food_items').update({ category: newCategory }).eq('id', food.id)
  }

  const byCategory = cat => foods.filter(f => f.category === cat)
  const existingNames = foods.map(f => f.name)

  return (
    <aside className="w-72 flex-shrink-0 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Our Foods</h2>
      <div className="mb-4">
        <AddFoodInput onAddFood={handleAddFood} existingFoodNames={existingNames} />
      </div>
      {CATEGORIES.map(cfg => (
        <Section
          key={cfg.key}
          config={cfg}
          foods={byCategory(cfg.key)}
          onDelete={handleDelete}
          onChangeCategory={handleChangeCategory}
        />
      ))}
    </aside>
  )
}
