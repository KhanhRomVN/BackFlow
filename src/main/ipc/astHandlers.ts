import { ipcMain } from 'electron'
import { analyzeProjectSymbols, ASTParser, CodeStructure, ProjectSymbol } from '../utils/astParser'
import { getGoFilesRecursive } from '../utils/apiFlowUtils'

export function registerASTHandlers() {
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  })

  ipcMain.handle('ast:getDuplicateSymbols', async (_, projectPath: string) => {
    try {
      const symbols = await analyzeProjectSymbols(projectPath)
      const duplicates: { [key: string]: ProjectSymbol[] } = {}

      // Group symbols by name and type
      const symbolMap = new Map<string, ProjectSymbol[]>()

      symbols.forEach((symbol) => {
        const key = `${symbol.type}:${symbol.name}`
        if (!symbolMap.has(key)) {
          symbolMap.set(key, [])
        }
        symbolMap.get(key)!.push(symbol)
      })

      // Find duplicates (more than one occurrence)
      symbolMap.forEach((symbols, key) => {
        if (symbols.length > 1) {
          duplicates[key] = symbols
        }
      })

      return {
        success: true,
        duplicates
      }
    } catch (error) {
      console.error('Error finding duplicate symbols:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
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
