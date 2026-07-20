import { app, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

function resolveIconPath(fileName: string): string | null {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'icons', fileName), join(process.resourcesPath, fileName)]
    : [
        join(__dirname, '../../build', fileName),
        join(process.cwd(), 'build', fileName)
      ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

export function getAppIcon(size?: number): Electron.NativeImage {
  const path = resolveIconPath('icon.png')
  if (!path) return nativeImage.createEmpty()
  const image = nativeImage.createFromPath(path)
  return size ? image.resize({ width: size, height: size }) : image
}

export function getTrayIcon(active = false): Electron.NativeImage {
  const path = resolveIconPath(active ? 'tray-active.png' : 'tray.png')
  if (!path) return getAppIcon(32)
  const image = nativeImage.createFromPath(path)
  return image
}
