import { app, shell, BrowserWindow, Tray } from 'electron'
import { join } from 'path'
import { appendFileSync, statSync, renameSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase, getActiveToken, getSetting } from './database'
import { initCompetitorWatchlist } from './competitor-service'
import { isModuleEnabled } from './modules-config'
import { registerIpcHandlers } from './ipc'
import { startScheduler } from './scheduler'
import { initTrayHelper } from './tray-helper'
import { initInvoiceWebhookFromSettings } from './invoice-webhook-server'
import { startBackgroundMonitor } from './monitor'
import { getAppIcon, getTrayIcon } from './app-icon'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const MAX_LOG_BYTES = 1024 * 1024

function logMainError(kind: string, error: unknown): void {
  try {
    const logPath = join(app.getPath('userData'), 'main-errors.log')
    try {
      if (statSync(logPath).size > MAX_LOG_BYTES) {
        renameSync(logPath, `${logPath}.1`)
      }
    } catch {
    }
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    appendFileSync(logPath, `[${new Date().toISOString()}] ${kind}: ${message}\n`)
  } catch {
  }
}

process.on('uncaughtException', (error) => logMainError('uncaughtException', error))
process.on('unhandledRejection', (reason) => logMainError('unhandledRejection', reason))

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1110',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: getAppIcon(256),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'crashed' || details.reason === 'oom') {
      mainWindow?.reload()
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showMainWindow(): void {
  mainWindow?.show()
  mainWindow?.focus()
}

function createTray(): void {
  tray = new Tray(getTrayIcon(false))
  initTrayHelper(tray, () => mainWindow, () => {
    isQuitting = true
    app.quit()
  })
  tray.on('click', showMainWindow)
  tray.on('double-click', showMainWindow)
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return
  electronApp.setAppUserModelId('com.lzt.markethub')
  initDatabase(app.getPath('userData'))
  initCompetitorWatchlist()
  registerIpcHandlers()
  startScheduler()
  initInvoiceWebhookFromSettings()
  createWindow()
  createTray()

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(getAppIcon(512))
  }

  if (getSetting('monitor_autostart') === '1' && getActiveToken() && isModuleEnabled('buyer')) {
    startBackgroundMonitor()
  }

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('before-quit', () => { isQuitting = true })

app.on('will-quit', () => {
  closeDatabase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
