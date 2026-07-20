import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useTranslation, type TranslationKey } from '@core/i18n'
import { getModuleDefinition } from '@core/module-registry'
import { useModuleEnabled } from '@core/modules-store'
import { notify } from '@core/ui-store'

interface ModuleRouteProps {
  moduleId: string
  children: React.ReactNode
}

export function ModuleRoute({ moduleId, children }: ModuleRouteProps): React.ReactNode {
  const enabled = useModuleEnabled(moduleId)
  const { t } = useTranslation()
  const location = useLocation()
  const notified = useRef(false)

  useEffect(() => {
    if (enabled) {
      notified.current = false
      return
    }
    if (notified.current) return
    notified.current = true
    const def = getModuleDefinition(moduleId)
    if (def) {
      notify(t('modules.disabledTitle'), t('modules.disabledRoute', { name: t(def.navKey as TranslationKey) }), 'info')
    }
  }, [enabled, moduleId, t])

  if (!enabled) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}
