import { Outlet } from 'react-router-dom'
import { SidebarNav } from '@components/SidebarNav'
import { AuthModal } from '@components/AuthModal'
import { OnboardingWizard } from '@components/OnboardingWizard'
import { ErrorBoundary } from '@components/ErrorBoundary'

export function AppLayout(): React.ReactNode {
  return (
    <div className="app-shell">
      <div className="app-body">
        <SidebarNav />

        <div className="app-main">
          <div className="app-frame">
            <main className="main-content">
              <ErrorBoundary label="Page failed to render">
                <div className="route-transition">
                  <Outlet />
                </div>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </div>

      <AuthModal />
      <OnboardingWizard />
    </div>
  )
}
