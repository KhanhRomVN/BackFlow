import { ipcMain, BrowserWindow } from 'electron'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import {
  getGoFiles,
  extractFunctions,
  extractFunctionCalls,
  resolveCallTargets,
  findGoDefinition,
  findSymbolInProject,
  getProjectRoot,
  extractRoutesFromContent
} from '../utils/goUtils'
import {
  discoverAPIRoutesInternal,
  traceCompleteDataFlow,
  discoverRoutesInFile,
  getGoFilesRecursive
} from '../utils/apiFlowUtils'

// Types
interface CallGraph {
  functions: any[]
  calls: any[]
}

interface APIRoute {
  id: string
  method: string
  path: string
  handler: string
  handlerFile: string
  handlerLine: number
  middleware?: string[]
  codeSnippet?: string
}

export function registerGoHandlers(mainWindow: BrowserWindow | null) {
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

  // API Flow Tracer - Discover API Routes
  ipcMain.handle('go:discoverAPIRoutes', async (_, projectPath: string) => {
    try {
      const routes: APIRoute[] = []

      // Recursively find Go files in the project
      const goFiles = await getGoFilesRecursive(projectPath)

      for (const filePath of goFiles) {
        const content = readFileSync(filePath, 'utf-8')
        const relativePath = filePath.replace(projectPath, '').substring(1)

        // Extract package name
        const packageMatch = content.match(/^package\s+(\w+)/m)
        const packageName = packageMatch ? packageMatch[1] : 'main'

        // Discover routes using multiple patterns
        const fileRoutes = await discoverRoutesInFile(content, filePath, relativePath, packageName)
        routes.push(...fileRoutes)
      }

      // Remove duplicates and sort
      const uniqueRoutes = routes.filter(
        (route, index, self) =>
          index === self.findIndex((r) => r.method === route.method && r.path === route.path)
      )

      console.log(`Discovered ${uniqueRoutes.length} API routes in project`)
      return uniqueRoutes
    } catch (error) {
      console.error('Error discovering API routes:', error)
      throw new Error(`Error discovering API routes: ${error}`)
    }
  })

  // API Flow Tracer - Trace API Data Flow
  ipcMain.handle('go:traceAPIFlow', async (_, { projectPath, routeId }) => {
    try {
      // Find the specific route
      const allRoutes = await discoverAPIRoutesInternal(projectPath)
      const targetRoute = allRoutes.find((r) => r.id === routeId)

      if (!targetRoute) {
        throw new Error(`Route with ID ${routeId} not found`)
      }

      console.log(`Tracing data flow for: ${targetRoute.method} ${targetRoute.path}`)

      // Trace the complete data flow
      const flowData = await traceCompleteDataFlow(projectPath, targetRoute)

      return {
        route: targetRoute,
        nodes: flowData.nodes,
        edges: flowData.edges
      }
    } catch (error) {
      console.error('Error tracing API flow:', error)
      throw new Error(`Error tracing API flow: ${error}`)
    }
  })

  // Main flow structure analyzer
  ipcMain.handle('go:analyzeMainFlow', async (_, projectPath: string) => {
    try {
      const mainFlowStructure = {
        mainFile: '',
        routerFile: '',
        handlers: [] as string[],
        routes: [] as any[],
        middlewares: [] as string[]
      }

      // Recursively find files
      const findFiles = async (dirPath: string) => {
        try {
          const items = readdirSync(dirPath, { withFileTypes: true })

          for (const item of items) {
            const fullPath = join(dirPath, item.name)

            if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'vendor') {
              await findFiles(fullPath)
            } else if (item.isFile() && item.name.endsWith('.go')) {
              const content = readFileSync(fullPath, 'utf-8')

              // Check for main function
              if (content.includes('func main()') || content.includes('func main(')) {
                mainFlowStructure.mainFile = fullPath
              }

              // Check for router patterns
              if (
                content.includes('mux.Handle') ||
                content.includes('router') ||
                content.includes('NewRouter')
              ) {
                mainFlowStructure.routerFile = fullPath

                // Extract routes
                const routes = extractRoutesFromContent(content)
                mainFlowStructure.routes.push(...routes)
              }

              // Check for handlers
              if (fullPath.includes('handler') || content.includes('http.ResponseWriter')) {
                mainFlowStructure.handlers.push(fullPath)
              }

              // Check for middleware
              if (fullPath.includes('middleware') || content.includes('http.Handler')) {
                mainFlowStructure.middlewares.push(fullPath)
              }
            }
          }
        } catch (error) {
          console.error(`Error reading directory ${dirPath}:`, error)
        }
      }

      await findFiles(projectPath)

      return mainFlowStructure
    } catch (error) {
      throw new Error(`Error analyzing main flow: ${error}`)
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

  ipcMain.handle('go:findSymbolUsage', async (_, { projectPath, symbolName, filePath }) => {
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
