import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'nutritionalTargets'

const DEFAULT_TARGETS = {
  protein: 95,
  carbs: 145,
  fruitsVeggies: 225,
}

function loadTargets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_TARGETS
    const parsed = JSON.parse(stored)
    // migrate old per-meal format if present
    if (parsed.breakfast) return DEFAULT_TARGETS
    return parsed
  } catch {
    return DEFAULT_TARGETS
  }
}

const NutritionalTargetsContext = createContext(null)

export function NutritionalTargetsProvider({ children }) {
  const [targets, setTargets] = useState(loadTargets)

  function saveTargets(next) {
    setTargets(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <NutritionalTargetsContext.Provider value={{ targets, saveTargets }}>
      {children}
    </NutritionalTargetsContext.Provider>
  )
}

export function useNutritionalTargets() {
  return useContext(NutritionalTargetsContext)
}
