import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// Types
export interface APIRoute {
  id: string
  method: string
  path: string
  handler: string
  handlerFile: string
  handlerLine: number
  middleware?: string[]
  codeSnippet?: string
}

export interface DataFlowNode {
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

export interface DataFlowEdge {
  source: string
  target: string
  dataType?: string
  transformation?: string
}

// Main API flow functions
export async function getGoFilesRecursive(dir: string): Promise<string[]> {
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

export async function discoverRoutesInFile(
  content: string,
  filePath: string,
  relativePath: string,
  _packageName: string
): Promise<APIRoute[]> {
  const routes: APIRoute[] = []
  const lines = content.split('\n')

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

export function parseRouteMatch(
  match: RegExpExecArray,
  frameworkType: string,
  content: string,
  _filePath: string,
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

export function generateStableRouteId(
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

export function cleanPath(path: string): string {
  // Remove common path prefixes and clean up
  return path.replace(/^\/*/, '/').replace(/\/$/, '') || '/'
}

export async function discoverAPIRoutesInternal(projectPath: string): Promise<APIRoute[]> {
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

export async function traceCompleteDataFlow(
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

export async function traceHandlerFunction(
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

export async function traceFunctionCalls(
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

// Helper functions
export function extractFunctionBody(content: string, startIndex: number): string {
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

export function extractFunctionCallsFromFunction(
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

export function determineNodeType(functionName: string, context: string): DataFlowNode['type'] {
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

export async function createNodeForFunction(
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

export async function findFunctionDefinition(
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

// Utility helper functions
export function extractRouteParameters(path: string): string[] {
  const params: string[] = []
  const pathParams = path.match(/\{([^}]+)\}/g)

  if (pathParams) {
    pathParams.forEach((param) => {
      params.push(param.replace(/[{}]/g, ''))
    })
  }

  return params
}

export function parseParameters(paramStr: string): string[] {
  if (!paramStr.trim()) return []

  return paramStr
    .split(',')
    .map((p) => {
      const parts = p.trim().split(/\s+/)
      return parts[0] || p.trim()
    })
    .filter((p) => p)
}

export function isBuiltinOrCommonPattern(funcName: string): boolean {
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

export function inferDataType(context: string): string {
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

export function extractTransformation(line: string): string | undefined {
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

export function extractParametersFromCall(context: string): string[] {
  const match = context.match(/\(([^)]*)\)/)
  if (!match) return []

  return match[1]
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p)
}

export function extractDTOFields(content: string): string {
  // Extract struct fields for DTO
  const structMatch = content.match(/type\s+\w+\s+struct\s*\{([^}]+)\}/s)
  if (structMatch) {
    return structMatch[1].trim()
  }

  // Extract function that deals with struct fields
  const lines = content.split('\n').slice(0, 10) // First 10 lines
  return lines.join('\n')
}

export function extractDTOFieldNames(content: string): string[] {
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

export function extractDatabaseQuery(content: string): string {
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

export function extractTableName(query: string): string | undefined {
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
