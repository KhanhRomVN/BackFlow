import React, { useState, useEffect } from 'react'
import { CodeStructure } from '../../../../../../main/utils/astParser'

interface FileStructureViewerProps {
  filePath: string | null
  projectPath: string
  onElementSelect: (element: { line: number; column?: number }) => void
}

interface ASTElement {
  type: string
  name: string
  line: number
  codeSnippet: string
  comments: string[]
  metadata?: Record<string, any>
}

interface UsageReference {
  file: string
  line: number
  code: string
}

const FileStructureViewer: React.FC<FileStructureViewerProps> = ({
  filePath,
  projectPath,
  onElementSelect
}) => {
  const [astData, setAstData] = useState<CodeStructure | null>(null)
  const [selectedElement, setSelectedElement] = useState<ASTElement | null>(null)
  const [usageReferences, setUsageReferences] = useState<UsageReference[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (filePath) {
      loadASTData()
    }
  }, [filePath])

  const loadASTData = async () => {
    try {
      setIsLoading(true)
      const data = await window.electron.ipcRenderer.invoke('ast:analyzeFile', {
        projectPath,
        filePath
      })

      if (data.success) {
        setAstData(data.structure)

        // Load usage references for the current file
        if (selectedElement) {
          await loadUsageReferences(selectedElement.name)
        }
      }
    } catch (error) {
      console.error('Error loading AST data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsageReferences = async (symbolName: string) => {
    try {
      const references = await window.electron.ipcRenderer.invoke('go:findSymbolUsage', {
        projectPath,
        symbolName,
        filePath
      })
      setUsageReferences(references)
    } catch (error) {
      console.error('Error loading usage references:', error)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Add a function to find usage references
  const findUsageReferences = async (symbolName: string, filePath: string) => {
    try {
      const references = await window.electron.ipcRenderer.invoke('go:findSymbolUsage', {
        projectPath,
        symbolName,
        filePath
      })
      return references
    } catch (error) {
      console.error('Error finding usage references:', error)
      return []
    }
  }

  // Updated handleElementClick function - only shows details, doesn't navigate
  const handleElementClick = async (element: any, type: string) => {
    const astElement = { ...element, type }
    setSelectedElement(astElement)

    // Load usage references for this element
    const references = await findUsageReferences(element.name, filePath!)
    setUsageReferences(references)
  }

  // New handler for double-click events to navigate to code editor
  const handleElementDoubleClick = (element: any) => {
    onElementSelect({ line: element.line })
  }

  // Update the renderSection function to handle different element types
  const renderSection = (title: string, items: any[], type: string) => {
    if (!items || items.length === 0) return null
    const isExpanded = expandedSections.has(type)
    return (
      <div className="mb-2">
        <div
          className="flex items-center justify-between p-2 bg-gray-800 cursor-pointer rounded text-sm"
          onClick={() => toggleSection(type)}
        >
          <h3 className="font-semibold">
            {title} ({items.length})
          </h3>
          <span>{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="ml-2 mt-1 space-y-1 border-l border-gray-600 pl-2">
            {items.map((item) => (
              <div
                key={`${type}-${item.name}`}
                className="p-1 hover:bg-gray-700 cursor-pointer rounded text-xs"
                onClick={() => handleElementClick(item, type)}
                onDoubleClick={() => handleElementDoubleClick(item)}
                title="Single click to view details, double click to navigate to code"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-400">Line {item.line}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderUsageReferences = () => {
    if (!usageReferences.length) return null

    return (
      <div className="mt-6">
        <h4 className="font-medium text-gray-300 mb-2">Usage References</h4>
        <div className="space-y-2">
          {usageReferences.map((ref, index) => (
            <div
              key={index}
              className="bg-gray-800 p-3 rounded text-sm cursor-pointer hover:bg-gray-700"
              onClick={() =>
                window.electron.ipcRenderer.invoke('editor:openFile', {
                  file: ref.file,
                  line: ref.line
                })
              }
            >
              <div className="flex justify-between items-center">
                <span className="text-blue-400">{ref.file.split('/').pop()}</span>
                <span className="text-gray-400 text-xs">Line {ref.line}</span>
              </div>
              <pre className="text-xs mt-1 bg-gray-900 p-1 rounded overflow-x-auto">{ref.code}</pre>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!filePath) {
    return <div className="p-4 text-gray-400 text-sm">Select a file to view its structure</div>
  }

  if (isLoading) {
    return <div className="p-4 text-gray-400 text-sm">Loading file structure...</div>
  }

  if (!astData) {
    return <div className="p-4 text-gray-400 text-sm">Failed to load file structure</div>
  }

  return (
    <div className="h-full flex overflow-hidden bg-gray-900">
      {/* Structure Panel */}
      <div className="w-1/2 border-r border-gray-700 overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">{filePath.split('/').pop()}</h2>

        {renderSection('Imports', astData.imports, 'imports')}
        {renderSection('Types', astData.types, 'types')}
        {renderSection('Constants', astData.constants, 'constants')}
        {renderSection('Variables', astData.variables, 'variables')}
        {renderSection('Functions', astData.functions, 'functions')}
        {renderSection('Structs', astData.structs, 'structs')}
        {renderSection('Interfaces', astData.interfaces, 'interfaces')}
      </div>

      {/* Details Panel */}
      <div className="w-1/2 overflow-y-auto p-4">
        {selectedElement ? (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-200">{selectedElement.name}</h3>
            <div className="text-sm text-gray-400 mb-4">
              {selectedElement.type} • Line {selectedElement.line}
            </div>

            {selectedElement.comments && selectedElement.comments.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-300 mb-2">Documentation</h4>
                <div className="bg-gray-800 p-3 rounded text-sm">
                  {selectedElement.comments.map((comment, index) => (
                    <div key={index} className="text-gray-300 mb-1">
                      {comment}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedElement.codeSnippet && (
              <div>
                <h4 className="font-medium text-gray-300 mb-2">Code</h4>
                <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                  <code>{selectedElement.codeSnippet}</code>
                </pre>
              </div>
            )}

            {renderUsageReferences()}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            Select an element to view details
            <br />
            <span className="text-xs">
              Tip: Single click to view, double click to navigate to code
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileStructureViewer
