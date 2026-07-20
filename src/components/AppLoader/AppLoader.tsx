import { useLoaderStore } from '@core/loader-store'
import { useTranslation } from '@core/i18n'
import { LoaderAuthPanel } from '@components/AppLoader/LoaderAuthPanel'
import { LoaderLogoScene } from '@components/AppLoader/LoaderLogoScene'
import './AppLoader.css'

export function AppLoader(): React.ReactNode {
  const { t } = useTranslation()
  const visible = useLoaderStore((s) => s.visible)
  const exiting = useLoaderStore((s) => s.exiting)
  const running = useLoaderStore((s) => s.running)
  const done = useLoaderStore((s) => s.done)
  const authRequired = useLoaderStore((s) => s.authRequired)
  const progress = useLoaderStore((s) => s.progress)
  const status = useLoaderStore((s) => s.status)
  const detail = useLoaderStore((s) => s.detail)
  const subtitle = useLoaderStore((s) => s.subtitle)
  const stepIndex = useLoaderStore((s) => s.stepIndex)
  const totalSteps = useLoaderStore((s) => s.totalSteps)

  if (!visible) return null

  const loaderClass = ['loader', running && 'is-running', done && 'is-done', authRequired && 'is-auth']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`app-loader-shell${exiting ? ' is-exiting' : ''}`}
      aria-live="polite"
      aria-busy={!done}
    >
      <div className="ambient" aria-hidden="true">
        <div className="ambient-grid" />
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="particle" />
        ))}
      </div>

      <div className={loaderClass}>
        <LoaderLogoScene />

        <div className="meta">
          <div className={`meta-panel${authRequired ? ' meta-panel-auth' : ''}`}>
            {authRequired ? (
              <>
                <div className="meta-head">
                  <span className="meta-badge">LZT</span>
                  <div className="title">{t('loader.appTitle')}</div>
                </div>
                <p className="loader-auth-title">{t('loader.authRequired.title')}</p>
                <LoaderAuthPanel />
              </>
            ) : (
              <>
                <div className="meta-head">
                  <span className="meta-badge">LZT</span>
                  <div className="title">{t('loader.appTitle')}</div>
                </div>
                <div key={subtitle} className="subtitle">
                  {subtitle}
                </div>
                <div className="meta-divider" />
                <div className="status-block">
                  <div className="status-row">
                    <div key={status} className="status">
                      {status}
                    </div>
                  </div>
                  {!done && (
                    <div key={detail} className="status-detail">
                      {detail}
                    </div>
                  )}
                </div>
                <div className="progress-wrap">
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label={t('loader.init.status')}
                  >
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  {totalSteps > 0 && (
                    <div className="step-dots" aria-hidden="true">
                      {Array.from({ length: totalSteps }, (_, i) => (
                        <i key={i} className={i < stepIndex ? 'is-active' : undefined} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="noise" aria-hidden="true" />
    </div>
  )
}
