import type { FastSellPayload } from './constants'

export async function encryptUploadPayload(payload: FastSellPayload): Promise<{
  body: Record<string, unknown>
  extraParams: Record<string, string>
}> {
  const body: Record<string, unknown> = { ...payload }
  const extraParams: Record<string, string> = {}

  const secret = (await window.api.db.getSetting('oauth_client_secret'))?.trim()
  if (!secret) return { body, extraParams }

  async function encryptField(field: string, value: string): Promise<void> {
    if (!value) return
    body[field] = await window.api.crypto.encryptAes128(value, secret!)
    extraParams[`${field}_encryption`] = 'aes128'
  }

  if (payload.login_password) {
    await encryptField('login_password', payload.login_password)
  } else {
    if (payload.password) await encryptField('password', payload.password)
    if (payload.login) await encryptField('login', payload.login)
  }

  if (payload.email_login_data) {
    await encryptField('email_login_data', payload.email_login_data)
  }

  return { body, extraParams }
}
