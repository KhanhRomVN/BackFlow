import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as path from 'path'
import { existsSync } from 'fs'

// Types for Go analysis
export interface FunctionDef {
  name: string
  file: string
  line: number
  package: string
  params: string[]
  returns: string[]
}

export interface FunctionCall {
  callerFunc: string
  callerFile: string
  callerLine: number
  calledFunc: string
  calledFile?: string
  calledLine?: number
  package: string
}

export interface CallGraph {
  functions: FunctionDef[]
  calls: FunctionCall[]
}

export interface SymbolInfo {
  name: string
  type: 'function' | 'struct' | 'interface' | 'type' | 'variable'
  file: string
  line: number
  signature: string
}

export function getGoFiles(dir: string): string[] {
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

export function extractFunctions(
  content: string,
  filePath: string,
  packageName: string
): FunctionDef[] {
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

export function extractFunctionCalls(
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

export function isBuiltinOrKeyword(name: string): boolean {
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

export function resolveCallTargets(callGraph: CallGraph) {
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

export function getProjectRoot(filePath: string): string {
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

export function resolveAbsolutePath(projectPath: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath
  }
  return path.join(projectPath, filePath)
}

export function normalizePath(filePath: string): string {
  return path.normalize(filePath)
}

export async function findGoDefinition(
  filePath: string,
  line: number,
  column: number
): Promise<any> {
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

      // Return in Monaco editor format with absolute path
      return {
        file: symbolInfo.file, // This should be the absolute path
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

export function findSymbolInProject(
  projectPath: string,
  symbol: string
): Promise<SymbolInfo | null> {
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

// Helper function to extract routes from file content
export function extractRoutesFromContent(content: string) {
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
