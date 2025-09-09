import { ipcMain, BrowserWindow } from 'electron'

export function registerEditorHandlers(mainWindow: BrowserWindow | null) {
  // Handler to open file in editor
  ipcMain.handle('editor:openFile', async (_, { file, line }) => {
    // Send message to renderer to open file
    mainWindow?.webContents.send('editor:openFileRequested', { file, line })
    return true
  })
}
