/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { app, BrowserWindow, nativeTheme, Tray, Menu, shell, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import Badge from 'electron-windows-badge'
import { initialize, enable } from '@electron/remote/main'

// required for custom qbar
initialize()

// Enable single instance lock
const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  app.quit()
}

try {
  if (process.platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    fs.unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
  }
  // eslint-disable-next-line no-empty
} catch (_) { }

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = __dirname
}

function getIconPNGPath () {
  // NOTE: This use to be platform specific, and may need to be again in the future.
  return path.join(__dirname, '../icons/linux-512x512.png')
}

let mainWindow
let externalUrlWindow
let tray
let windowsBadgeUpdater
const nativeIconSmall = nativeImage.createFromPath(getIconPNGPath()).resize({ width: 16, height: 16 })
const nativeIcon = nativeImage.createFromPath(getIconPNGPath())

function createWindow () {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Stamp',
      click: function () {
        mainWindow.show()
      }
    },
    {
      label: 'Quit Stamp',
      click: function () {
        mainWindow.destroy()
        app.quit()
      }
    }
  ])

  tray = new Tray(nativeIconSmall)
  tray.setContextMenu(contextMenu)

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    icon: nativeIcon,
    frame: false,
    useContentSize: true,
    webPreferences: {
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
      contextIsolation: true,
      nodeIntegration: true,
      enableRemoteModule: true,
    }
  })

  // custom qbar enabler
  enable(mainWindow.webContents)

  windowsBadgeUpdater = new Badge(mainWindow, {})

  mainWindow.loadURL(process.env.APP_URL)
  mainWindow.setMenuBarVisibility(false)

  let forceQuit = false
  if (process.platform === 'darwin') {
    app.on('before-quit', function () {
      forceQuit = true
    })
  }

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('close', function (event) {
    if (forceQuit) {
      return
    }
    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    externalUrlWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      icon: nativeIcon,
      frame: true,
      useContentSize: true,
      webPreferences: {
        preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
        contextIsolation: true,
        nodeIntegration: true,
        enableRemoteModule: true,
      }
    })
    externalUrlWindow.loadURL(url)
    return { action: 'deny' }
  })
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
