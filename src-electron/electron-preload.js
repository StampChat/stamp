/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 */

import { contextBridge, ipcRenderer, shell } from 'electron'
import { BrowserWindow } from '@electron/remote'

contextBridge.exposeInMainWorld('badge',
  {
    updateBadge: (unread) => {
      ipcRenderer.sendSync('update-badge', 1)
    },
    setBadgeCount (count) {
      // remote.app.setBadgeCount(unread)
    }
  }
)

contextBridge.exposeInMainWorld('myWindowAPI', {
  minimize () {
    BrowserWindow.getFocusedWindow().minimize()
  },

  toggleMaximize () {
    const win = BrowserWindow.getFocusedWindow()

    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  },

  close () {
    BrowserWindow.getFocusedWindow().close()
  }
})

contextBridge.exposeInMainWorld('url',
  {
    open: (url) => {
      shell.openExternal(url);
    },
  }
)