import { app, BrowserWindow, nativeTheme, Tray, Menu } from 'electron'
const path = require('path')

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

let mainWindow
let tray = null

function createWindow () {
  /**
   * Initial window options
   */
  const iconPath = path.join(__dirname, '../icons/icon.png')
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    useContentSize: true,
    icon: iconPath,
    webPreferences: {
      // Change from /quasar.conf.js > electron > nodeIntegration;
      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: QUASAR_NODE_INTEGRATION,
      nodeIntegrationInWorker: true

      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      // preload: path.resolve(__dirname, 'electron-preload.js')
    }
  })

  mainWindow.loadURL(process.env.APP_URL)

  let contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open IRCash',
      click: function () {
        mainWindow.show()
      }
    },
    {
      label: 'Quit IRCash',
      click: function () {
        mainWindow.destroy()
        app.quit()
      }
    }
  ])

  if (process.platform === 'darwin') {
    app.dock.setMenu(contextMenu)
  } else {
    tray = new Tray(iconPath)
  }

  mainWindow.on('close', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

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
