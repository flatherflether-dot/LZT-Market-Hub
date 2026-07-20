import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { LoadedModule, ModuleLoaderContribution, ModuleManifest } from './module-types'

const manifestModules = import.meta.glob<{ default: ModuleManifest }>(
  '../modules/*/manifest.ts',
  { eager: true }
)

const loaderModules = import.meta.glob<{ default: ModuleLoaderContribution }>(
  '../modules/*/loader.ts',
  { eager: true }
)

const styleModules = import.meta.glob('../modules/*/styles.css', { eager: true })

const lazyPageCache = new Map<string, LazyExoticComponent<ComponentType>>()

export function getLazyPage(mod: LoadedModule): LazyExoticComponent<ComponentType> {
  let Page = lazyPageCache.get(mod.id)
  if (!Page) {
    Page = lazy(mod.loadPage)
    lazyPageCache.set(mod.id, Page)
  }
  return Page
}

function folderFromPath(globPath: string): string {
  const match = globPath.match(/\/modules\/([^/]+)\//)
  return match?.[1] ?? 'unknown'
}

function normalizeManifest(folder: string, manifest: ModuleManifest): LoadedModule {
  const id = manifest.id ?? folder
  return {
    ...manifest,
    id,
    folder,
    defaultEnabled: manifest.defaultEnabled !== false,
    order: manifest.order ?? 100
  }
}

const ALL_MODULES: LoadedModule[] = Object.entries(manifestModules)
  .filter(([path]) => !folderFromPath(path).startsWith('_'))
  .map(([path, mod]) => normalizeManifest(folderFromPath(path), mod.default))
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))

export const OPTIONAL_MODULES = ALL_MODULES.filter((m) => m.optional)
export const CORE_MODULES = ALL_MODULES.filter((m) => !m.optional)

export function getAllModules(): LoadedModule[] {
  return ALL_MODULES
}

export function getModuleById(id: string): LoadedModule | undefined {
  return ALL_MODULES.find((m) => m.id === id)
}

export function getModuleByFolder(folder: string): LoadedModule | undefined {
  return ALL_MODULES.find((m) => m.folder === folder)
}

const LOADER_BY_MODULE_ID = new Map<string, ModuleLoaderContribution>(
  Object.entries(loaderModules)
    .filter(([path]) => !folderFromPath(path).startsWith('_'))
    .map(([path, mod]) => [folderFromPath(path), mod.default] as const)
    .map(([folder, contribution]) => {
      const manifest = ALL_MODULES.find((m) => m.folder === folder)
      return manifest ? ([manifest.id, contribution] as const) : null
    })
    .filter((entry): entry is [string, ModuleLoaderContribution] => entry !== null)
)

export function getModuleLoaderContribution(moduleId: string): ModuleLoaderContribution | undefined {
  return LOADER_BY_MODULE_ID.get(moduleId)
}

export function loadModuleStyles(): void {
  for (const path of Object.keys(styleModules)) {
    if (folderFromPath(path).startsWith('_')) continue
    void styleModules[path]
  }
}

export function getDefaultModulesEnabled(): Record<string, boolean> {
  return Object.fromEntries(OPTIONAL_MODULES.map((m) => [m.id, m.defaultEnabled !== false]))
}

export function getActivityModuleOrder(): readonly string[] {
  return [...OPTIONAL_MODULES.map((m) => m.id), 'tools', 'settings', 'dashboard']
}
