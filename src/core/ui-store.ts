import { create } from 'zustand'

interface UiState {
  authModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  authModalOpen: false,
  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false })
}))

export function notify(
  _title: string,
  _body?: string,
  _kind?: 'success' | 'error' | 'info',
  _meta?: { module?: string; action?: string; params?: Record<string, string> }
): void {

}
