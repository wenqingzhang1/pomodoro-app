import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell } from 'electron'
import path from 'path'

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'
type TimerStatus = 'idle' | 'running' | 'paused'
type TimerCommand = 'start' | 'pause' | 'reset'

interface TrayStatus {
  mode: TimerMode
  status: TimerStatus
  timeLabel: string
}

const MODE_LABELS: Record<TimerMode, string> = {
  focus: '专注',
  shortBreak: '短休',
  longBreak: '长休',
}

const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: '已就绪',
  running: '进行中',
  paused: '已暂停',
}

const VITE_DEV_URL = process.env.VITE_DEV_SERVER_URL
const FALLBACK_TRAY_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVQ4T2NkYPj/n4EBBJgYKAQMowYMQwMGhgYMDIMeDAwMDBS7gZFBiICBgd4AAOcLBfFqGJt5AAAAAElFTkSuQmCC'
const TRAY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#b98574" d="M16 7c7.2 0 12 4.6 12 11.1C28 25 23.1 29 16 29S4 25 4 18.1C4 11.6 8.8 7 16 7Z"/><path fill="#70866f" d="M16 8c-3.3 0-5.6-2-6.8-4.4 2.7-.6 5.3.1 6.8 2 1.5-1.9 4.1-2.6 6.8-2C21.6 6 19.3 8 16 8Z"/><path fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2" d="M16 12v6l4 2"/></svg>`

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isAlwaysOnTop = false
let isQuitting = false
let trayStatus: TrayStatus = { mode: 'focus', status: 'idle', timeLabel: '25:00' }

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function sendTimerCommand(command: TimerCommand) {
  showWindow()
  mainWindow?.webContents.send('timer-command', command)
}

function setAlwaysOnTop(value: boolean): boolean {
  isAlwaysOnTop = value
  mainWindow?.setAlwaysOnTop(value)
  mainWindow?.webContents.send('always-on-top-changed', value)
  refreshTray()
  return value
}

function createTrayIcon() {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(TRAY_ICON_SVG)}`
  const svgIcon = nativeImage.createFromDataURL(dataUrl)
  return svgIcon.isEmpty() ? nativeImage.createFromDataURL(FALLBACK_TRAY_ICON) : svgIcon.resize({ width: 16, height: 16 })
}

function refreshTray() {
  if (!tray) return
  const modeLabel = MODE_LABELS[trayStatus.mode]
  const statusLabel = STATUS_LABELS[trayStatus.status]
  const isRunning = trayStatus.status === 'running'
  tray.setToolTip(`${trayStatus.timeLabel} · ${modeLabel} · ${statusLabel}`)
  if (process.platform === 'darwin') tray.setTitle(trayStatus.timeLabel)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `${trayStatus.timeLabel}  ${modeLabel} · ${statusLabel}`, enabled: false },
    { type: 'separator' },
    { label: '显示番茄钟', click: showWindow },
    {
      label: isRunning ? '暂停计时' : '开始计时',
      click: () => sendTimerCommand(isRunning ? 'pause' : 'start'),
    },
    { label: '重置当前计时', click: () => sendTimerCommand('reset') },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (item) => setAlwaysOnTop(item.checked),
    },
    { type: 'separator' },
    {
      label: '退出番茄钟',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    minWidth: 320,
    minHeight: 460,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    center: true,
    alwaysOnTop: isAlwaysOnTop,
    hasShadow: true,
    icon: path.join(__dirname, '../dist/icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  if (VITE_DEV_URL) void mainWindow.loadURL(VITE_DEV_URL)
  else void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedUrl = VITE_DEV_URL ?? `file://${path.join(__dirname, '../dist/index.html')}`
    if (!url.startsWith(allowedUrl)) event.preventDefault()
  })
}

function createTray() {
  tray = new Tray(createTrayIcon())
  refreshTray()
  tray.on('click', () => {
    if (mainWindow?.isVisible()) mainWindow.hide()
    else showWindow()
  })
}

function registerIpc() {
  ipcMain.handle('toggle-always-on-top', () => setAlwaysOnTop(!isAlwaysOnTop))
  ipcMain.handle('get-always-on-top', () => isAlwaysOnTop)
  ipcMain.on('hide-window', () => mainWindow?.hide())
  ipcMain.on('update-tray-status', (_event, value: unknown) => {
    if (!value || typeof value !== 'object') return
    const status = value as Partial<TrayStatus>
    if (!status.mode || !status.status || typeof status.timeLabel !== 'string') return
    if (!(status.mode in MODE_LABELS) || !(status.status in STATUS_LABELS)) return
    trayStatus = { mode: status.mode, status: status.status, timeLabel: status.timeLabel.slice(0, 8) }
    refreshTray()
  })
  ipcMain.handle('show-notification', (_event, value: unknown) => {
    if (!Notification.isSupported() || !value || typeof value !== 'object') return false
    const notification = value as { title?: unknown; body?: unknown }
    if (typeof notification.title !== 'string' || typeof notification.body !== 'string') return false
    const instance = new Notification({
      title: notification.title.slice(0, 80),
      body: notification.body.slice(0, 180),
      silent: true,
    })
    instance.on('click', showWindow)
    instance.show()
    return true
  })
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
  app.on('before-quit', () => { isQuitting = true })
  app.on('activate', () => {
    if (!mainWindow) createWindow()
    else showWindow()
  })
  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') return
    if (isQuitting) app.quit()
  })
  void app.whenReady().then(() => {
    registerIpc()
    createWindow()
    createTray()
  })
}
