import { useState, useEffect } from 'react'
import { lookupNutrition, computeAN_Flags, energyDensityLabel } from './nutritionService'

const apiCache = new Map()

const TAG_TO_ZONE = [
  { keywords: ['cereal', 'grain', 'bread', 'pasta', 'rice', 'oat', 'wheat', 'flour'], zone: 'grain' },
  { keywords: ['meat', 'poultry', 'chicken', 'fish', 'seafood', 'egg', 'legume', 'bean', 'lentil', 'tofu'], zone: 'protein' },
  { keywords: ['vegetable', 'fruit', 'produce', 'salad', 'greens', 'broccoli', 'carrot'], zone: 'produce' },
  { keywords: ['dairy', 'milk', 'cheese', 'yogurt', 'cream', 'butter'], zone: 'dairy' },
  { keywords: ['oil', 'fat', 'nut', 'seed', 'avocado', 'olive'], zone: 'fat' },
]

function mapCategoriesToZone(tags) {
  if (!tags || tags.length === 0) return 'mixed'
  const tagStr = tags.join(' ').toLowerCase()
  for (const { keywords, zone } of TAG_TO_ZONE) {
    if (keywords.some(k => tagStr.includes(k))) return zone
  }
  return 'mixed'
}

function pickBestProduct(products, foodName) {
  const words = foodName.toLowerCase().split(/\s+/).filter(w => w.length > 1)
  let best = null
  let bestScore = -1
  for (const p of products) {
    const name = (p.product_name || '').toLowerCase()
    const score = words.filter(w => name.includes(w)).length
    if (score > bestScore) { bestScore = score; best = p }
  }
  return best || products[0]
}

function mapOFFProduct(product, inputName, category, staticResult) {
  const n = product.nutriments || {}
  const serving = 1.5

  const kcalPer100 = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null)
  const calories = kcalPer100 != null ? Math.round(kcalPer100 * serving) : staticResult.calories
  const protein_g = n['proteins_100g'] != null ? Math.round(n['proteins_100g'] * serving * 10) / 10 : staticResult.protein_g
  const carbs_g = n['carbohydrates_100g'] != null ? Math.round(n['carbohydrates_100g'] * serving * 10) / 10 : staticResult.carbs_g
  const fat_g = n['fat_100g'] != null ? Math.round(n['fat_100g'] * serving * 10) / 10 : staticResult.fat_g
  const fiber_g = n['fiber_100g'] != null ? Math.round(n['fiber_100g'] * serving * 10) / 10 : staticResult.fiber_g
  const calcium_mg = n['calcium_100g'] != null ? Math.round(n['calcium_100g'] * 1000 * serving) : staticResult.calcium_mg
  const iron_mg = n['iron_100g'] != null ? Math.round(n['iron_100g'] * 1000 * serving * 10) / 10 : staticResult.iron_mg
  const vitamin_d_mcg = n['vitamin-d_100g'] != null ? Math.round(n['vitamin-d_100g'] * 1000000 * serving * 10) / 10 : staticResult.vitamin_d_mcg
  const plate_zone = mapCategoriesToZone(product.categories_tags)

  const result = {
    name: inputName,
    matchedName: product.product_name || inputName,
    confidence: 'api',
    source: 'api',
    serving_description: '~150g serving (Open Food Facts)',
    calories, protein_g, carbs_g, fat_g, fiber_g,
    calcium_mg, iron_mg, vitamin_d_mcg,
    energy_density: energyDensityLabel(calories),
    plate_zone,
  }
  result.an_relevant_flags = computeAN_Flags(result)
  return result
}

export async function lookupNutritionEnriched(foodName, category = 'working_on') {
  if (!foodName || !foodName.trim()) return lookupNutrition(foodName, category)

  const cacheKey = `${foodName.toLowerCase().trim()}::${category}`
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey)

  const staticResult = lookupNutrition(foodName, category)

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&json=1&page_size=5&fields=product_name,nutriments,categories_tags&action=process`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`OFF ${res.status}`)
    const json = await res.json()
    const products = (json?.products || []).filter(p => p.product_name && p.nutriments)
    if (products.length === 0) {
      apiCache.set(cacheKey, staticResult)
      return staticResult
    }
    const best = pickBestProduct(products, foodName)
    const enriched = mapOFFProduct(best, foodName, category, staticResult)
    apiCache.set(cacheKey, enriched)
    return enriched
  } catch {
    apiCache.set(cacheKey, { ...staticResult, source: 'static' })
    return { ...staticResult, source: 'static' }
  }
}

export function useNutritionEnriched(foodName, category = 'working_on') {
  const [data, setData] = useState(() => foodName ? lookupNutrition(foodName, category) : null)
  const [loading, setLoading] = useState(!!foodName)
  const [source, setSource] = useState('static')

  useEffect(() => {
    if (!foodName) return
    let cancelled = false
    setLoading(true)
    lookupNutritionEnriched(foodName, category).then(result => {
      if (!cancelled) {
        setData(result)
        setSource(result.source || 'static')
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [foodName, category])

  return { data, loading, source }
}
