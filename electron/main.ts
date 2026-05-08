import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isAlwaysOnTop = false
let isQuitting = false

const VITE_DEV_URL = process.env.VITE_DEV_SERVER_URL

function toggleOnTop(): boolean {
  isAlwaysOnTop = !isAlwaysOnTop
  mainWindow?.setAlwaysOnTop(isAlwaysOnTop)
  return isAlwaysOnTop
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    resizable: false,
    frame: false,
    transparent: true,
    center: true,
    alwaysOnTop: isAlwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_URL) {
    mainWindow.loadURL(VITE_DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVQ4T2NkYPj/n4EBBJgYKAQMowYMQwMGhgYMDIMeDAwMDBS7gZFBiICBgd4AAOcLBfFqGJt5AAAAAElFTkSuQmCC'
  )

  tray = new Tray(icon)
  tray.setToolTip('番茄钟')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (menuItem) => {
        toggleOnTop()
        menuItem.checked = isAlwaysOnTop
        mainWindow?.webContents.send('always-on-top-changed', isAlwaysOnTop)
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

app.on('ready', () => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('toggle-always-on-top', () => toggleOnTop())

ipcMain.handle('get-always-on-top', () => isAlwaysOnTop)
