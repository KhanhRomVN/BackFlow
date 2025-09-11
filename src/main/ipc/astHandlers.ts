import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { ASTParser, CodeStructure } from '../utils/astParser'
import { getGoFilesRecursive } from '../utils/apiFlowUtils'

export function registerASTHandlers(mainWindow: BrowserWindow | null) {
  // Handler để phân tích cấu trúc AST của toàn bộ project
  ipcMain.handle('ast:analyzeProject', async (_, projectPath: string) => {
    try {
      const goFiles = await getGoFilesRecursive(projectPath)
      const structures: CodeStructure[] = []

      for (const filePath of goFiles) {
        const structure = ASTParser.parseFile(filePath, projectPath)
        structures.push(structure)
      }

      return {
        success: true,
        structures,
        totalFiles: goFiles.length,
        totalElements: countTotalElements(structures)
      }
    } catch (error) {
      console.error('Error analyzing project AST:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler để phân tích cấu trúc AST của một file cụ thể
  ipcMain.handle('ast:analyzeFile', async (_, { projectPath, filePath }) => {
    try {
      // Use the absolute filePath directly instead of joining with projectPath
      const structure = ASTParser.parseFile(filePath, projectPath)
      return {
        success: true,
        structure
      }
    } catch (error) {
      console.error('Error analyzing file AST:', error)
      return { success: false, error: error.message }
    }
  })
}

function countTotalElements(structures: CodeStructure[]): any {
  let count = {
    files: structures.length,
    imports: 0,
    types: 0,
    constants: 0,
    variables: 0,
    functions: 0,
    structs: 0,
    interfaces: 0
  }

  structures.forEach((structure) => {
    count.imports += structure.imports.length
    count.types += structure.types.length
    count.constants += structure.constants.length
    count.variables += structure.variables.length
    count.functions += structure.functions.length
    count.structs += structure.structs.length
    count.interfaces += structure.interfaces.length
  })

  return count
}
