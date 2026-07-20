import { Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@components/AppLayout'
import { AppLoader } from '@components/AppLoader'
import { ModuleRoute } from '@components/ModuleRoute'
import { finishLoader, useLoaderStore } from '@core/loader-store'
import { CORE_MODULES, getLazyPage, OPTIONAL_MODULES } from '@core/module-loader'
import type { LoadedModule } from '@core/module-types'
import { runStartupPipeline } from '@core/startup-loader'

function PageFallback(): React.ReactNode {
  return <div className="page-loading" aria-busy="true" />
}

function ModulePage({ mod }: { mod: LoadedModule }): React.ReactNode {
  const Page = getLazyPage(mod)
  return <Page />
}

function AppRoutes(): React.ReactNode {
  const dashboard = CORE_MODULES.find((m) => m.id === 'dashboard')
  const shellModules = CORE_MODULES.filter((m) => m.id !== 'dashboard')

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            element={
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            }
          >
            {dashboard && <Route index element={<ModulePage mod={dashboard} />} />}
            {OPTIONAL_MODULES.map((mod) => {
              const path = mod.path.replace(/^\//, '')
              return (
                <Route
                  key={mod.id}
                  path={path}
                  element={
                    <ModuleRoute moduleId={mod.id}>
                      <ModulePage mod={mod} />
                    </ModuleRoute>
                  }
                />
              )
            })}
            {shellModules.map((mod) => {
              const path = mod.path.replace(/^\//, '')
              return (
                <Route key={mod.id} path={path} element={<ModulePage mod={mod} />} />
              )
            })}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App(): React.ReactNode {
  useEffect(() => {
    if (navigator.platform?.toLowerCase().includes('mac')) {
      document.documentElement.classList.add('platform-darwin')
    }

    const session = useLoaderStore.getState().reset()

    void runStartupPipeline(session).catch(async (error) => {
      console.error('[startup] pipeline failed', error)
      if (useLoaderStore.getState().session !== session) return
      if (!useLoaderStore.getState().visible) return
      await finishLoader({ status: 'Ready', subtitle: '' }, session)
    })

    return () => {
      useLoaderStore.getState().invalidate()
    }
  }, [])

  return (
    <>
      <AppRoutes />
      <AppLoader />
    </>
  )
}
