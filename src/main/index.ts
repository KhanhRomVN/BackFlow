import * as dotenv from 'dotenv'
dotenv.config()
import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerFsHandlers } from './ipc/fsHandlers'
import { registerEditorHandlers } from './ipc/editorHandlers'
import { registerProjectHandlers } from './ipc/projectHandlers'
import { registerASTHandlers } from './ipc/astHandlers'
import { registerGoHandlers } from './ipc/goHandlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])

    mainWindow.webContents.on('did-fail-load', () => {
      if (mainWindow) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
      }
    })

    if (is.dev && mainWindow) {
      mainWindow.webContents.on('did-finish-load', () => {
        if (mainWindow) {
          mainWindow.blur()
          mainWindow.webContents.openDevTools({ mode: 'detach' })
        }
      })
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register all IPC handlers
function registerAllHandlers() {
  registerFsHandlers(mainWindow)
  registerGoHandlers()
  registerEditorHandlers(mainWindow)
  registerProjectHandlers()
  registerASTHandlers()
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  registerAllHandlers()

  if (is.dev) {
    app.on('activate', () => {
      if (mainWindow === null) {
        createWindow()
        registerAllHandlers()
      }
    })

    if (mainWindow) {
      mainWindow.webContents.on('destroyed', () => {
        mainWindow = null
      })
    }
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      registerAllHandlers()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
