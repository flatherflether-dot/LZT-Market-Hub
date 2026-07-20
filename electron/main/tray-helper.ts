import { Menu, Tray, BrowserWindow } from 'electron'
import { isMonitorRunning } from './monitor'
import { getTrayIcon } from './app-icon'

let trayRef: Tray | null = null
let windowRef: (() => BrowserWindow | null) | null = null
let quitHandler: (() => void) | null = null

export function initTrayHelper(
  tray: Tray,
  getWindow: () => BrowserWindow | null,
  onQuit: () => void
): void {
  trayRef = tray
  windowRef = getWindow
  quitHandler = onQuit
  updateTrayMenu()
}

export function updateTrayMenu(): void {
  if (!trayRef) return
  const running = isMonitorRunning()
  trayRef.setToolTip(running ? 'LZT Market Hub — мониторинг вкл' : 'LZT Market Hub — мониторинг выкл')
  trayRef.setImage(getTrayIcon(running))

  trayRef.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: running ? '● Мониторинг: вкл' : '○ Мониторинг: выкл',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Открыть окно',
        click: () => {
          const win = windowRef?.()
          win?.show()
          win?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Выход',
        click: () => quitHandler?.()
      }
    ])
  )
}
