import type { ImapConfigEntry } from '@renderer/types/database'

export function normalizeImapEntry(entry: unknown): ImapConfigEntry | null {
  if (!entry || typeof entry !== 'object') return null
  const raw = entry as Record<string, unknown>
  const domain = String(raw.domain ?? raw.name ?? '').trim().toLowerCase()
  if (!domain) return null
  const imap_host = String(raw.imap_server ?? raw.imap_host ?? raw.host ?? '').trim()
  const imap_port = Number(raw.port ?? raw.imap_port ?? 993)
  const secure = raw.secure ?? raw.imap_ssl
  const imap_ssl = secure === false || secure === 0 || secure === '0' ? 0 : 1
  return {
    domain,
    imap_host,
    imap_port: Number.isFinite(imap_port) && imap_port > 0 ? imap_port : 993,
    imap_ssl,
    updated_at: String(raw.updated_at ?? new Date().toISOString())
  }
}

export function parseImapListResponse(data: unknown): ImapConfigEntry[] {
  if (!data) return []
  if (Array.isArray(data)) {
    return data.map(normalizeImapEntry).filter((entry): entry is ImapConfigEntry => entry !== null)
  }
  if (typeof data !== 'object') return []

  const record = data as Record<string, unknown>
  const candidates = [record.imap, record.items, record.domains, record.configs, record.data]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeImapEntry).filter((entry): entry is ImapConfigEntry => entry !== null)
    }
  }

  const nested = Object.values(record).find((value) => Array.isArray(value))
  if (Array.isArray(nested)) {
    return nested.map(normalizeImapEntry).filter((entry): entry is ImapConfigEntry => entry !== null)
  }

  const single = normalizeImapEntry(record)
  return single ? [single] : []
}
