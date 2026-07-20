import { formatMarketText } from './market-text'

export interface MatchableListing {
  item_id: number
  title: string
  price: number
  category: string
}

export interface ListingMatchResult {
  our_item_id: number
  competitor_item_id: number
  match_score: number
  our_title: string
  competitor_title: string
  our_price: number
  competitor_price: number
  category: string
}

const STOP_WORDS = new Set([
  'steam', 'account', 'аккаунт', 'лот', 'premium', 'prime', 'full', 'access',
  'verified', 'email', 'чистый', 'номер', 'год', 'мес', 'месяц', 'months', 'year',
  'the', 'and', 'with', 'for', 'от', 'без', 'на', 'в', 'и', 'или'
])

const GAME_ALIASES: Record<string, string[]> = {
  cs2: ['cs2', 'csgo', 'counter', 'strike', 'кс2', 'ксго'],
  dota2: ['dota', 'dota2', 'дота'],
  rust: ['rust', 'раст'],
  valorant: ['valorant', 'val', 'валорант'],
  fortnite: ['fortnite', 'форт'],
  minecraft: ['minecraft', 'mc', 'майн'],
  telegram: ['telegram', 'телеграм', 'tg'],
  discord: ['discord', 'дискорд'],
  roblox: ['roblox', 'роблокс'],
  gta: ['gta', 'grand', 'theft']
}

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, '-')
}

function tokenize(title: string): string[] {
  return formatMarketText(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s|]/gu, ' ')
    .split(/[\s|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

function extractGameKeys(title: string, category: string): Set<string> {
  const keys = new Set<string>()
  const cat = normalizeCategory(category)
  if (cat && cat !== 'other') keys.add(cat)

  const text = `${title} ${category}`.toLowerCase()
  for (const [key, aliases] of Object.entries(GAME_ALIASES)) {
    if (aliases.some((a) => text.includes(a))) keys.add(key)
  }
  return keys
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function extractNumbers(title: string): number[] {
  return [...title.matchAll(/(\d[\d\s.,]*\d|\d+)/g)]
    .map((m) => Number(m[0].replace(/\s/g, '').replace(',', '.')))
    .filter((n) => !Number.isNaN(n) && n > 0 && n < 1_000_000)
}

function numberSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0.5
  let best = 0
  for (const x of a) {
    for (const y of b) {
      const ratio = Math.min(x, y) / Math.max(x, y)
      if (ratio > best) best = ratio
    }
  }
  return best
}

export function scoreListingPair(our: MatchableListing, competitor: MatchableListing): number {
  const ourCat = normalizeCategory(our.category)
  const compCat = normalizeCategory(competitor.category)
  const catMatch =
    ourCat === compCat ||
    ourCat.includes(compCat) ||
    compCat.includes(ourCat) ||
    ourCat === 'other' ||
    compCat === 'other'

  if (!catMatch && ourCat !== 'other' && compCat !== 'other') return 0

  const ourGames = extractGameKeys(our.title, our.category)
  const compGames = extractGameKeys(competitor.title, competitor.category)
  const gameScore = jaccard(ourGames, compGames)

  const ourTokens = new Set(tokenize(our.title))
  const compTokens = new Set(tokenize(competitor.title))
  const titleScore = jaccard(ourTokens, compTokens)

  const numScore = numberSimilarity(extractNumbers(our.title), extractNumbers(competitor.title))

  let score = titleScore * 0.42 + gameScore * 0.33 + numScore * 0.15
  if (ourCat === compCat && ourCat !== 'other') score += 0.1

  return Math.min(1, score)
}

export function findListingMatches(
  ourListings: MatchableListing[],
  competitorListings: MatchableListing[],
  minScore = 0.52
): ListingMatchResult[] {
  const usedCompetitor = new Set<number>()
  const results: ListingMatchResult[] = []

  for (const ours of ourListings) {
    let best: ListingMatchResult | null = null

    for (const theirs of competitorListings) {
      if (usedCompetitor.has(theirs.item_id)) continue
      const matchScore = scoreListingPair(ours, theirs)
      if (matchScore < minScore) continue

      if (!best || matchScore > best.match_score) {
        best = {
          our_item_id: ours.item_id,
          competitor_item_id: theirs.item_id,
          match_score: matchScore,
          our_title: ours.title,
          competitor_title: theirs.title,
          our_price: ours.price,
          competitor_price: theirs.price,
          category: ours.category || theirs.category
        }
      }
    }

    if (best) {
      usedCompetitor.add(best.competitor_item_id)
      results.push(best)
    }
  }

  return results.sort((a, b) => b.match_score - a.match_score)
}
