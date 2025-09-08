import React, { useState, useEffect } from 'react'
import { FileItem } from '../types'

interface FileNode extends FileItem {
  children?: FileNode[]
  isExpanded?: boolean
  level: number
}

interface FileExplorerProps {
  files: FileItem[]
  onFileSelect: (filePath: string, isDirectory: boolean) => void
  isLoading: boolean
  projectPath: string
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  isLoading,
  projectPath
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (files.length > 0) {
      const tree = buildFileTree(files, 0)
      setFileTree(tree)
      // Auto-expand root level folders
      const rootFolders = files.filter((f) => f.isDirectory).map((f) => f.path)
      setExpandedFolders(new Set(rootFolders))
    }
  }, [files])

  const buildFileTree = (items: FileItem[], level: number): FileNode[] => {
    const sorted = [...items].sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return sorted.map((item) => ({
      ...item,
      level,
      isExpanded: expandedFolders.has(item.path)
    }))
  }

  const loadDirectoryContents = async (dirPath: string): Promise<FileItem[]> => {
    try {
      return await window.electron.ipcRenderer.invoke('fs:readDirectory', dirPath)
    } catch (error) {
      console.error('Error loading directory:', error)
      return []
    }
  }

  const handleToggleExpand = async (node: FileNode) => {
    if (!node.isDirectory) return

    const newExpandedFolders = new Set(expandedFolders)

    if (expandedFolders.has(node.path)) {
      // Collapse
      newExpandedFolders.delete(node.path)
    } else {
      // Expand
      newExpandedFolders.add(node.path)

      // Load children if not already loaded
      if (!node.children) {
        const children = await loadDirectoryContents(node.path)
        const childNodes = buildFileTree(children, node.level + 1)

        // Update the tree with children
        setFileTree((prevTree) => updateTreeWithChildren(prevTree, node.path, childNodes))
      }
    }

    setExpandedFolders(newExpandedFolders)
  }

  const updateTreeWithChildren = (
    tree: FileNode[],
    targetPath: string,
    children: FileNode[]
  ): FileNode[] => {
    return tree.map((node) => {
      if (node.path === targetPath) {
        return {
          ...node,
          children,
          isExpanded: true
        }
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeWithChildren(node.children, targetPath, children)
        }
      }
      return node
    })
  }

  const handleFileClick = (node: FileNode) => {
    if (node.isDirectory) {
      handleToggleExpand(node)
    } else {
      onFileSelect(node.path, false)
    }
  }

  const renderTree = (nodes: FileNode[]): JSX.Element[] => {
    const result: JSX.Element[] = []

    for (const node of nodes) {
      result.push(
        <div key={node.path}>
          {/* File/Folder Item */}
          <div
            className={`
              flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer
              text-sm select-none group
              ${node.isDirectory ? 'text-gray-200' : 'text-gray-300'}
            `}
            style={{ paddingLeft: `${node.level * 16 + 8}px` }}
            onClick={() => handleFileClick(node)}
          >
            {/* Expand/Collapse Arrow */}
            {node.isDirectory && (
              <span className="w-4 h-4 flex items-center justify-center mr-1 text-gray-400">
                {expandedFolders.has(node.path) ? '▼' : '▶'}
              </span>
            )}

            {/* File Icon */}
            <span className="mr-2 flex-shrink-0">{getFileIcon(node.name, node.isDirectory)}</span>

            {/* File Name */}
            <span className="truncate flex-1 text-xs">{node.name}</span>
          </div>

          {/* Children (if expanded) */}
          {node.isDirectory &&
            expandedFolders.has(node.path) &&
            node.children &&
            renderTree(node.children)}
        </div>
      )
    }

    return result
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-900 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 ml-4"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 ml-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Explorer</h3>
          <button
            onClick={() => window.location.reload()}
            className="text-gray-400 hover:text-gray-200 p-1"
            title="Refresh"
          >
            ↻
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1 truncate" title={projectPath}>
          {projectPath.split('/').pop() || 'Project'}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-1">
          {fileTree.length > 0 ? (
            renderTree(fileTree)
          ) : (
            <div className="p-4 text-gray-500 text-sm text-center">No files found</div>
          )}
        </div>
      </div>
    </div>
  )
}

const getFileIcon = (fileName: string, isDirectory: boolean) => {
  if (isDirectory) {
    return '📁'
  }

  const ext = fileName.toLowerCase().split('.').pop()

  switch (ext) {
    case 'go':
      return '🟢'
    case 'md':
      return '📝'
    case 'json':
      return '⚙️'
    case 'yml':
    case 'yaml':
      return '📋'
    case 'mod':
      return '📦'
    case 'sum':
      return '🔒'
    case 'txt':
      return '📄'
    case 'js':
    case 'jsx':
      return '🟨'
    case 'ts':
    case 'tsx':
      return '🔷'
    case 'css':
      return '🎨'
    case 'html':
      return '🌐'
    case 'gitignore':
    case 'git':
      return '🔀'
    default:
      return '📄'
  }
}

export default FileExplorer
