import type { TranslationKey } from './i18n'

const ERROR_KEYS: Record<string, TranslationKey> = {
  empty_file: 'upload.preflight.emptyFile',
  bad_header: 'upload.preflight.badHeader',
  missing_login: 'upload.preflight.missingLogin',
  missing_password: 'upload.preflight.missingPassword',
  missing_credentials: 'upload.preflight.missingCredentials',
  login_too_short: 'upload.preflight.loginTooShort',
  password_too_short: 'upload.preflight.passwordTooShort',
  missing_email_login: 'upload.preflight.missingEmailLogin',
  duplicate_in_csv: 'upload.preflight.duplicateInCsv',
  duplicate_history: 'upload.preflight.duplicateHistory',
  invalid_resell_item_id: 'upload.preflight.invalidResellId',
  invalid_price: 'upload.preflight.invalidPrice',
  invalid_mafile_json: 'upload.preflight.invalidMafile'
}

const ERROR_FIELDS: Record<string, string> = {
  empty_file: '—',
  bad_header: 'header',
  missing_credentials: 'login/password',
  login_too_short: 'login',
  password_too_short: 'password',
  missing_email_login: 'email_login',
  duplicate_in_csv: 'login',
  duplicate_history: 'login',
  invalid_resell_item_id: 'resell_item_id',
  invalid_price: 'price',
  invalid_mafile_json: 'mafile'
}

export function preflightErrorField(code: string): string {
  return ERROR_FIELDS[code] ?? '—'
}

export function preflightErrorLabel(
  t: (key: TranslationKey) => string,
  code: string
): string {
  const key = ERROR_KEYS[code]
  return key ? t(key) : code
}
