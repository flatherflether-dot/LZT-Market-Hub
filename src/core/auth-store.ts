import { create } from 'zustand'
import { getApiClient, initApiClient, LztApiError } from '@core/api-client'
import type { ProfileResponse } from '@core/constants'

export interface UserProfile {
  username: string
  userId: number | null
  avatarUrl: string | null
  profileUrl: string | null
  balance: number
  hold: number
  activeItems: number
  soldItems: number
}

interface Account {
  id: number
  name: string
  is_active: number
  created_at: string
}

interface AuthState {
  account: Account | null
  token: string | null
  profile: UserProfile | null
  profileLoading: boolean
  isLoading: boolean
  error: string | null
  loadAccount: () => Promise<void>
  addAccount: (token: string) => Promise<void>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  hydrate: () => Promise<void>
}

async function fetchForumProfile(token: string): Promise<{ avatarUrl: string | null; profileUrl: string | null }> {
  try {
    const data = (await window.api.market.getForumProfile(token)) as {
      user?: {
        user_id?: number
        links?: { avatar_small?: string; avatar?: string; permalink?: string; detail?: string }
      }
    } | null
    if (!data?.user) return { avatarUrl: null, profileUrl: null }
    return {
      avatarUrl: data.user.links?.avatar_small ?? data.user.links?.avatar ?? null,
      profileUrl: data.user.links?.permalink ?? data.user.links?.detail ?? null
    }
  } catch {
    return { avatarUrl: null, profileUrl: null }
  }
}

function parseMarketProfile(data: ProfileResponse): Omit<UserProfile, 'avatarUrl' | 'profileUrl'> {
  const user = data.user as ProfileResponse['user'] & { balance?: number; hold?: number }
  return {
    username: user?.username ?? 'User',
    userId: user?.user_id ?? null,
    balance: data.balance?.balance ?? user?.balance ?? 0,
    hold: data.balance?.hold ?? user?.hold ?? 0,
    activeItems: data.items?.active ?? 0,
    soldItems: data.items?.sold ?? 0
  }
}

async function resolveUsername(token: string): Promise<string> {
  initApiClient(() => token)
  const { data } = await getApiClient().getProfile<ProfileResponse>()
  return parseMarketProfile(data).username
}

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  token: null,
  profile: null,
  profileLoading: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    const token = await window.api.db.getActiveToken()
    set({ token })
    initApiClient(() => get().token)
    await get().loadAccount()
  },

  loadAccount: async () => {
    set({ isLoading: true, error: null })
    try {
      const accounts = await window.api.db.getAccounts()
      const token = await window.api.db.getActiveToken()
      initApiClient(() => token)
      set({
        account: accounts[0] ?? null,
        token,
        isLoading: false
      })
      await get().fetchProfile()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load account', isLoading: false })
    }
  },

  fetchProfile: async () => {
    const token = get().token
    if (!token) {
      set({ profile: null, profileLoading: false })
      return
    }

    set({ profileLoading: true })
    try {
      const { data } = await getApiClient().getProfile<ProfileResponse>()
      const parsed = parseMarketProfile(data)
      const forum = await fetchForumProfile(token)
      const profileUrl =
        forum.profileUrl ??
        (parsed.userId ? `https://lzt.market/${parsed.username}/` : null)
      set({
        profile: { ...parsed, avatarUrl: forum.avatarUrl, profileUrl },
        profileLoading: false
      })
    } catch (e) {
      set({
        profile: null,
        profileLoading: false,
        error: e instanceof LztApiError ? e.message : get().error
      })
    }
  },

  addAccount: async (token) => {
    const previousToken = get().token
    set({ isLoading: true, error: null })

    try {
      const username = await resolveUsername(token)
      await window.api.db.addAccount(username, token)
      initApiClient(() => token)
      const accounts = await window.api.db.getAccounts()
      set({
        token,
        account: accounts[0] ?? null,
        isLoading: false
      })
      await window.api.db.logActivity('tools', 'account_added', username)
      await get().fetchProfile()
    } catch (e) {
      initApiClient(() => previousToken)
      const message = e instanceof LztApiError ? e.message : e instanceof Error ? e.message : 'Invalid token'
      set({ isLoading: false, error: message })
      throw e
    }
  },

  logout: async () => {
    await window.api.db.logout()
    initApiClient(() => null)
    set({ token: null, account: null, profile: null, error: null })
    await window.api.db.logActivity('tools', 'logout')
  }
}))
