import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readdirSync, statSync, readFileSync, watch, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { findFileRecursive } from '../utils/fileUtils'

export function registerFsHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: homedir()
    })
    return result
  })

  ipcMain.handle('fs:readDirectory', async (_, path: string) => {
    try {
      const items = readdirSync(path, { withFileTypes: true })
      return items.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: join(path, item.name)
      }))
    } catch (error) {
      throw new Error(`Error reading directory: ${error}`)
    }
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return content
    } catch (error) {
      throw new Error(`Error reading file: ${error}`)
    }
  })

  ipcMain.handle('fs:getFileStats', async (_, filePath: string) => {
    try {
      const stats = statSync(filePath)
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime
      }
    } catch (error) {
      throw new Error(`Error getting file stats: ${error}`)
    }
  })

  ipcMain.handle('fs:findFile', async (_, { projectPath, fileName }) => {
    try {
      console.log(`Searching for file "${fileName}" in project: ${projectPath}`)
      const foundPath = findFileRecursive(projectPath, fileName)
      console.log(`File search result: ${foundPath}`)
      return foundPath
    } catch (error) {
      console.error('Error finding file:', error)
      return null
    }
  })

  ipcMain.handle('fs:resolvePath', async (_, { inputPath, projectPath }) => {
    try {
      console.log(`Resolving path: ${inputPath} in project: ${projectPath}`)
      const { resolvePath } = await import('../utils/fileUtils')
      return resolvePath(inputPath, projectPath)
    } catch (error) {
      console.error('Error resolving path:', error)
      return inputPath
    }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      writeFileSync(filePath, content, 'utf-8')
      return true
    } catch (error) {
      throw new Error(`Error writing file: ${error}`)
    }
  })

  ipcMain.handle('fs:watchDirectory', async (_, path: string) => {
    return new Promise((resolve) => {
      try {
        // Check if recursive watching is supported
        if (typeof watch === 'function') {
          const watcher = watch(path, { recursive: true }, (eventType, filename) => {
            if (filename) {
              mainWindow?.webContents.send('fs:fileChanged', {
                eventType,
                filename,
                fullPath: join(path, filename)
              })
            }
          })
          resolve(true)
          mainWindow?.on('closed', () => {
            watcher.close()
          })
        } else {
          console.warn('Recursive file watching not supported on this platform')
          resolve(false)
        }
      } catch (error) {
        console.error(`Failed to watch directory: ${path}. Error: ${error}`)
        resolve(false)
      }
    })
  })
}
