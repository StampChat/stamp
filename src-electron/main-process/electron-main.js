import { app, BrowserWindow, nativeImage, nativeTheme, Tray, Menu } from 'electron'
const path = require('path')

// Enable single instance lock
const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  app.quit()
}

try {
  if (process.platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = require('path').join(__dirname, 'statics').replace(/\\/g, '\\\\')
}

function getNativeIconPath () {
  switch (process.platform) {
    case 'linux':
      return path.join(__dirname, '../icons/icon.png')
    case 'darwin':
      return path.join(__dirname, '../stamp.icns')
    case 'win32':
      return path.join(__dirname, '../icons/icon.ico')
  }
}

function getNativeTrayIcon (path) {
  const fullsizeImage = nativeImage.createFromPath(path)
  switch (process.platform) {
    case 'linux':
      return fullsizeImage.resize({ width: 18, height: 18 })
    case 'darwin':
      return fullsizeImage.resize({ width: 18, height: 18 })
    case 'win32':
      return fullsizeImage.resize({ width: 18, height: 18 })
  }
}

let mainWindow
let tray = null

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

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    useContentSize: true,
    icon: getNativeIconPath(),
    webPreferences: {
      // Change from /quasar.conf.js > electron > nodeIntegration;
      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: QUASAR_NODE_INTEGRATION,
      nodeIntegrationInWorker: QUASAR_NODE_INTEGRATION

      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      // preload: path.resolve(__dirname, 'electron-preload.js')
    }
  })

  tray = new Tray(getNativeTrayIcon(path.join(__dirname, '../icons/icon.png')))
  tray.setContextMenu(contextMenu)

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('close', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('closed', function () {
    mainWindow = null
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
