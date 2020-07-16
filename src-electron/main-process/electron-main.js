import { app, BrowserWindow, nativeTheme, Tray, Menu, shell, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import Badge from 'electron-windows-badge'

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
let tray
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let windowsBadgeUpdater
const nativeIcon = nativeImage.createFromPath(getIconPNGPath()).resize({ width: 16, height: 16 })

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

  tray = new Tray(nativeIcon)
  tray.setContextMenu(contextMenu)

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: process.env.QUASAR_NODE_INTEGRATION,
      nodeIntegrationInWorker: process.env.QUASAR_NODE_INTEGRATION
    }
  })

  windowsBadgeUpdater = new Badge(mainWindow, {})

  mainWindow.loadURL(process.env.APP_URL)

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

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url !== e.sender.getURL()) {
      e.preventDefault()
      shell.openExternal(url)
    }
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
