import crypto from 'crypto'

export function encryptAes128(plain: string, clientSecret: string): string {
  const key = crypto.createHash('md5').update(clientSecret, 'utf8').digest()
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('base64')
}
