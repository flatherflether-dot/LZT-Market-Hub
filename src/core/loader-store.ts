import { create } from 'zustand'

export interface LoaderStepUpdate {
  progress: number
  text: string
  detail: string
  stepIndex: number
  totalSteps: number
}

export interface LoaderFinishPayload {
  status: string
  subtitle: string
}

interface LoaderConfigurePayload {
  subtitle: string
  status: string
  detail: string
  totalSteps: number
}

interface LoaderState {
  session: number
  visible: boolean
  running: boolean
  done: boolean
  exiting: boolean
  authRequired: boolean
  progress: number
  status: string
  detail: string
  subtitle: string
  stepIndex: number
  totalSteps: number
  reset: () => number
  invalidate: () => void
  configure: (payload: LoaderConfigurePayload, session: number) => void
  begin: (session: number) => void
  updateStep: (update: LoaderStepUpdate, session: number) => void
  finish: (payload: LoaderFinishPayload, session: number) => Promise<void>
}

const initialState = {
  session: 0,
  visible: false,
  running: false,
  done: false,
  exiting: false,
  authRequired: false,
  progress: 0,
  status: '',
  detail: '',
  subtitle: '',
  stepIndex: 0,
  totalSteps: 0
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isActiveSession(session: number): boolean {
  return useLoaderStore.getState().session === session
}

let authGateResolver: (() => void) | null = null

export const useLoaderStore = create<LoaderState>((set, get) => ({
  ...initialState,

  reset: () => {
    const session = get().session + 1
    set({ ...initialState, session, visible: true })
    return session
  },

  invalidate: () => {
    set((state) => ({ session: state.session + 1 }))
  },

  configure: (payload, session) => {
    if (!isActiveSession(session)) return
    set({
      subtitle: payload.subtitle,
      status: payload.status,
      detail: payload.detail,
      totalSteps: payload.totalSteps,
      stepIndex: 0,
      progress: 0,
      authRequired: false
    })
  },

  begin: (session) => {
    if (!isActiveSession(session)) return
    set({ running: true, progress: 0, authRequired: false })
  },

  updateStep: (update, session) => {
    if (!isActiveSession(session)) return
    set({
      progress: update.progress,
      status: update.text,
      detail: update.detail,
      stepIndex: update.stepIndex,
      totalSteps: update.totalSteps,
      authRequired: false,
      running: true
    })
  },

  finish: async (payload, session) => {
    if (!isActiveSession(session)) return
    set((state) => ({
      done: true,
      running: false,
      authRequired: false,
      progress: 100,
      status: payload.status,
      subtitle: payload.subtitle,
      detail: '',
      stepIndex: state.totalSteps
    }))
    await delay(650)
    if (!isActiveSession(session)) return
    set({ exiting: true })
    await delay(480)
    if (!isActiveSession(session)) return
    set({ visible: false })
  }
}))

export function configureLoader(payload: LoaderConfigurePayload, session: number): void {
  useLoaderStore.getState().configure(payload, session)
}

export function beginLoaderAnimation(session: number): void {
  useLoaderStore.getState().begin(session)
}

export function reportLoaderStep(update: LoaderStepUpdate, session: number): void {
  useLoaderStore.getState().updateStep(update, session)
}

export async function finishLoader(payload: LoaderFinishPayload, session: number): Promise<void> {
  await useLoaderStore.getState().finish(payload, session)
}

export function showLoaderAtZero(update: LoaderStepUpdate, session: number): Promise<void> {
  useLoaderStore.getState().updateStep({ ...update, progress: 0 }, session)
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function isLoaderAvailable(): boolean {
  return useLoaderStore.getState().visible
}

export function waitForPostLoadAuth(session: number): Promise<void> {
  if (!isActiveSession(session)) {
    return Promise.resolve()
  }
  useLoaderStore.setState((state) => ({
    authRequired: true,
    done: true,
    running: false,
    exiting: false,
    progress: 100,
    status: '',
    detail: '',
    subtitle: '',
    stepIndex: state.totalSteps,
    visible: true
  }))
  return new Promise((resolve) => {
    authGateResolver = () => {
      if (isActiveSession(session)) resolve()
    }
  })
}

export function completeAuthGate(): void {
  useLoaderStore.setState({ authRequired: false })
  authGateResolver?.()
  authGateResolver = null
}
