import { ipcMain } from 'electron'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import {
  getGoFiles,
  extractFunctions,
  extractFunctionCalls,
  resolveCallTargets,
  findGoDefinition,
  findSymbolInProject,
  getProjectRoot
} from '../utils/goUtils'

// Types
interface CallGraph {
  functions: any[]
  calls: any[]
}

export function registerGoHandlers() {
  // Enhanced Go project analyzer with AST parsing simulation
  ipcMain.handle('go:analyzeProject', async (_, projectPath: string) => {
    try {
      const files = readdirSync(projectPath).filter((file) => file.endsWith('.go'))

      const analysisResult = {
        totalFiles: files.length,
        goFiles: files,
        functions: [] as any[],
        dependencies: [] as any[],
        callGraph: {}
      }

      // Simple analysis - in real implementation, use go/ast parser
      files.forEach((file) => {
        const content = readFileSync(join(projectPath, file), 'utf-8')
        const functionMatches = content.match(/func\s+(\w+)\s*\(/g) || []
        analysisResult.functions.push(
          ...functionMatches.map((f) => ({
            name: f.replace('func ', '').replace('(', '').trim(),
            file: file,
            line: content.split('\n').findIndex((line) => line.includes(f)) + 1
          }))
        )
      })

      return analysisResult
    } catch (error) {
      throw new Error(`Error analyzing project: ${error}`)
    }
  })

  // New advanced call graph analyzer
  ipcMain.handle('go:analyzeCallGraph', async (_, projectPath: string) => {
    try {
      const callGraph: CallGraph = {
        functions: [],
        calls: []
      }

      // Get all Go files recursively
      const goFiles = getGoFiles(projectPath)

      // Analyze each file
      for (const filePath of goFiles) {
        const content = readFileSync(filePath, 'utf-8')
        const relativePath = filePath.replace(projectPath, '').substring(1)

        // Extract package name
        const packageMatch = content.match(/^package\s+(\w+)/m)
        const packageName = packageMatch ? packageMatch[1] : 'main'

        // Extract function definitions
        const functions = extractFunctions(content, relativePath, packageName)
        callGraph.functions.push(...functions)

        // Extract function calls
        const calls = extractFunctionCalls(content, relativePath, packageName)
        callGraph.calls.push(...calls)
      }

      // Resolve call targets (find where called functions are defined)
      resolveCallTargets(callGraph)

      console.log(
        `Analyzed ${goFiles.length} Go files, found ${callGraph.functions.length} functions and ${callGraph.calls.length} calls`
      )

      return callGraph
    } catch (error) {
      console.error('Error in go:analyzeCallGraph:', error)
      throw new Error(`Error analyzing call graph: ${error}`)
    }
  })

  ipcMain.handle('go:getDefinition', async (_, { filePath, line, column }) => {
    try {
      console.log('Go definition request:', { filePath, line, column })
      const definition = await findGoDefinition(filePath, line, column)
      console.log('Go definition result:', definition)
      return definition
    } catch (error) {
      console.error('Error getting definition:', error)
      return null
    }
  })

  ipcMain.handle('go:getSymbolInfo', async (_, { filePath, symbol }) => {
    try {
      console.log('Symbol info request:', { filePath, symbol })
      const projectPath = getProjectRoot(filePath)
      const symbolInfo = await findSymbolInProject(projectPath, symbol)
      console.log('Symbol info result:', symbolInfo)
      return symbolInfo
    } catch (error) {
      console.error('Error getting symbol info:', error)
      return null
    }
  })

  ipcMain.handle('go:findSymbolUsage', async (_, { projectPath, symbolName }) => {
    try {
      const goFiles = getGoFiles(projectPath)
      const references = []

      for (const file of goFiles) {
        const content = readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(symbolName)) {
            references.push({
              file: file.replace(projectPath, '').substring(1),
              line: i + 1,
              code: lines[i].trim()
            })
          }
        }
      }

      return references
    } catch (error) {
      console.error('Error finding symbol usage:', error)
      return []
    }
  })
}
