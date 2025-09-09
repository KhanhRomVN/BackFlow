import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { copyDirectoryRecursive, updateProjectReferences } from '../utils/fileUtils'

export function registerProjectHandlers(mainWindow: BrowserWindow | null) {
  // Project creation handler
  ipcMain.handle('project:create', async (_, { parentPath, projectName }) => {
    try {
      const templatePath = join(__dirname, '../../template/domain_centric_microservice')
      const projectPath = join(parentPath, projectName)

      // Check if project already exists
      if (existsSync(projectPath)) {
        throw new Error(`Project "${projectName}" already exists in this location.`)
      }

      // Create project directory
      mkdirSync(projectPath, { recursive: true })

      // Copy template files recursively
      copyDirectoryRecursive(templatePath, projectPath)

      // Update all references from domain_centric_microservice to new project name
      await updateProjectReferences(projectPath, projectName)

      return true
    } catch (error) {
      console.error('Error creating project:', error)
      throw new Error(`Failed to create project: ${(error as Error).message}`)
    }
  })
}
