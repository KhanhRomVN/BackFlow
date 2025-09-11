import React, { useState, useEffect } from 'react'
import { CodeStructure, UsageInfo } from '../../../../../../main/utils/astParser'

interface FileStructureViewerProps {
  projectPath: string
  codeStructures: CodeStructure[]
  onFileSelect: (filePath: string, line?: number, column?: number) => void
}

const FileStructureViewer: React.FC<FileStructureViewerProps> = ({
  projectPath,
  codeStructures,
  onFileSelect
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<any>(null)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [elementUsages, setElementUsages] = useState<Map<string, UsageInfo[]>>(new Map())
  const [loadingUsages, setLoadingUsages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const usagesMap = new Map<string, UsageInfo[]>()

    codeStructures.forEach((file) => {
      file.usages.forEach((usage) => {
        const key = `${usage.elementType}:${usage.elementName}`
        if (!usagesMap.has(key)) {
          usagesMap.set(key, [])
        }
        usagesMap.get(key)!.push(usage)
      })
    })

    setElementUsages(usagesMap)
  }, [codeStructures])

  const loadCrossFileUsages = async (elementName: string, elementType: string) => {
    const key = `${elementType}:${elementName}`
    if (loadingUsages.has(key)) return

    setLoadingUsages((prev) => new Set(prev).add(key))

    try {
      const result = await window.electron.ipcRenderer.invoke('ast:getElementUsages', {
        projectPath,
        elementName,
        elementType,
        filePath: selectedFile
      })

      if (result.success) {
        setElementUsages((prev) => {
          const newMap = new Map(prev)
          const existingUsages = newMap.get(key) || []
          newMap.set(key, [...existingUsages, ...result.usages])
          return newMap
        })
      }
    } catch (error) {
      console.error('Error loading cross-file usages:', error)
    } finally {
      setLoadingUsages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }

  const handleFileClick = (filePath: string) => {
    setSelectedFile(filePath)
    setSelectedElement(null)
    if (expandedFiles.has(filePath)) {
      setExpandedFiles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(filePath)
        return newSet
      })
    } else {
      setExpandedFiles((prev) => new Set(prev).add(filePath))
    }
  }

  const handleElementClick = async (element: any, elementType: string) => {
    setSelectedElement({ ...element, elementType })

    if (element.line) {
      onFileSelect(selectedFile!, element.line)
    }

    const key = `${elementType}:${element.name}`
    const currentUsages = elementUsages.get(key) || []

    if (currentUsages.length === 0) {
      await loadCrossFileUsages(element.name, elementType)
    }
  }

  const handleUsageClick = (usage: UsageInfo) => {
    onFileSelect(usage.file, usage.line, usage.column)
  }

  const getUsagesForElement = (elementName: string, elementType: string) => {
    const key = `${elementType}:${elementName}`
    return elementUsages.get(key) || []
  }

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith('.go')) return '🟢'
    if (filePath.endsWith('.mod')) return '📦'
    if (filePath.endsWith('.sum')) return '🔒'
    return '📄'
  }

  const renderUsageItem = (usage: UsageInfo) => (
    <div
      key={`${usage.file}:${usage.line}:${usage.column}`}
      className="p-2 hover:bg-blue-900 cursor-pointer rounded text-xs"
      onClick={() => handleUsageClick(usage)}
      title={`Click to navigate to line ${usage.line}`}
    >
      <div className="flex justify-between items-center">
        <span className="text-blue-300">{usage.file.split('/').pop()}</span>
        <span className="text-gray-400">Line {usage.line}</span>
      </div>
      <div className="mt-1 text-gray-300 font-mono bg-gray-800 p-1 rounded">
        {usage.context.length > 60 ? `${usage.context.substring(0, 60)}...` : usage.context}
      </div>
    </div>
  )

  const renderElement = (element: any, type: string) => {
    const usages = getUsagesForElement(element.name, type)
    const isLoading = loadingUsages.has(`${type}:${element.name}`)

    return (
      <div key={`${type}-${element.name}`} className="mb-2">
        <div
          className="p-2 hover:bg-gray-700 cursor-pointer rounded"
          onClick={() => handleElementClick(element, type)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {type === 'function' && '⚡ '}
              {type === 'struct' && '🏗️ '}
              {type === 'interface' && '📜 '}
              {type === 'type' && '📋 '}
              {type === 'constant' && '🔒 '}
              {type === 'variable' && '📊 '}
              {element.name}
            </span>
            <div className="flex items-center space-x-2">
              {element.line && <span className="text-xs text-gray-400">Line {element.line}</span>}
              {usages.length > 0 && (
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                  {usages.length} usage{usages.length !== 1 ? 's' : ''}
                </span>
              )}
              {isLoading && (
                <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded-full">
                  Loading...
                </span>
              )}
            </div>
          </div>
          {element.codeSnippet && (
            <pre className="text-xs mt-1 bg-gray-800 p-2 rounded overflow-x-auto">
              {element.codeSnippet}
            </pre>
          )}
        </div>

        {usages.length > 0 && (
          <div className="ml-4 mt-1 border-l border-gray-600 pl-2">
            <div className="text-xs text-gray-400 mb-1">Used in:</div>
            {usages.slice(0, 3).map(renderUsageItem)}
            {usages.length > 3 && (
              <div className="text-xs text-gray-500 italic">
                + {usages.length - 3} more usage{usages.length - 3 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderFileStructure = (file: CodeStructure) => {
    if (!expandedFiles.has(file.filePath)) return null

    return (
      <div className="ml-4 border-l border-gray-700 pl-2">
        {file.imports.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">📚 Imports</h4>
            {file.imports.map((imp) => (
              <div
                key={`import-${imp.path}`}
                className="p-2 hover:bg-gray-700 cursor-pointer rounded"
              >
                <div className="text-sm">{imp.path}</div>
                <div className="text-xs text-gray-400">Line {imp.line}</div>
              </div>
            ))}
          </div>
        )}

        {file.types.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">📋 Types</h4>
            {file.types.map((type) => renderElement(type, 'type'))}
          </div>
        )}

        {file.constants.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">🔒 Constants</h4>
            {file.constants.map((constant) => renderElement(constant, 'constant'))}
          </div>
        )}

        {file.variables.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">📊 Variables</h4>
            {file.variables.map((variable) => renderElement(variable, 'variable'))}
          </div>
        )}

        {file.functions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">⚡ Functions</h4>
            {file.functions.map((func) => renderElement(func, 'function'))}
          </div>
        )}

        {file.structs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">🏗️ Structs</h4>
            {file.structs.map((struct) => renderElement(struct, 'struct'))}
          </div>
        )}

        {file.interfaces.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">📜 Interfaces</h4>
            {file.interfaces.map((intf) => renderElement(intf, 'interface'))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 flex">
      <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">Project Files</h3>
          <div className="text-xs text-gray-400 mt-1">
            {codeStructures.length} files, {elementUsages.size} elements with usages
          </div>
        </div>
        <div className="p-2">
          {codeStructures.map((file) => (
            <div key={file.filePath}>
              <div
                className={`p-2 hover:bg-gray-700 cursor-pointer rounded flex items-center justify-between ${
                  selectedFile === file.filePath ? 'bg-gray-700' : ''
                }`}
                onClick={() => handleFileClick(file.filePath)}
              >
                <div className="flex items-center">
                  <span className="mr-2">{getFileIcon(file.filePath)}</span>
                  <span className="text-sm">{file.filePath}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {expandedFiles.has(file.filePath) ? '▼' : '▶'}
                </span>
              </div>
              {renderFileStructure(file)}
            </div>
          ))}
        </div>
      </div>

      <div className="w-2/3 bg-gray-800 overflow-y-auto">
        {selectedElement ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedElement.elementType === 'function' && '⚡ '}
                {selectedElement.elementType === 'struct' && '🏗️ '}
                {selectedElement.elementType === 'interface' && '📜 '}
                {selectedElement.elementType === 'type' && '📋 '}
                {selectedElement.elementType === 'constant' && '🔒 '}
                {selectedElement.elementType === 'variable' && '📊 '}
                {selectedElement.name}
              </h3>
              <span className="text-sm text-gray-400 capitalize">
                {selectedElement.elementType}
              </span>
            </div>

            {selectedElement.line && (
              <div className="mb-4 text-sm text-gray-400">
                Defined at line {selectedElement.line} in {selectedFile}
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Code:</h4>
              <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                <code>{selectedElement.codeSnippet}</code>
              </pre>
            </div>

            {selectedElement.comments && selectedElement.comments.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Comments:</h4>
                <div className="bg-gray-900 p-3 rounded text-sm">
                  {selectedElement.comments.map((comment: string, index: number) => (
                    <div key={index} className="text-gray-300 mb-1">
                      // {comment}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2">Usage Statistics:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-blue-400">Total Usages</div>
                  <div className="text-2xl font-bold">
                    {getUsagesForElement(selectedElement.name, selectedElement.elementType).length}
                  </div>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-green-400">In This File</div>
                  <div className="text-2xl font-bold">
                    {
                      getUsagesForElement(selectedElement.name, selectedElement.elementType).filter(
                        (usage) => usage.file === selectedFile
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a file element to view its details and usage information
          </div>
        )}
      </div>
    </div>
  )
}

export default FileStructureViewer
