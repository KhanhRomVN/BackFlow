import * as dotenv from 'dotenv'
dotenv.config()
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  readdirSync,
  statSync,
  readFileSync,
  watch,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync
} from 'fs'
import { homedir } from 'os'

let mainWindow: BrowserWindow | null = null

interface SymbolInfo {
  name: string
  type: 'function' | 'struct' | 'interface' | 'type' | 'variable'
  file: string
  line: number
  signature: string
}

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

// Types for Go analysis
interface FunctionDef {
  name: string
  file: string
  line: number
  package: string
  params: string[]
  returns: string[]
}

interface FunctionCall {
  callerFunc: string
  callerFile: string
  callerLine: number
  calledFunc: string
  calledFile?: string
  calledLine?: number
  package: string
}

interface CallGraph {
  functions: FunctionDef[]
  calls: FunctionCall[]
}

// API Flow Tracer Types
interface APIRoute {
  id: string
  method: string
  path: string
  handler: string
  handlerFile: string
  handlerLine: number
  middleware?: string[]
  codeSnippet?: string // Add this new field
}

interface DataFlowNode {
  id: string
  type: 'route' | 'handler' | 'service' | 'dto' | 'repository' | 'database' | 'external'
  name: string
  file: string
  line?: number
  content?: string
  metadata?: {
    parameters?: string[]
    returnType?: string
    databaseQuery?: string
    tableName?: string
    dtoFields?: string[]
  }
}

interface DataFlowEdge {
  source: string
  target: string
  dataType?: string
  transformation?: string
}

// IPC Handlers
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

// Handler to open file in editor
ipcMain.handle('editor:openFile', async (_, { file, line }) => {
  // Send message to renderer to open file
  mainWindow?.webContents.send('editor:openFileRequested', { file, line })
  return true
})

ipcMain.handle('fs:watchDirectory', async (_, path: string) => {
  return new Promise((resolve) => {
    try {
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

      // Cleanup watcher when window closes
      mainWindow?.on('closed', () => {
        watcher.close()
      })
    } catch (error) {
      console.error(`Failed to watch directory: ${path}. Error: ${error}`)
      resolve(false) // Resolve with false instead of throwing
    }
  })
})

function getProjectRoot(filePath: string): string {
  let currentDir = path.dirname(filePath)

  // Look for go.mod file to determine project root
  while (currentDir !== path.dirname(currentDir)) {
    const goModPath = path.join(currentDir, 'go.mod')
    if (existsSync(goModPath)) {
      return currentDir
    }
    currentDir = path.dirname(currentDir)
  }

  // If no go.mod found, use the directory containing the file
  return path.dirname(filePath)
}

function resolveAbsolutePath(projectPath: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath
  }
  return path.join(projectPath, filePath)
}

async function findGoDefinition(filePath: string, line: number, column: number): Promise<any> {
  try {
    console.log(`Finding definition at ${filePath}:${line}:${column}`)

    // Get the project root directory first
    const projectPath = getProjectRoot(filePath)

    // Resolve to absolute path
    const absoluteFilePath = resolveAbsolutePath(projectPath, filePath)
    console.log(`Absolute file path: ${absoluteFilePath}`)

    const content = readFileSync(absoluteFilePath, 'utf-8')
    const lines = content.split('\n')

    if (line > lines.length) {
      console.log('Line number out of range')
      return null
    }

    const currentLine = lines[line - 1]
    console.log(`Current line: "${currentLine}"`)

    // Find the word at the cursor position
    const wordPattern = /([a-zA-Z_][a-zA-Z0-9_]*)/g
    let match
    let targetSymbol = null

    while ((match = wordPattern.exec(currentLine)) !== null) {
      if (match.index <= column && match.index + match[0].length >= column) {
        targetSymbol = match[0]
        break
      }
    }

    if (!targetSymbol) {
      console.log('No symbol found at cursor position')
      return null
    }

    console.log(`Target symbol: "${targetSymbol}"`)
    console.log(`Project path: ${projectPath}`)

    // Search for the symbol definition
    const symbolInfo = await findSymbolInProject(projectPath, targetSymbol)

    if (symbolInfo) {
      console.log(`Found definition:`, symbolInfo)

      // Return in Monaco editor format
      return {
        file: symbolInfo.file,
        range: {
          startLine: symbolInfo.line,
          startColumn: 1,
          endLine: symbolInfo.line,
          endColumn: symbolInfo.signature.length || 100
        }
      }
    }

    console.log('Definition not found')
    return null
  } catch (error) {
    console.error('Error in findGoDefinition:', error)
    return null
  }
}

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

function normalizePath(filePath: string): string {
  return path.normalize(filePath)
}

function findSymbolInProject(projectPath: string, symbol: string): Promise<SymbolInfo | null> {
  return new Promise(async (resolve) => {
    try {
      const goFiles = getGoFiles(projectPath)

      console.log(`Searching for symbol "${symbol}" in ${goFiles.length} files`)

      for (const file of goFiles) {
        const normalizedFile = normalizePath(file)
        const content = readFileSync(normalizedFile, 'utf-8')
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          // Check for function definitions with various patterns
          const funcPatterns = [
            new RegExp(`func\\s+${symbol}\\s*\\([^)]*\\)(?:\\s*\\([^)]*\\))?`, 'g'),
            new RegExp(`func\\s+\\([^)]*\\)\\s+${symbol}\\s*\\([^)]*\\)(?:\\s*\\([^)]*\\))?`, 'g'), // method with receiver
            new RegExp(`func\\s+\\([^)]*\\s+\\*?\\w+\\)\\s+${symbol}\\s*\\([^)]*\\)`, 'g') // method with pointer receiver
          ]

          for (const pattern of funcPatterns) {
            const funcMatch = line.match(pattern)
            if (funcMatch) {
              console.log(`Found function "${symbol}" at ${normalizedFile}:${i + 1}`)
              resolve({
                name: symbol,
                type: 'function',
                file: normalizedFile, // Use normalized full path
                line: i + 1,
                signature: line.trim()
              })
              return
            }
          }

          // Check for struct definitions
          const structMatch = line.match(new RegExp(`type\\s+${symbol}\\s+struct`))
          if (structMatch) {
            console.log(`Found struct "${symbol}" at ${normalizedFile}:${i + 1}`)
            resolve({
              name: symbol,
              type: 'struct',
              file: normalizedFile,
              line: i + 1,
              signature: line.trim()
            })
            return
          }

          // Check for interface definitions
          const interfaceMatch = line.match(new RegExp(`type\\s+${symbol}\\s+interface`))
          if (interfaceMatch) {
            console.log(`Found interface "${symbol}" at ${normalizedFile}:${i + 1}`)
            resolve({
              name: symbol,
              type: 'interface',
              file: normalizedFile,
              line: i + 1,
              signature: line.trim()
            })
            return
          }

          // Check for type alias definitions
          const typeMatch = line.match(new RegExp(`type\\s+${symbol}\\s+[^\\s{]+`))
          if (typeMatch && !structMatch && !interfaceMatch) {
            console.log(`Found type "${symbol}" at ${normalizedFile}:${i + 1}`)
            resolve({
              name: symbol,
              type: 'type',
              file: normalizedFile,
              line: i + 1,
              signature: line.trim()
            })
            return
          }

          // Check for constant definitions
          const constMatch =
            line.match(new RegExp(`const\\s+${symbol}\\s*[=:]`)) ||
            line.match(new RegExp(`const\\s*\\([^)]*${symbol}[^)]*\\)`))
          if (constMatch) {
            console.log(`Found constant "${symbol}" at ${normalizedFile}:${i + 1}`)
            resolve({
              name: symbol,
              type: 'variable',
              file: normalizedFile,
              line: i + 1,
              signature: line.trim()
            })
            return
          }

          // Check for variable definitions
          const varMatch =
            line.match(new RegExp(`var\\s+${symbol}\\s*[=:]`)) ||
            line.match(new RegExp(`var\\s*\\([^)]*${symbol}[^)]*\\)`))
          if (varMatch) {
            console.log(`Found variable "${symbol}" at ${normalizedFile}:${i + 1}`)
            resolve({
              name: symbol,
              type: 'variable',
              file: normalizedFile,
              line: i + 1,
              signature: line.trim()
            })
            return
          }

          // Check for short variable declarations (within functions)
          const shortVarMatch = line.match(new RegExp(`${symbol}\\s*:=`))
          if (shortVarMatch) {
            console.log(
              `Found short variable declaration "${symbol}" at ${normalizedFile}:${i + 1}`
            )
            resolve({
              name: symbol,
              type: 'variable',
              file: normalizedFile,
              line: i + 1,
              signature: line.trim()
            })
            return
          }
        }
      }

      console.log(`Symbol "${symbol}" not found in project`)
      resolve(null)
    } catch (error) {
      console.error('Error in findSymbolInProject:', error)
      resolve(null)
    }
  })
}

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

ipcMain.handle('fs:findFile', async (_, { projectPath, fileName }) => {
  try {
    console.log(`Searching for file "${fileName}" in project: ${projectPath}`)

    const findFileRecursive = (dir: string): string | null => {
      try {
        const items = readdirSync(dir, { withFileTypes: true })

        for (const item of items) {
          const fullPath = join(dir, item.name)

          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'vendor') {
            const found = findFileRecursive(fullPath)
            if (found) return found
          } else if (item.isFile() && item.name === fileName) {
            return fullPath
          }
        }

        return null
      } catch (error) {
        return null
      }
    }

    const foundPath = findFileRecursive(projectPath)
    console.log(`File search result: ${foundPath}`)
    return foundPath
  } catch (error) {
    console.error('Error finding file:', error)
    return null
  }
})

function findFileRecursive(dir: string, fileName: string): string | null {
  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (
        item.isDirectory() &&
        !item.name.startsWith('.') &&
        item.name !== 'vendor' &&
        item.name !== 'node_modules'
      ) {
        const found = findFileRecursive(fullPath, fileName)
        if (found) return found
      } else if (item.isFile() && item.name === fileName) {
        return fullPath
      }
    }

    return null
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
    return null
  }
}

ipcMain.handle('fs:resolvePath', async (_, { inputPath, projectPath }) => {
  try {
    console.log(`Resolving path: ${inputPath} in project: ${projectPath}`)

    // If inputPath is already absolute, check if it exists
    if (path.isAbsolute(inputPath)) {
      if (existsSync(inputPath)) {
        return inputPath
      }
    }

    // Try relative to project root
    const projectRelativePath = path.join(projectPath, inputPath)
    if (existsSync(projectRelativePath)) {
      return projectRelativePath
    }

    // Search for the file in the project directory recursively
    const fileName = path.basename(inputPath)
    const foundPath = findFileRecursive(projectPath, fileName)
    if (foundPath) {
      return foundPath
    }

    // If not found, return the original inputPath
    return inputPath
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

// ============================================================================
// API FLOW TRACER HELPER FUNCTIONS
// ============================================================================

async function getGoFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = []

  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (
        item.isDirectory() &&
        !item.name.startsWith('.') &&
        item.name !== 'vendor' &&
        item.name !== 'node_modules'
      ) {
        files.push(...(await getGoFilesRecursive(fullPath)))
      } else if (item.isFile() && item.name.endsWith('.go') && !item.name.endsWith('_test.go')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return files
}

async function discoverRoutesInFile(
  content: string,
  filePath: string,
  relativePath: string,
  packageName: string
): Promise<APIRoute[]> {
  const routes: APIRoute[] = []
  const lines = content.split('\n')

  // Multiple route discovery patterns for different Go web frameworks

  // 1. Gorilla Mux patterns
  const muxPatterns = [
    /(\w+)\.Handle\("([^"]+)",\s*([^)]+)\)(?:\.Methods\("([^"]+)"\))?/g,
    /(\w+)\.HandleFunc\("([^"]+)",\s*([^)]+)\)(?:\.Methods\("([^"]+)"\))?/g,
    /(\w+)\.PathPrefix\("([^"]+)"\)\.Subrouter\(\)/g
  ]

  // 2. Gin framework patterns
  const ginPatterns = [
    /(\w+)\.(GET|POST|PUT|DELETE|PATCH)\("([^"]+)",\s*([^)]+)\)/g,
    /(\w+)\.Handle\("(GET|POST|PUT|DELETE|PATCH)",\s*"([^"]+)",\s*([^)]+)\)/g
  ]

  // 3. Echo framework patterns
  const echoPatterns = [/(\w+)\.(GET|POST|PUT|DELETE|PATCH)\("([^"]+)",\s*([^)]+)\)/g]

  // 4. Chi router patterns
  const chiPatterns = [/(\w+)\.(Get|Post|Put|Delete|Patch)\("([^"]+)",\s*([^)]+)\)/g]

  // 5. Standard HTTP ServeMux patterns
  const httpPatterns = [
    /http\.HandleFunc\("([^"]+)",\s*([^)]+)\)/g,
    /mux\.HandleFunc\("([^"]+)",\s*([^)]+)\)/g
  ]

  // Process all patterns
  const allPatterns = [
    ...muxPatterns.map((p) => ({ pattern: p, type: 'mux' })),
    ...ginPatterns.map((p) => ({ pattern: p, type: 'gin' })),
    ...echoPatterns.map((p) => ({ pattern: p, type: 'echo' })),
    ...chiPatterns.map((p) => ({ pattern: p, type: 'chi' })),
    ...httpPatterns.map((p) => ({ pattern: p, type: 'http' }))
  ]

  for (const { pattern, type } of allPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const route = parseRouteMatch(match, type, content, filePath, relativePath, lines)
      if (route) {
        routes.push(route)
      }
    }
  }

  return routes
}

function parseRouteMatch(
  match: RegExpExecArray,
  frameworkType: string,
  content: string,
  filePath: string,
  relativePath: string,
  lines: string[]
): APIRoute | null {
  try {
    let method: string
    let path: string
    let handler: string

    switch (frameworkType) {
      case 'mux':
        method = match[4] || 'ALL'
        path = match[2]
        handler = match[3]
        break
      case 'gin':
      case 'echo':
      case 'chi':
        method = match[2] || match[1].split('.')[1]?.toUpperCase() || 'GET'
        path = match[3]
        handler = match[4]
        break
      case 'http':
        method = 'ALL'
        path = match[1]
        handler = match[2]
        break
      default:
        return null
    }

    // Find line number
    const beforeMatch = content.substring(0, match.index || 0)
    const lineNumber = beforeMatch.split('\n').length

    // Clean up handler name
    const handlerName = handler.replace(/\s/g, '').split('.').pop() || handler

    // Generate stable ID based on method, path, handler, file, and line
    const routeId = generateStableRouteId(method, path, handlerName, relativePath, lineNumber)

    // Capture the actual line of code for the route definition
    let codeSnippet = ''
    if (lineNumber > 0 && lineNumber <= lines.length) {
      codeSnippet = lines[lineNumber - 1].trim()

      // If the line seems truncated or incomplete, try to get more context
      if (codeSnippet.length < 20 && lineNumber < lines.length) {
        // Get up to 3 lines for context
        const contextLines = lines.slice(lineNumber - 1, Math.min(lineNumber + 2, lines.length))
        codeSnippet = contextLines.join(' ').replace(/\s+/g, ' ').trim()
      }
    }

    return {
      id: routeId,
      method: method.toUpperCase(),
      path: cleanPath(path),
      handler: handlerName,
      handlerFile: relativePath,
      handlerLine: lineNumber,
      codeSnippet: codeSnippet
    }
  } catch (error) {
    console.error('Error parsing route match:', error)
    return null
  }
}

function generateStableRouteId(
  method: string,
  path: string,
  handler: string,
  file: string,
  line: number
): string {
  // Create a stable identifier that doesn't change between scans
  const cleanMethod = method.toLowerCase()
  const cleanPath = path.replace(/[^\w]/g, '-')
  const cleanHandler = handler.replace(/[^\w]/g, '-')
  const cleanFile = file.replace(/[^\w]/g, '-')

  return `${cleanMethod}-${cleanPath}-${cleanHandler}-${cleanFile}-${line}`.replace(/-+/g, '-')
}

function cleanPath(path: string): string {
  // Remove common path prefixes and clean up
  return path.replace(/^\/*/, '/').replace(/\/$/, '') || '/'
}

async function discoverAPIRoutesInternal(projectPath: string): Promise<APIRoute[]> {
  // Reuse the same logic as the exposed handler
  const routes: APIRoute[] = []
  const goFiles = await getGoFilesRecursive(projectPath)

  for (const filePath of goFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const relativePath = filePath.replace(projectPath, '').substring(1)
    const packageMatch = content.match(/^package\s+(\w+)/m)
    const packageName = packageMatch ? packageMatch[1] : 'main'

    const fileRoutes = await discoverRoutesInFile(content, filePath, relativePath, packageName)
    routes.push(...fileRoutes)
  }

  return routes.filter(
    (route, index, self) =>
      index === self.findIndex((r) => r.method === route.method && r.path === route.path)
  )
}

async function traceCompleteDataFlow(
  projectPath: string,
  targetRoute: APIRoute
): Promise<{ nodes: DataFlowNode[]; edges: DataFlowEdge[] }> {
  const nodes: DataFlowNode[] = []
  const edges: DataFlowEdge[] = []
  const processedFunctions = new Set<string>()

  // 1. Create route node
  const routeNode: DataFlowNode = {
    id: `route-${targetRoute.id}`,
    type: 'route',
    name: `${targetRoute.method} ${targetRoute.path}`,
    file: targetRoute.handlerFile,
    line: targetRoute.handlerLine,
    metadata: {
      parameters: extractRouteParameters(targetRoute.path)
    }
  }
  nodes.push(routeNode)

  // 2. Find and trace handler function
  const handlerNode = await traceHandlerFunction(projectPath, targetRoute)
  if (handlerNode) {
    nodes.push(handlerNode)
    edges.push({
      source: routeNode.id,
      target: handlerNode.id,
      dataType: 'HTTP Request'
    })

    // 3. Recursively trace function calls from handler
    await traceFunctionCalls(
      projectPath,
      handlerNode.file,
      handlerNode.name,
      nodes,
      edges,
      processedFunctions,
      handlerNode.id
    )
  }

  return { nodes, edges }
}

async function traceHandlerFunction(
  projectPath: string,
  route: APIRoute
): Promise<DataFlowNode | null> {
  try {
    const handlerFilePath = join(projectPath, route.handlerFile)
    const content = readFileSync(handlerFilePath, 'utf-8')

    // Find the handler function definition with more flexible patterns
    const funcPatterns = [
      new RegExp(`func\\s+${route.handler}\\s*\\(([^)]*)\\)(?:\\s*\\(([^)]*)\\))?`, 'g'),
      new RegExp(
        `func\\s+\\([^)]*\\)\\s+${route.handler}\\s*\\(([^)]*)\\)(?:\\s*\\(([^)]*)\\))?`,
        'g'
      ), // Method receiver pattern
      new RegExp(`var\\s+${route.handler}\\s*=`, 'g') // Function variable pattern
    ]

    let match = null

    for (const pattern of funcPatterns) {
      match = pattern.exec(content)
      if (match) {
        break
      }
    }

    if (!match) {
      // If no function definition found, create a basic node
      return {
        id: `handler-${route.handler}`,
        type: 'handler',
        name: route.handler,
        file: route.handlerFile,
        line: route.handlerLine,
        content: route.codeSnippet || `Handler: ${route.handler}`
      }
    }

    const params = match[1] || ''
    const returns = match[2] || ''

    // Find line number
    const beforeMatch = content.substring(0, match.index || 0)
    const lineNumber = beforeMatch.split('\n').length

    // Extract function body for analysis
    const functionBody = extractFunctionBody(content, match.index || 0)

    // Get a more meaningful code snippet from the function
    let codeSnippet = functionBody.substring(0, 300)
    if (functionBody.length > 300) {
      codeSnippet += '...'
    }

    // If function body is empty or very short, use the function signature
    if (codeSnippet.length < 20) {
      codeSnippet = `func ${route.handler}(${params}) ${returns ? `(${returns})` : ''}`
    }

    return {
      id: `handler-${route.handler}`,
      type: 'handler',
      name: route.handler,
      file: route.handlerFile,
      line: lineNumber,
      content: codeSnippet,
      metadata: {
        parameters: parseParameters(params),
        returnType: returns
      }
    }
  } catch (error) {
    console.error('Error tracing handler function:', error)
    return {
      id: `handler-${route.handler}`,
      type: 'handler',
      name: route.handler,
      file: route.handlerFile,
      line: route.handlerLine,
      content: route.codeSnippet || `Handler: ${route.handler}`
    }
  }
}

async function traceFunctionCalls(
  projectPath: string,
  currentFile: string,
  functionName: string,
  nodes: DataFlowNode[],
  edges: DataFlowEdge[],
  processedFunctions: Set<string>,
  sourceNodeId: string
): Promise<void> {
  const funcKey = `${currentFile}:${functionName}`
  if (processedFunctions.has(funcKey)) return

  processedFunctions.add(funcKey)

  try {
    const filePath = join(projectPath, currentFile)
    const content = readFileSync(filePath, 'utf-8')

    // Find function calls within the current function
    const functionCalls = extractFunctionCallsFromFunction(content, functionName)

    for (const call of functionCalls) {
      // Determine call type and create appropriate node
      const nodeType = determineNodeType(call.functionName, call.context)
      const nodeId = `${nodeType}-${call.functionName}-${nodes.length}`

      // Check if we already have this node
      const existingNode = nodes.find((n) => n.name === call.functionName && n.type === nodeType)

      if (!existingNode) {
        const newNode = await createNodeForFunction(projectPath, call, nodeType, nodeId)

        if (newNode) {
          nodes.push(newNode)

          // Create edge from source to this new node
          edges.push({
            source: sourceNodeId,
            target: nodeId,
            dataType: inferDataType(call.context),
            transformation: call.transformation
          })

          // Recursively trace this function if it's internal
          if (newNode.file && !newNode.file.includes('external')) {
            await traceFunctionCalls(
              projectPath,
              newNode.file,
              newNode.name,
              nodes,
              edges,
              processedFunctions,
              nodeId
            )
          }
        }
      } else {
        // Create edge to existing node
        edges.push({
          source: sourceNodeId,
          target: existingNode.id,
          dataType: inferDataType(call.context)
        })
      }
    }
  } catch (error) {
    console.error(`Error tracing function calls for ${functionName}:`, error)
  }
}

function extractFunctionCallsFromFunction(
  content: string,
  functionName: string
): Array<{
  functionName: string
  context: string
  line: number
  transformation?: string
}> {
  const calls: Array<{
    functionName: string
    context: string
    line: number
    transformation?: string
  }> = []

  try {
    // Find the function definition
    const funcRegex = new RegExp(`func\\s+${functionName}\\s*\\([^)]*\\)`, 'g')
    const match = funcRegex.exec(content)
    if (!match) return calls

    // Extract function body
    const functionBody = extractFunctionBody(content, match.index || 0)
    const lines = functionBody.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Look for function calls (basic pattern)
      const callMatches = line.matchAll(/(\w+(?:\.\w+)*)\s*\(/g)

      for (const callMatch of callMatches) {
        const funcCall = callMatch[1]

        // Skip built-ins and common patterns
        if (!isBuiltinOrCommonPattern(funcCall)) {
          calls.push({
            functionName: funcCall,
            context: line.trim(),
            line: i + 1,
            transformation: extractTransformation(line)
          })
        }
      }
    }
  } catch (error) {
    console.error('Error extracting function calls:', error)
  }

  return calls
}

function extractFunctionBody(content: string, startIndex: number): string {
  let braceCount = 0
  let bodyStart = -1
  let bodyEnd = -1
  let inString = false
  let inComment = false
  let stringChar = ''

  // Find opening brace while handling strings and comments
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i]
    const nextChar = i + 1 < content.length ? content[i + 1] : ''

    // Handle string literals
    if ((char === '"' || char === '`') && !inComment) {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar && content[i - 1] !== '\\') {
        inString = false
        stringChar = ''
      }
      continue
    }

    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = true
        continue
      }
      if (char === '\n' && inComment) {
        inComment = false
        continue
      }
    }

    // Handle braces only if not in string or comment
    if (!inString && !inComment) {
      if (char === '{') {
        if (bodyStart === -1) bodyStart = i
        braceCount++
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          bodyEnd = i
          break
        }
      }
    }
  }

  if (bodyStart !== -1 && bodyEnd !== -1) {
    const body = content.substring(bodyStart + 1, bodyEnd)
    return body.trim()
  }

  return ''
}

function determineNodeType(functionName: string, context: string): DataFlowNode['type'] {
  const lowerFunc = functionName.toLowerCase()
  const lowerContext = context.toLowerCase()

  // DTO/Model patterns
  if (
    lowerFunc.includes('dto') ||
    lowerFunc.includes('model') ||
    lowerFunc.includes('request') ||
    lowerFunc.includes('response') ||
    lowerContext.includes('json.marshal') ||
    lowerContext.includes('json.unmarshal')
  ) {
    return 'dto'
  }

  // Database patterns
  if (
    lowerFunc.includes('db') ||
    lowerFunc.includes('query') ||
    lowerFunc.includes('exec') ||
    lowerFunc.includes('scan') ||
    lowerContext.includes('select') ||
    lowerContext.includes('insert') ||
    lowerContext.includes('update') ||
    lowerContext.includes('delete')
  ) {
    return 'database'
  }

  // Repository patterns
  if (
    lowerFunc.includes('repo') ||
    lowerFunc.includes('repository') ||
    lowerFunc.includes('find') ||
    lowerFunc.includes('save') ||
    lowerFunc.includes('get') ||
    lowerFunc.includes('create')
  ) {
    return 'repository'
  }

  // External API patterns
  if (
    lowerFunc.includes('http') ||
    lowerFunc.includes('client') ||
    lowerFunc.includes('api') ||
    lowerContext.includes('http.get') ||
    lowerContext.includes('http.post')
  ) {
    return 'external'
  }

  // Service patterns (default for business logic)
  return 'service'
}

async function createNodeForFunction(
  projectPath: string,
  call: { functionName: string; context: string; line: number; transformation?: string },
  nodeType: DataFlowNode['type'],
  nodeId: string
): Promise<DataFlowNode | null> {
  // For external calls or built-in functions
  if (nodeType === 'external' || call.functionName.includes('.')) {
    return {
      id: nodeId,
      type: nodeType,
      name: call.functionName,
      file: 'external',
      content: call.context,
      metadata: {
        parameters: extractParametersFromCall(call.context)
      }
    }
  }

  // Try to find the actual function definition in project files
  try {
    const functionDef = await findFunctionDefinition(projectPath, call.functionName)

    if (functionDef) {
      let content = ''
      let metadata: DataFlowNode['metadata'] = {}

      // Add specific metadata based on node type
      if (nodeType === 'dto') {
        content = extractDTOFields(functionDef.content)
        metadata.dtoFields = extractDTOFieldNames(functionDef.content)
      } else if (nodeType === 'database') {
        content = extractDatabaseQuery(functionDef.content)
        metadata.databaseQuery = content
        metadata.tableName = extractTableName(content)
      } else {
        content = functionDef.content.substring(0, 150) + '...'
      }

      return {
        id: nodeId,
        type: nodeType,
        name: call.functionName,
        file: functionDef.file,
        line: functionDef.line,
        content: content,
        metadata: metadata
      }
    }
  } catch (error) {
    console.error('Error creating node for function:', error)
  }

  // Fallback: create basic node
  return {
    id: nodeId,
    type: nodeType,
    name: call.functionName,
    file: 'unknown',
    content: call.context
  }
}

async function findFunctionDefinition(
  projectPath: string,
  functionName: string
): Promise<{ file: string; line: number; content: string } | null> {
  const goFiles = await getGoFilesRecursive(projectPath)

  for (const filePath of goFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const relativePath = filePath.replace(projectPath, '').substring(1)

      // Look for function definition
      const funcRegex = new RegExp(`func\\s+${functionName}\\s*\\([^)]*\\)`, 'g')
      const match = funcRegex.exec(content)

      if (match) {
        const beforeMatch = content.substring(0, match.index || 0)
        const lineNumber = beforeMatch.split('\n').length
        const functionBody = extractFunctionBody(content, match.index || 0)

        return {
          file: relativePath,
          line: lineNumber,
          content: functionBody
        }
      }
    } catch (error) {
      // Continue to next file
      continue
    }
  }

  return null
}

// Helper utility functions
function extractRouteParameters(path: string): string[] {
  const params: string[] = []
  const pathParams = path.match(/\{([^}]+)\}/g)

  if (pathParams) {
    pathParams.forEach((param) => {
      params.push(param.replace(/[{}]/g, ''))
    })
  }

  return params
}

function parseParameters(paramStr: string): string[] {
  if (!paramStr.trim()) return []

  return paramStr
    .split(',')
    .map((p) => {
      const parts = p.trim().split(/\s+/)
      return parts[0] || p.trim()
    })
    .filter((p) => p)
}

function isBuiltinOrCommonPattern(funcName: string): boolean {
  const builtins = [
    'len',
    'cap',
    'make',
    'append',
    'copy',
    'delete',
    'close',
    'panic',
    'recover',
    'print',
    'println',
    'new',
    'complex',
    'real',
    'imag',
    'min',
    'max',
    'if',
    'for',
    'switch',
    'select',
    'go',
    'defer',
    'return',
    'break',
    'continue',
    'range'
  ]

  const commonPatterns = [
    'fmt.',
    'log.',
    'strings.',
    'strconv.',
    'time.',
    'context.',
    'json.',
    'http.',
    'url.',
    'regexp.',
    'sort.',
    'math.'
  ]

  return (
    builtins.includes(funcName) || commonPatterns.some((pattern) => funcName.startsWith(pattern))
  )
}

function inferDataType(context: string): string {
  const lower = context.toLowerCase()

  if (lower.includes('json') || lower.includes('marshal') || lower.includes('unmarshal')) {
    return 'JSON'
  }
  if (lower.includes('xml')) {
    return 'XML'
  }
  if (lower.includes('string') || lower.includes('text')) {
    return 'String'
  }
  if (lower.includes('int') || lower.includes('number')) {
    return 'Number'
  }
  if (lower.includes('bool')) {
    return 'Boolean'
  }
  if (lower.includes('slice') || lower.includes('array')) {
    return 'Array'
  }

  return 'Data'
}

function extractTransformation(line: string): string | undefined {
  if (line.includes('json.Marshal') || line.includes('json.Unmarshal')) {
    return 'JSON Conversion'
  }
  if (line.includes('strconv.')) {
    return 'Type Conversion'
  }
  if (line.includes('strings.')) {
    return 'String Processing'
  }

  return undefined
}

function extractParametersFromCall(context: string): string[] {
  const match = context.match(/\(([^)]*)\)/)
  if (!match) return []

  return match[1]
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p)
}

function extractDTOFields(content: string): string {
  // Extract struct fields for DTO
  const structMatch = content.match(/type\s+\w+\s+struct\s*\{([^}]+)\}/s)
  if (structMatch) {
    return structMatch[1].trim()
  }

  // Extract function that deals with struct fields
  const lines = content.split('\n').slice(0, 10) // First 10 lines
  return lines.join('\n')
}

function extractDTOFieldNames(content: string): string[] {
  const fields: string[] = []
  const structMatch = content.match(/type\s+\w+\s+struct\s*\{([^}]+)\}/s)

  if (structMatch) {
    const fieldLines = structMatch[1].split('\n')
    fieldLines.forEach((line) => {
      const fieldMatch = line.trim().match(/^(\w+)\s+/)
      if (fieldMatch) {
        fields.push(fieldMatch[1])
      }
    })
  }

  return fields
}

function extractDatabaseQuery(content: string): string {
  // Look for SQL queries in the function
  const queryPatterns = [
    /"(SELECT[^"]+)"/gi,
    /"(INSERT[^"]+)"/gi,
    /"(UPDATE[^"]+)"/gi,
    /"(DELETE[^"]+)"/gi,
    /`(SELECT[^`]+)`/gi,
    /`(INSERT[^`]+)`/gi,
    /`(UPDATE[^`]+)`/gi,
    /`(DELETE[^`]+)`/gi
  ]

  for (const pattern of queryPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return content.substring(0, 100) + '...'
}

function extractTableName(query: string): string | undefined {
  const tablePatterns = [
    /FROM\s+(\w+)/i,
    /INSERT\s+INTO\s+(\w+)/i,
    /UPDATE\s+(\w+)/i,
    /DELETE\s+FROM\s+(\w+)/i
  ]

  for (const pattern of tablePatterns) {
    const match = query.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

// ============================================================================
// EXISTING HELPER FUNCTIONS (kept for backward compatibility)
// ============================================================================

// Helper function to extract routes from file content
function extractRoutesFromContent(content: string) {
  const routes = []

  // Pattern for mux.Handle("/path", handler)
  const handlePattern = /mux\.Handle\("([^"]+)",\s*([^)]+)\)/g
  let match

  while ((match = handlePattern.exec(content)) !== null) {
    routes.push({
      path: match[1],
      handler: match[2].trim(),
      method: 'ALL'
    })
  }

  // Pattern for mux.HandleFunc("/path", func)
  const handleFuncPattern = /mux\.HandleFunc\("([^"]+)",\s*([^)]+)\)/g

  while ((match = handleFuncPattern.exec(content)) !== null) {
    routes.push({
      path: match[1],
      handler: match[2].trim(),
      method: 'ALL'
    })
  }

  return routes
}

// Add this new function to update project references
async function updateProjectReferences(projectPath: string, projectName: string) {
  const files = getAllFiles(projectPath)

  for (const file of files) {
    if (file.endsWith('.go') || file.endsWith('.mod') || file.endsWith('.sum')) {
      let content = readFileSync(file, 'utf8')

      // Replace all occurrences of the old module name
      content = content.replace(/domain_centric_microservice/g, projectName)

      writeFileSync(file, content, 'utf8')
    }
  }
}

// Helper function to get all files recursively
function getAllFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (item.isDirectory()) {
        files.push(...getAllFiles(fullPath))
      } else {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return files
}

function copyDirectoryRecursive(source: string, destination: string) {
  // Create destination directory if it doesn't exist
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true })
  }

  // Read all files/directories from source
  const items = readdirSync(source, { withFileTypes: true })

  for (const item of items) {
    const sourcePath = join(source, item.name)
    const destinationPath = join(destination, item.name)

    if (item.isDirectory()) {
      // Recursively copy directories
      copyDirectoryRecursive(sourcePath, destinationPath)
    } else {
      // Copy files
      copyFileSync(sourcePath, destinationPath)
    }
  }
}

function getGoFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'vendor') {
        files.push(...getGoFiles(fullPath))
      } else if (item.isFile() && item.name.endsWith('.go') && !item.name.endsWith('_test.go')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return files
}

function extractFunctions(content: string, filePath: string, packageName: string): FunctionDef[] {
  const functions: FunctionDef[] = []

  // Regex to match function declarations
  const funcRegex =
    /^func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\(([^)]*)\)|\s*(\w+(?:\[\w+\])?))?/gm

  let match
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1]
    const paramsStr = match[2] || ''
    const returnsStr = match[3] || match[4] || ''

    // Find line number
    const beforeMatch = content.substring(0, match.index || 0)
    const lineNumber = beforeMatch.split('\n').length

    // Parse parameters
    const params = paramsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)
      .map((p) => {
        const parts = p.split(/\s+/)
        return parts.length > 1 ? parts[0] : 'param'
      })

    // Parse returns
    const returns = returnsStr
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r)

    functions.push({
      name: funcName,
      file: filePath,
      line: lineNumber,
      package: packageName,
      params,
      returns
    })
  }
  return functions
}

function extractFunctionCalls(
  content: string,
  filePath: string,
  packageName: string
): FunctionCall[] {
  const calls: FunctionCall[] = []

  // Find current function context
  let currentFunction = ''

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // Check if we're entering a new function
    const funcMatch = line.match(/^func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/)
    if (funcMatch) {
      currentFunction = funcMatch[1]
      continue
    }

    // Look for function calls
    const callMatches = line.matchAll(/(\w+(?:\.\w+)?)\s*\(/g)

    for (const callMatch of callMatches) {
      const calledFunc = callMatch[1]

      // Skip built-in functions and common keywords
      if (isBuiltinOrKeyword(calledFunc)) {
        continue
      }

      calls.push({
        callerFunc: currentFunction,
        callerFile: filePath,
        callerLine: lineNumber,
        calledFunc: calledFunc,
        package: packageName
      })
    }
  }

  return calls
}

function isBuiltinOrKeyword(name: string): boolean {
  const builtins = [
    'make',
    'len',
    'cap',
    'append',
    'copy',
    'delete',
    'close',
    'panic',
    'recover',
    'print',
    'println',
    'new',
    'complex',
    'real',
    'imag',
    'min',
    'max',
    'if',
    'for',
    'switch',
    'select',
    'go',
    'defer',
    'return',
    'break',
    'continue',
    'fmt.Printf',
    'fmt.Println',
    'fmt.Print',
    'fmt.Sprintf',
    'log.Printf',
    'log.Println'
  ]

  return (
    builtins.includes(name) ||
    name.startsWith('fmt.') ||
    name.startsWith('log.') ||
    name.startsWith('strconv.') ||
    name.startsWith('strings.') ||
    name.includes('.')
  )
}

function resolveCallTargets(callGraph: CallGraph) {
  const functionMap = new Map<string, FunctionDef>()

  // Build function lookup map
  for (const func of callGraph.functions) {
    functionMap.set(`${func.package}.${func.name}`, func)
    functionMap.set(func.name, func) // Also index by name only
  }

  // Resolve call targets
  for (const call of callGraph.calls) {
    const calledFunc = call.calledFunc

    // Try to find the called function
    let targetFunc = functionMap.get(`${call.package}.${calledFunc}`)
    if (!targetFunc) {
      targetFunc = functionMap.get(calledFunc)
    }

    if (targetFunc) {
      call.calledFile = targetFunc.file
      call.calledLine = targetFunc.line
    }
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  if (is.dev) {
    app.on('activate', () => {
      if (mainWindow === null) createWindow()
    })

    if (mainWindow) {
      mainWindow.webContents.on('destroyed', () => {
        mainWindow = null
      })
    }
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
