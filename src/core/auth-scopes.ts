export type AuthScopeId = 'market' | 'payment' | 'invoice' | 'basic'

export interface AuthScopeDefinition {
  id: AuthScopeId
  required: boolean
  labelKey: `auth.scopes.${AuthScopeId}`
  descKey: `auth.scopes.${AuthScopeId}Desc`
}

export const AUTH_SCOPES: readonly AuthScopeDefinition[] = [
  {
    id: 'market',
    required: true,
    labelKey: 'auth.scopes.market',
    descKey: 'auth.scopes.marketDesc'
  },
  {
    id: 'payment',
    required: false,
    labelKey: 'auth.scopes.payment',
    descKey: 'auth.scopes.paymentDesc'
  },
  {
    id: 'invoice',
    required: false,
    labelKey: 'auth.scopes.invoice',
    descKey: 'auth.scopes.invoiceDesc'
  },
  {
    id: 'basic',
    required: false,
    labelKey: 'auth.scopes.basic',
    descKey: 'auth.scopes.basicDesc'
  }
] as const

export const REQUIRED_AUTH_SCOPES = AUTH_SCOPES.filter((scope) => scope.required)
export const OPTIONAL_AUTH_SCOPES = AUTH_SCOPES.filter((scope) => !scope.required)

export const RECOMMENDED_OAUTH_SCOPES = 'market payment invoice basic'
