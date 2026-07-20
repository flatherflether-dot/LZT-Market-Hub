export function isTokenError(message: string): boolean {
  return message.toLowerCase().includes('token')
}

export function formatPaymentTs(ts?: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString()
}
