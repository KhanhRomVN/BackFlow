import React, { useRef, useEffect, useState } from 'react'
import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'

// Configure Monaco Editor loader
loader.config({ monaco })

interface SymbolPosition {
  line: number
  column: number
  length: number
}

interface CodeEditorProps {
  filePath: string | null
  content: string
  onContentChange: (content: string) => void
  onFileSelect: (filePath: string, line?: number) => void
  targetLine?: number
  projectPath: string
}

// Utility functions
const getFileExtension = (filePath: string): string => {
  const lastDotIndex = filePath.lastIndexOf('.')
  if (lastDotIndex === -1) return ''
  return filePath.slice(lastDotIndex + 1).toLowerCase()
}

const getFileName = (filePath: string): string => {
  if (!filePath) return ''
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  content,
  onContentChange,
  onFileSelect,
  targetLine,
  projectPath
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoEl = useRef<HTMLDivElement>(null)
  const [highlightedSymbols, setHighlightedSymbols] = useState<SymbolPosition[]>([])
  const [decorations, setDecorations] = useState<string[]>([])

  const symbolHighlightStyle = `
    .symbol-highlight {
      background: rgba(255, 215, 0, 0.2);
      border-bottom: 1px solid #ffd700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .symbol-highlight:hover {
      background: rgba(255, 215, 0, 0.3);
      border-bottom: 2px solid #ffd700;
    }
    .definition-highlight {
      background: rgba(100, 149, 237, 0.2);
      border: 1px solid #6495ED;
      animation: fadeInOut 3s ease-in-out;
    }
    @keyframes fadeInOut {
      0% { background: rgba(100, 149, 237, 0.4); }
      50% { background: rgba(100, 149, 237, 0.2); }
      100% { background: rgba(100, 149, 237, 0.1); }
    }
  `

  const isSameFile = (path1: string, path2: string): boolean => {
    if (!path1 || !path2) return false
    const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase().trim()
    return normalize(path1) === normalize(path2)
  }

  const handleNavigation = async (symbolInfo: any, isCtrlPressed: boolean) => {
    console.log('Navigation attempt:', {
      symbolInfo,
      isCtrlPressed,
      currentFile: filePath,
      targetFile: symbolInfo.file,
      projectPath
    })

    const isSame = isSameFile(filePath || '', symbolInfo.file)

    if (isSame) {
      // Same file - just scroll to the line
      editorRef.current?.revealLineInCenter(symbolInfo.line)
      editorRef.current?.setPosition({
        lineNumber: symbolInfo.line,
        column: 1
      })
    } else {
      // Different file - need to open it
      console.log('Navigating to different file:', symbolInfo.file, 'line:', symbolInfo.line)

      try {
        const resolvedPath = await window.electron.ipcRenderer.invoke('fs:resolvePath', {
          inputPath: symbolInfo.file,
          projectPath: projectPath
        })
        console.log('Resolved path for navigation:', resolvedPath)

        // Call onFileSelect with resolved path and line number
        onFileSelect(resolvedPath, symbolInfo.line)
      } catch (error) {
        console.error('Error resolving path for navigation:', error)
        // Fallback - try with original path
        onFileSelect(symbolInfo.file, symbolInfo.line)
      }
    }
  }

  // Get file language based on extension
  const getLanguageFromFilePath = (filePath: string): string => {
    const ext = getFileExtension(filePath)
    switch (ext) {
      case 'go':
        return 'go'
      case 'js':
        return 'javascript'
      case 'ts':
        return 'typescript'
      case 'jsx':
        return 'javascript'
      case 'tsx':
        return 'typescript'
      case 'py':
        return 'python'
      case 'java':
        return 'java'
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp'
      case 'c':
        return 'c'
      case 'cs':
        return 'csharp'
      case 'php':
        return 'php'
      case 'rb':
        return 'ruby'
      case 'rs':
        return 'rust'
      case 'swift':
        return 'swift'
      case 'kt':
        return 'kotlin'
      case 'dart':
        return 'dart'
      case 'json':
        return 'json'
      case 'xml':
        return 'xml'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'scss':
        return 'scss'
      case 'less':
        return 'less'
      case 'md':
        return 'markdown'
      case 'yml':
      case 'yaml':
        return 'yaml'
      case 'toml':
        return 'toml'
      case 'ini':
        return 'ini'
      case 'sh':
        return 'shell'
      case 'ps1':
        return 'powershell'
      case 'bat':
        return 'bat'
      case 'dockerfile':
        return 'dockerfile'
      case 'sql':
        return 'sql'
      default:
        return 'text'
    }
  }

  const handleGoToDefinition = async (position: monaco.Position) => {
    if (!filePath?.endsWith('.go')) return

    try {
      console.log('F12 pressed - Getting definition...')

      const definition = await window.electron.ipcRenderer.invoke('go:getDefinition', {
        filePath: filePath,
        line: position.lineNumber,
        column: position.column
      })

      if (definition && definition.file && definition.range) {
        const isSame = isSameFile(filePath || '', definition.file)
        const targetLine = definition.range.startLine

        if (isSame) {
          editorRef.current?.revealLineInCenter(targetLine)
          editorRef.current?.setPosition({
            lineNumber: targetLine,
            column: definition.range.startColumn || 1
          })
        } else {
          if (typeof targetLine === 'number' && targetLine > 0) {
            onFileSelect(definition.file, targetLine)
          } else {
            onFileSelect(definition.file)
          }
        }
      }
    } catch (error) {
      console.error('Error in F12 handler:', error)
    }
  }

  useEffect(() => {
    if (monacoEl.current) {
      const language = filePath ? getLanguageFromFilePath(filePath) : 'text'

      // Initialize Monaco Editor
      editorRef.current = monaco.editor.create(monacoEl.current, {
        value: content,
        language: language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        wordWrap: 'on',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        renderIndentGuides: true,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'always',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: true,
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        mouseWheelZoom: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on',
        wordBasedSuggestions: true
      })

      // Handle content changes
      editorRef.current.onDidChangeModelContent(() => {
        const newValue = editorRef.current?.getValue() || ''
        onContentChange(newValue)
      })

      // Disable built-in definition and hover providers for Go to avoid conflicts
      if (language === 'go') {
        // Disable built-in go-to-definition
        const model = editorRef.current.getModel()
        if (model) {
          // Override F12 and Ctrl+Click behavior
          editorRef.current.addCommand(monaco.KeyCode.F12, () => {
            const position = editorRef.current?.getPosition()
            if (position) {
              handleGoToDefinition(position)
            }
          })

          // Disable context menu go to definition and some conflicting features
          editorRef.current.updateOptions({
            contextmenu: false, // Disable to avoid conflicts
            gotoLocation: {
              multipleTypeDefinitions: 'goto',
              multipleDeclarations: 'goto',
              multipleImplementations: 'goto',
              multipleReferences: 'goto'
            }
          })
        }

        // Configure Go language features
        monaco.languages.registerDefinitionProvider('go', {
          provideDefinition: async (model, position) => {
            try {
              console.log('Monaco Definition provider called:', {
                filePath,
                line: position.lineNumber,
                column: position.column
              })

              const definition = await window.electron.ipcRenderer.invoke('go:getDefinition', {
                filePath: filePath,
                line: position.lineNumber,
                column: position.column
              })

              console.log('Monaco Definition result:', definition)

              if (definition) {
                return {
                  uri: monaco.Uri.file(definition.file),
                  range: new monaco.Range(
                    definition.range.startLine,
                    definition.range.startColumn,
                    definition.range.endLine,
                    definition.range.endColumn
                  )
                }
              }
            } catch (error) {
              console.error('Error in Monaco definition provider:', error)
            }
            return null
          }
        })

        // Configure hover provider
        monaco.languages.registerHoverProvider('go', {
          provideHover: async (model, position) => {
            try {
              const word = model.getWordAtPosition(position)
              if (!word) return null

              const symbolInfo = await window.electron.ipcRenderer.invoke('go:getSymbolInfo', {
                filePath,
                symbol: word.word
              })

              if (symbolInfo) {
                return {
                  range: new monaco.Range(
                    position.lineNumber,
                    word.startColumn,
                    position.lineNumber,
                    word.endColumn
                  ),
                  contents: [
                    { value: `**${symbolInfo.type}**: ${symbolInfo.name}` },
                    { value: `File: ${symbolInfo.file}:${symbolInfo.line}` },
                    { value: `\`\`\`go\n${symbolInfo.signature}\n\`\`\`` }
                  ]
                }
              }
            } catch (error) {
              console.error('Error getting hover info:', error)
            }
            return null
          }
        })
      }
    }

    return () => {
      editorRef.current?.dispose()
    }
  }, [])

  // Update content synchronization
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.getValue()) {
      const position = editorRef.current.getPosition()
      editorRef.current.setValue(content)
      if (position) {
        editorRef.current.setPosition(position)
      }
    }
  }, [content])

  // Update language when file changes
  useEffect(() => {
    if (editorRef.current && filePath) {
      const model = editorRef.current.getModel()
      if (model) {
        const language = getLanguageFromFilePath(filePath)
        monaco.editor.setModelLanguage(model, language)
      }
    }
  }, [filePath])

  // Handle target line scrolling
  useEffect(() => {
    if (editorRef.current && targetLine && targetLine > 0) {
      console.log('Scrolling to target line:', targetLine)
      setTimeout(() => {
        editorRef.current?.revealLineInCenter(targetLine)
        editorRef.current?.setPosition({
          lineNumber: targetLine,
          column: 1
        })

        // Highlight the target line briefly
        const targetDecorations = editorRef.current?.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(targetLine, 1, targetLine, 1),
              options: {
                isWholeLine: true,
                className: 'definition-highlight'
              }
            }
          ]
        )

        // Remove highlight after 3 seconds
        setTimeout(() => {
          if (targetDecorations && editorRef.current) {
            editorRef.current.deltaDecorations(targetDecorations, [])
          }
        }, 3000)
      }, 100)
    }
  }, [targetLine])

  // Enhanced symbol highlighting and navigation
  useEffect(() => {
    if (editorRef.current) {
      // Disable Monaco's built-in go-to-definition to avoid conflicts
      editorRef.current.updateOptions({
        gotoLocation: {
          multipleTypeDefinitions: 'goto',
          multipleDeclarations: 'goto',
          multipleImplementations: 'goto',
          multipleReferences: 'goto'
        }
      })

      const mouseDownDisposable = editorRef.current.onMouseDown(async (event) => {
        // Only handle content text clicks
        if (event.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
          return
        }

        const model = editorRef.current?.getModel()
        if (!model) return

        const position = event.target.position
        if (!position) return

        const word = model.getWordAtPosition(position)
        if (!word) return

        const isCtrlPressed = event.event.ctrlKey || event.event.metaKey

        console.log('Mouse click detected:', {
          word: word.word,
          position: { line: position.lineNumber, column: position.column },
          isCtrlPressed,
          filePath,
          targetType: event.target.type
        })

        // Prevent default Monaco behavior for Ctrl+Click
        if (isCtrlPressed) {
          event.event.preventDefault()
          event.event.stopPropagation()
        }

        try {
          // Only handle Go files with language server features
          if (filePath?.endsWith('.go')) {
            if (isCtrlPressed) {
              console.log('Ctrl+Click: Getting definition...')

              // Get definition from language server
              const definition = await window.electron.ipcRenderer.invoke('go:getDefinition', {
                filePath: filePath,
                line: position.lineNumber,
                column: position.column
              })

              console.log('Definition received:', definition)

              if (definition && definition.file && definition.range) {
                const isSame = isSameFile(filePath || '', definition.file)
                const targetLine = definition.range.startLine

                console.log('Navigation decision:', {
                  isSame,
                  targetFile: definition.file,
                  targetLine,
                  currentFile: filePath
                })

                if (isSame) {
                  // Same file navigation
                  console.log('Same file navigation to line:', targetLine)
                  editorRef.current?.revealLineInCenter(targetLine)
                  editorRef.current?.setPosition({
                    lineNumber: targetLine,
                    column: definition.range.startColumn || 1
                  })
                } else {
                  // Different file navigation
                  console.log('Cross-file navigation:', {
                    file: definition.file,
                    line: targetLine
                  })

                  // IMPORTANT: Make sure we pass a valid number
                  if (typeof targetLine === 'number' && targetLine > 0) {
                    onFileSelect(definition.file, targetLine)
                  } else {
                    console.warn('Invalid target line:', targetLine)
                    onFileSelect(definition.file)
                  }
                }
              } else {
                console.log('No definition found for symbol:', word.word)
              }
            } else {
              // Regular click: Show symbol info
              console.log('Regular click: Getting symbol info...')

              const symbolInfo = await window.electron.ipcRenderer.invoke('go:getSymbolInfo', {
                filePath,
                symbol: word.word
              })

              if (symbolInfo) {
                console.log('Symbol info received:', symbolInfo)

                // Clear previous decorations
                if (decorations.length > 0) {
                  editorRef.current?.deltaDecorations(decorations, [])
                }

                // Add new decoration
                const newDecorations =
                  editorRef.current?.deltaDecorations(
                    [],
                    [
                      {
                        range: new monaco.Range(
                          position.lineNumber,
                          word.startColumn,
                          position.lineNumber,
                          word.endColumn
                        ),
                        options: {
                          inlineClassName: 'symbol-highlight',
                          hoverMessage: {
                            value: `**${symbolInfo.type}**: ${symbolInfo.name}\n\nCtrl+Click to go to definition\n\nFile: ${symbolInfo.file}:${symbolInfo.line}`
                          }
                        }
                      }
                    ]
                  ) || []

                setDecorations(newDecorations)

                // Auto-remove highlight after 3 seconds
                setTimeout(() => {
                  if (editorRef.current) {
                    editorRef.current.deltaDecorations(newDecorations, [])
                    setDecorations([])
                  }
                }, 3000)
              }
            }
          } else if (isCtrlPressed) {
            // For non-Go files, basic word search navigation
            console.log('Non-Go file: Basic word search navigation')
            const searchText = word.word
            const model = editorRef.current?.getModel()
            if (model) {
              const matches = model.findMatches(searchText, false, false, false, null, true)
              if (matches.length > 1) {
                const currentLineNumber = position.lineNumber
                const nextMatch =
                  matches.find((match) => match.range.startLineNumber > currentLineNumber) ||
                  matches[0]

                editorRef.current?.revealLineInCenter(nextMatch.range.startLineNumber)
                editorRef.current?.setPosition({
                  lineNumber: nextMatch.range.startLineNumber,
                  column: nextMatch.range.startColumn
                })
              }
            }
          }
        } catch (error) {
          console.error('Error in mouse click handler:', error)
        }
      })

      return () => {
        mouseDownDisposable?.dispose()
      }
    }
  }, [filePath, onFileSelect, projectPath, decorations])

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-300">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-semibold text-gray-100 mb-2">Welcome to Code Editor</h3>
          <p className="text-gray-400 mb-6 max-w-md">
            Select a file from the Explorer to start coding. The editor supports syntax highlighting
            for multiple languages and advanced features for Go development.
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>
              <strong>Supported Languages:</strong>
            </p>
            <p>Go, TypeScript, JavaScript, Python, Java, C++, Rust, and more...</p>
            <br />
            <p>
              <strong>Navigation Shortcuts:</strong>
            </p>
            <p>• Click to select • Ctrl+Click to navigate (Go files)</p>
            <p>• F12 for Go to Definition • Ctrl+S to Save</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <style>{symbolHighlightStyle}</style>

      {/* Header with file info */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-2">
              {filePath.endsWith('.go') && '🟢'}
              {filePath.endsWith('.ts') && '🔷'}
              {filePath.endsWith('.js') && '🟨'}
              {filePath.endsWith('.md') && '📝'}
              {!filePath.endsWith('.go') &&
                !filePath.endsWith('.ts') &&
                !filePath.endsWith('.js') &&
                !filePath.endsWith('.md') &&
                '📄'}
            </span>
            <h3 className="text-sm font-medium text-gray-200 truncate">{getFileName(filePath)}</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-400">
              {getLanguageFromFilePath(filePath).toUpperCase()}
            </div>
            <div className="text-xs text-gray-400">
              {filePath.endsWith('.go')
                ? 'Ctrl+Click or F12 for Go to Definition'
                : 'Basic navigation available'}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <div ref={monacoEl} className="h-full" />
      </div>
    </div>
  )
}

export default CodeEditor
