interface LztCategoryRef {
  category_id?: number
  category_title?: string
  category_name?: string
  category_url?: string
}

function isCategoryRef(value: unknown): value is LztCategoryRef {
  if (!value || typeof value !== 'object') return false
  const obj = value as LztCategoryRef
  return (
    typeof obj.category_title === 'string' ||
    typeof obj.category_name === 'string' ||
    typeof obj.category_url === 'string' ||
    typeof obj.category_id === 'number'
  )
}

export function formatMarketText(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return formatMarketText(JSON.parse(trimmed) as unknown)
      } catch {
        return value
      }
    }
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.title === 'string') return obj.title
    if (isCategoryRef(obj)) {
      const cat = obj as LztCategoryRef
      return cat.category_title ?? cat.category_name ?? cat.category_url ?? ''
    }
  }
  return ''
}
