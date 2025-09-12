import { readFileSync } from 'fs'
import { relative } from 'path'

export interface CodeStructure {
  filePath: string
  packageName: string
  imports: ImportDeclaration[]
  types: TypeDeclaration[]
  constants: ConstantDeclaration[]
  variables: VariableDeclaration[]
  functions: FunctionDeclaration[]
  structs: StructDeclaration[]
  interfaces: InterfaceDeclaration[]
  comments: Comment[]
}

export interface ImportDeclaration {
  path: string
  line: number
  codeSnippet: string
}

export interface TypeDeclaration {
  name: string
  type: string
  line: number
  codeSnippet: string
  comments: string[]
}

export interface ConstantDeclaration {
  name: string
  value: string
  line: number
  codeSnippet: string
  comments: string[]
}

export interface VariableDeclaration {
  name: string
  type: string
  line: number
  codeSnippet: string
  comments: string[]
}

export interface FunctionDeclaration {
  name: string
  parameters: Parameter[]
  returnType: string
  line: number
  codeSnippet: string
  comments: string[]
  receiver?: string
}

export interface StructDeclaration {
  name: string
  fields: StructField[]
  line: number
  codeSnippet: string
  comments: string[]
}

export interface InterfaceDeclaration {
  name: string
  methods: InterfaceMethod[]
  line: number
  codeSnippet: string
  comments: string[]
}

export interface Parameter {
  name: string
  type: string
}

export interface StructField {
  name: string
  type: string
  tag: string
  comments: string[]
}

export interface InterfaceMethod {
  name: string
  parameters: Parameter[]
  returnType: string
  comments: string[]
}

export interface Comment {
  text: string
  line: number
  type: 'line' | 'block'
}

export interface ProjectSymbol {
  name: string
  type: string
  file: string
  line: number
}

export class ASTParser {
  static parseFile(filePath: string, projectPath: string): CodeStructure {
    const content = readFileSync(filePath, 'utf-8')
    const relativePath = relative(projectPath, filePath)

    const structure: CodeStructure = {
      filePath: relativePath,
      packageName: '',
      imports: [],
      types: [],
      constants: [],
      variables: [],
      functions: [],
      structs: [],
      interfaces: [],
      comments: []
    }

    try {
      // Extract all comments first
      structure.comments = this.extractComments(content)

      // Parse Go content
      this.parseGoContent(content, structure)

      return structure
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error)
      return structure
    }
  }

  private static parseGoContent(content: string, structure: CodeStructure): void {
    const lines = content.split('\n')

    // Extract package name
    const packageMatch = content.match(/^package\s+(\w+)/m)
    if (packageMatch) {
      structure.packageName = packageMatch[1]
    }

    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      const trimmedLine = line.trim()
      const lineNumber = i + 1

      if (trimmedLine.startsWith('import')) {
        const importBlock = this.extractImportBlock(lines, i)
        if (importBlock) {
          structure.imports.push(...this.parseImportBlock(importBlock, lineNumber))
          i = importBlock.endIndex
        }
      } else if (trimmedLine.startsWith('type') && trimmedLine.includes('struct')) {
        const structBlock = this.extractTypeBlock(lines, i, 'struct')
        if (structBlock) {
          structure.structs.push(this.parseStruct(structBlock, lineNumber))
          i = structBlock.endIndex
        }
      } else if (trimmedLine.startsWith('type') && trimmedLine.includes('interface')) {
        const interfaceBlock = this.extractTypeBlock(lines, i, 'interface')
        if (interfaceBlock) {
          structure.interfaces.push(this.parseInterface(interfaceBlock, lineNumber))
          i = interfaceBlock.endIndex
        }
      } else if (trimmedLine.startsWith('type')) {
        const typeDef = this.parseTypeDeclaration(trimmedLine, lineNumber)
        if (typeDef) {
          structure.types.push(typeDef)
        }
      } else if (trimmedLine.startsWith('const')) {
        const constBlock = this.extractConstBlock(lines, i)
        if (constBlock) {
          structure.constants.push(...this.parseConstBlock(constBlock, lineNumber))
          i = constBlock.endIndex
        }
      } else if (trimmedLine.startsWith('var')) {
        const varBlock = this.extractVarBlock(lines, i)
        if (varBlock) {
          structure.variables.push(...this.parseVarBlock(varBlock, lineNumber))
          i = varBlock.endIndex
        }
      } else if (trimmedLine.startsWith('func')) {
        const funcBlock = this.extractFunctionBlock(lines, i)
        if (funcBlock) {
          structure.functions.push(this.parseFunction(funcBlock, lineNumber))
          i = funcBlock.endIndex
        }
      }

      i++
    }
  }

  private static extractComments(content: string): Comment[] {
    const comments: Comment[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Single line comments
      if (line.startsWith('//')) {
        comments.push({
          text: line.substring(2).trim(),
          line: i + 1,
          type: 'line'
        })
      }
      // Multi-line comments
      else if (line.startsWith('/*')) {
        let commentText = line.substring(2)
        let endIndex = i

        // Handle multi-line block comments
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('*/')) {
            endIndex = j
            commentText += '\n' + lines[j].substring(0, lines[j].indexOf('*/'))
            break
          } else {
            commentText += '\n' + lines[j]
          }
        }

        comments.push({
          text: commentText.trim(),
          line: i + 1,
          type: 'block'
        })

        i = endIndex
      }
    }

    return comments
  }

  private static extractImportBlock(
    lines: string[],
    startIndex: number
  ): { content: string; endIndex: number } | null {
    let content = lines[startIndex]
    let i = startIndex
    let braceCount = 0

    if (content.includes('(')) {
      braceCount++
      i++

      while (i < lines.length && braceCount > 0) {
        const line = lines[i]
        if (line.includes('(')) braceCount++
        if (line.includes(')')) braceCount--

        content += '\n' + line
        i++
      }

      return { content, endIndex: i - 1 }
    }

    return { content, endIndex: startIndex }
  }

  private static parseImportBlock(
    block: { content: string; endIndex: number },
    startLine: number
  ): ImportDeclaration[] {
    const imports: ImportDeclaration[] = []
    const lines = block.content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Skip empty lines and parentheses
      if (!trimmedLine || trimmedLine === '(' || trimmedLine === ')') continue

      const importMatch = trimmedLine.match(
        /import\s+(?:"([^"]+)"|`([^`]+)`|\(|([^"`\s]+)\s+"([^"]+)")/
      )
      if (importMatch) {
        const path = importMatch[1] || importMatch[2] || importMatch[4]
        if (path) {
          imports.push({
            path,
            line: startLine,
            codeSnippet: trimmedLine
          })
        }
      }
    }

    return imports
  }

  private static extractTypeBlock(
    lines: string[],
    startIndex: number,
    _type: string
  ): { content: string; endIndex: number } | null {
    let content = lines[startIndex]
    let i = startIndex
    let braceCount = 0

    if (content.includes('{')) {
      braceCount++
      i++

      while (i < lines.length && braceCount > 0) {
        const line = lines[i]
        if (line.includes('{')) braceCount++
        if (line.includes('}')) braceCount--

        content += '\n' + line
        i++
      }

      return { content, endIndex: i - 1 }
    }

    return { content, endIndex: startIndex }
  }

  private static parseStruct(
    block: { content: string; endIndex: number },
    startLine: number
  ): StructDeclaration {
    const lines = block.content.split('\n')
    const firstLine = lines[0].trim()

    const nameMatch = firstLine.match(/type\s+(\w+)\s+struct/)
    const name = nameMatch ? nameMatch[1] : 'unknown'

    const fields: StructField[] = []
    let fieldComments: string[] = []

    for (let i = 1; i < lines.length - 1; i++) {
      const line = lines[i].trim()

      if (!line || line === '}') continue

      if (line.startsWith('//')) {
        fieldComments.push(line.substring(2).trim())
      } else {
        const fieldMatch = line.match(/^(\w+)\s+([^`]+)(?:\s+`([^`]+)`)?/)
        if (fieldMatch) {
          fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2].trim(),
            tag: fieldMatch[3] || '',
            comments: [...fieldComments]
          })
          fieldComments = []
        }
      }
    }

    return {
      name,
      fields,
      line: startLine,
      codeSnippet: block.content,
      comments: this.extractCommentsForLine(block.content, startLine)
    }
  }

  private static parseInterface(
    block: { content: string; endIndex: number },
    startLine: number
  ): InterfaceDeclaration {
    const lines = block.content.split('\n')
    const firstLine = lines[0].trim()

    const nameMatch = firstLine.match(/type\s+(\w+)\s+interface/)
    const name = nameMatch ? nameMatch[1] : 'unknown'

    const methods: InterfaceMethod[] = []
    let methodComments: string[] = []

    for (let i = 1; i < lines.length - 1; i++) {
      const line = lines[i].trim()

      if (!line || line === '}') continue

      if (line.startsWith('//')) {
        methodComments.push(line.substring(2).trim())
      } else {
        const methodMatch = line.match(/^(\w+)\(([^)]*)\)\s*(.*)/)
        if (methodMatch) {
          const params = this.parseParameters(methodMatch[2])
          const returnType = methodMatch[3] || 'void'

          methods.push({
            name: methodMatch[1],
            parameters: params,
            returnType: returnType.trim(),
            comments: [...methodComments]
          })
          methodComments = []
        }
      }
    }

    return {
      name,
      methods,
      line: startLine,
      codeSnippet: block.content,
      comments: this.extractCommentsForLine(block.content, startLine)
    }
  }

  private static parseTypeDeclaration(line: string, lineNumber: number): TypeDeclaration | null {
    const typeMatch = line.match(/type\s+(\w+)\s+(\w+)/)
    if (typeMatch) {
      return {
        name: typeMatch[1],
        type: typeMatch[2],
        line: lineNumber,
        codeSnippet: line,
        comments: this.extractCommentsForLine(line, lineNumber)
      }
    }
    return null
  }

  private static extractConstBlock(
    lines: string[],
    startIndex: number
  ): { content: string; endIndex: number } | null {
    let content = lines[startIndex]
    let i = startIndex

    if (content.includes('(')) {
      i++

      while (i < lines.length && !lines[i].trim().startsWith(')')) {
        content += '\n' + lines[i]
        i++
      }

      if (i < lines.length) {
        content += '\n' + lines[i]
      }

      return { content, endIndex: i }
    }

    return { content, endIndex: startIndex }
  }

  private static parseConstBlock(
    block: { content: string; endIndex: number },
    startLine: number
  ): ConstantDeclaration[] {
    const constants: ConstantDeclaration[] = []
    const lines = block.content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine === '(' || trimmedLine === ')') continue

      if (trimmedLine.startsWith('const')) {
        continue // Skip the const keyword line
      }

      const constMatch = trimmedLine.match(/^(\w+)\s*=\s*(.+)/)
      if (constMatch) {
        constants.push({
          name: constMatch[1],
          value: constMatch[2].trim(),
          line: startLine,
          codeSnippet: trimmedLine,
          comments: this.extractCommentsForLine(trimmedLine, startLine)
        })
      }
    }

    return constants
  }

  private static extractVarBlock(
    lines: string[],
    startIndex: number
  ): { content: string; endIndex: number } | null {
    let content = lines[startIndex]
    let i = startIndex

    if (content.includes('(')) {
      i++

      while (i < lines.length && !lines[i].trim().startsWith(')')) {
        content += '\n' + lines[i]
        i++
      }

      if (i < lines.length) {
        content += '\n' + lines[i]
      }

      return { content, endIndex: i }
    }

    return { content, endIndex: startIndex }
  }

  private static parseVarBlock(
    block: { content: string; endIndex: number },
    startLine: number
  ): VariableDeclaration[] {
    const variables: VariableDeclaration[] = []
    const lines = block.content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine === '(' || trimmedLine === ')') continue

      if (trimmedLine.startsWith('var')) {
        continue // Skip the var keyword line
      }

      const varMatch = trimmedLine.match(/^(\w+)\s+(\w+)/)
      if (varMatch) {
        variables.push({
          name: varMatch[1],
          type: varMatch[2],
          line: startLine,
          codeSnippet: trimmedLine,
          comments: this.extractCommentsForLine(trimmedLine, startLine)
        })
      }
    }

    return variables
  }

  private static extractFunctionBlock(
    lines: string[],
    startIndex: number
  ): { content: string; endIndex: number } | null {
    let content = lines[startIndex]
    let i = startIndex
    let braceCount = 0

    if (content.includes('{')) {
      braceCount++
      i++

      while (i < lines.length && braceCount > 0) {
        const line = lines[i]
        if (line.includes('{')) braceCount++
        if (line.includes('}')) braceCount--

        content += '\n' + line
        i++
      }

      return { content, endIndex: i - 1 }
    }

    return { content, endIndex: startIndex }
  }

  private static parseFunction(
    block: { content: string; endIndex: number },
    startLine: number
  ): FunctionDeclaration {
    const lines = block.content.split('\n')
    const firstLine = lines[0].trim()

    // Parse function signature
    const funcMatch = firstLine.match(/func\s+(?:\(([^)]+)\)\s+)?(\w+)\(([^)]*)\)\s*(.*)/)
    if (!funcMatch) {
      return {
        name: 'unknown',
        parameters: [],
        returnType: 'void',
        line: startLine,
        codeSnippet: block.content,
        comments: [],
        receiver: ''
      }
    }

    const receiver = funcMatch[1] || ''
    const name = funcMatch[2]
    const paramsStr = funcMatch[3] || ''
    const returnType = funcMatch[4] || 'void'

    const parameters = this.parseParameters(paramsStr)

    return {
      name,
      parameters,
      returnType: returnType.trim(),
      line: startLine,
      codeSnippet: block.content,
      comments: this.extractCommentsForLine(block.content, startLine),
      receiver: receiver.trim()
    }
  }

  private static parseParameters(paramsStr: string): Parameter[] {
    if (!paramsStr.trim()) return []

    const params: Parameter[] = []
    const paramParts = paramsStr.split(',')

    for (const part of paramParts) {
      const trimmed = part.trim()
      if (!trimmed) continue

      const paramMatch = trimmed.match(/^(\w+)\s+(\w+)/)
      if (paramMatch) {
        params.push({
          name: paramMatch[1],
          type: paramMatch[2]
        })
      } else {
        // Handle anonymous parameters or complex types
        const typeMatch = trimmed.match(/^(\w+)$/)
        if (typeMatch) {
          params.push({
            name: '',
            type: typeMatch[1]
          })
        }
      }
    }

    return params
  }

  private static extractCommentsForLine(content: string, _lineNumber: number): string[] {
    const comments: string[] = []
    const lines = content.split('\n')

    // Look for comments on the same line or immediately before
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (i === 0 && line.startsWith('//')) {
        comments.push(line.substring(2).trim())
      }

      if (i > 0 && lines[i - 1].trim().startsWith('//')) {
        comments.push(lines[i - 1].trim().substring(2).trim())
      }
    }

    return comments
  }
}

// Utility function to analyze entire project
export async function analyzeProject(projectPath: string): Promise<CodeStructure[]> {
  const { getGoFilesRecursive } = await import('./apiFlowUtils')
  const goFiles = await getGoFilesRecursive(projectPath)
  const structures: CodeStructure[] = []

  for (const filePath of goFiles) {
    const structure = ASTParser.parseFile(filePath, projectPath)
    structures.push(structure)
  }

  return structures
}

export async function analyzeProjectSymbols(projectPath: string): Promise<ProjectSymbol[]> {
  const { getGoFilesRecursive } = await import('./apiFlowUtils')
  const goFiles = await getGoFilesRecursive(projectPath)
  const symbols: ProjectSymbol[] = []

  for (const filePath of goFiles) {
    const structure = ASTParser.parseFile(filePath, projectPath)

    // Collect all symbols
    structure.functions.forEach((f) =>
      symbols.push({
        name: f.name,
        type: 'function',
        file: structure.filePath,
        line: f.line
      })
    )

    structure.structs.forEach((s) =>
      symbols.push({
        name: s.name,
        type: 'struct',
        file: structure.filePath,
        line: s.line
      })
    )

    structure.interfaces.forEach((i) =>
      symbols.push({
        name: i.name,
        type: 'interface',
        file: structure.filePath,
        line: i.line
      })
    )

    structure.types.forEach((t) =>
      symbols.push({
        name: t.name,
        type: 'type',
        file: structure.filePath,
        line: t.line
      })
    )

    structure.constants.forEach((c) =>
      symbols.push({
        name: c.name,
        type: 'constant',
        file: structure.filePath,
        line: c.line
      })
    )

    structure.variables.forEach((v) =>
      symbols.push({
        name: v.name,
        type: 'variable',
        file: structure.filePath,
        line: v.line
      })
    )
  }

  return symbols
}
