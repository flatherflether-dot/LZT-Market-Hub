import {
  getCategoryUploadRequirements,
  hasValidCredentials,
  parseCsvHeader,
  parseCsvRowValues,
  parsedValuesToRow,
  type UploadCsvColumn
} from './upload-requirements'

export interface CsvPreflightRow {
  line: number
  login: string
  password: string
  loginPassword?: string
  emailLogin?: string
  cookies?: string
  proxy?: string
  tfaSecret?: string
  title?: string
  titleEn?: string
  price?: number
  mafile?: string
  resellItemId?: number
  errors: string[]
}

export interface CsvPreflightResult {
  valid: boolean
  rows: CsvPreflightRow[]
  duplicateLogins: string[]
  summary: { total: number; ok: number; errors: number; duplicates: number }
}

function rowFromValues(values: Record<UploadCsvColumn, string>): Omit<CsvPreflightRow, 'line' | 'errors'> {
  const parsed = parsedValuesToRow(values)
  return {
    login: parsed.login,
    password: parsed.password,
    loginPassword: parsed.loginPassword,
    emailLogin: parsed.emailLogin,
    cookies: parsed.cookies,
    proxy: parsed.proxy,
    tfaSecret: parsed.tfaSecret,
    title: parsed.title,
    titleEn: parsed.titleEn,
    price: parsed.price,
    mafile: parsed.mafile,
    resellItemId: parsed.resellItemId
  }
}

export function validateUploadCsv(
  csvText: string,
  knownDuplicates: Set<string>,
  category = 'steam'
): CsvPreflightResult {
  const lines = csvText.trim().split('\n')
  const rows: CsvPreflightRow[] = []
  const seenLogins = new Map<string, number>()
  const duplicateLogins: string[] = []
  const requirements = getCategoryUploadRequirements(category)

  if (lines.length < 2) {
    return {
      valid: false,
      rows: [{ line: 1, login: '', password: '', errors: ['empty_file'] }],
      duplicateLogins: [],
      summary: { total: 0, ok: 0, errors: 1, duplicates: 0 }
    }
  }

  const columns = parseCsvHeader(lines[0])
  const hasLoginPasswordCol = columns.includes('login_password')
  if (!hasLoginPasswordCol && (!columns.includes('login') || !columns.includes('password'))) {
    return {
      valid: false,
      rows: [{ line: 1, login: '', password: '', errors: ['bad_header'] }],
      duplicateLogins: [],
      summary: { total: 0, ok: 0, errors: 1, duplicates: 0 }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCsvRowValues(line, columns)
    const parsed = rowFromValues(values)
    const errors: string[] = []

    if (!hasValidCredentials(parsed)) errors.push('missing_credentials')
    if (parsed.login && parsed.login.length < 2 && !parsed.loginPassword) errors.push('login_too_short')
    if (parsed.password && parsed.password.length < 2 && !parsed.loginPassword) errors.push('password_too_short')

    if (requirements.requiresEmailLogin && !parsed.emailLogin) {
      errors.push('missing_email_login')
    }
    if (values.resell_item_id && !parsed.resellItemId) {
      errors.push('invalid_resell_item_id')
    }
    if (values.price && !parsed.price) {
      errors.push('invalid_price')
    }
    if (parsed.mafile) {
      try {
        JSON.parse(parsed.mafile)
      } catch {
        errors.push('invalid_mafile_json')
      }
    }

    const dedupeKey = parsed.loginPassword ?? parsed.login
    if (dedupeKey) {
      if (seenLogins.has(dedupeKey)) {
        errors.push('duplicate_in_csv')
        duplicateLogins.push(dedupeKey)
      } else {
        seenLogins.set(dedupeKey, i + 1)
      }
      if (knownDuplicates.has(parsed.login) && parsed.login) errors.push('duplicate_history')
    }

    rows.push({ line: i + 1, ...parsed, errors })
  }

  const ok = rows.filter((r) => r.errors.length === 0).length
  const errors = rows.filter((r) => r.errors.length > 0).length

  return {
    valid: errors === 0,
    rows,
    duplicateLogins: [...new Set(duplicateLogins)],
    summary: { total: rows.length, ok, errors, duplicates: duplicateLogins.length }
  }
}
