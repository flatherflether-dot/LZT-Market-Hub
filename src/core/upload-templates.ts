export interface UploadTemplate {
  id: string
  nameKey: string
  category: string
  origin: string
  priceFormula: string
  titleTemplate?: string
}

export const BUILTIN_UPLOAD_TEMPLATES: UploadTemplate[] = [
  {
    id: 'steam_cs2',
    nameKey: 'upload.template.steamCs2',
    category: 'steam',
    origin: 'personal',
    priceFormula: '450',
    titleTemplate: 'Steam | CS2 Prime'
  },
  {
    id: 'telegram_premium',
    nameKey: 'upload.template.telegram',
    category: 'telegram',
    origin: 'personal',
    priceFormula: '85'
  },
  {
    id: 'discord_aged',
    nameKey: 'upload.template.discord',
    category: 'discord',
    origin: 'personal',
    priceFormula: '120',
    titleTemplate: 'Discord | aged account'
  }
]

export function applyPriceFormula(formula: string, rowIndex = 0): number {
  const trimmed = formula.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const baseMatch = trimmed.match(/^base\+(\d+)$/i)
  if (baseMatch) return 400 + Number(baseMatch[1]) + rowIndex * 10
  const multMatch = trimmed.match(/^(\d+)\*(\d+(?:\.\d+)?)$/i)
  if (multMatch) return Math.round(Number(multMatch[1]) * Number(multMatch[2]))
  return Number(trimmed) || 1
}
