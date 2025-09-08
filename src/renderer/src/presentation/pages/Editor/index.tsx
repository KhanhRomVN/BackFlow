import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import FileExplorer from './components/FileExplorer'
import CodeEditor from './components/CodeEditor'
import APIFlowTracer from './components/APIFlowTracer'
import TabBar from './components/TabBar'
import { FileItem, TabFile } from './types'

const getBasename = (filePath: string) => {
  return filePath.split(/[\\/]/).pop() || filePath
}

const EditorPage = () => {
  const location = useLocation()
  const folderPath = location.state?.folderPath
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileTree, setFileTree] = useState<FileItem[]>([])
  const [activeTab, setActiveTab] = useState<'editor' | 'flow'>('editor')
  const [isLoading, setIsLoading] = useState(true)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [navigationHistory, setNavigationHistory] = useState<
    Array<{ file: string; line?: number }>
  >([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined)
  const [openTabs, setOpenTabs] = useState<TabFile[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  useEffect(() => {
    if (folderPath) {
      loadProject()
      setupFileWatcher()
      setupEditorEventListeners()
    }
  }, [folderPath])

  // Listen for sidebar events
  useEffect(() => {
    const handleToggleFileExplorer = (event: CustomEvent) => {
      setShowFileExplorer(event.detail.isOpen)
    }

    window.addEventListener('toggle-file-explorer', handleToggleFileExplorer as EventListener)

    return () => {
      window.removeEventListener('toggle-file-explorer', handleToggleFileExplorer as EventListener)
    }
  }, [])

  const setupEditorEventListeners = () => {
    const handleOpenFileRequest = (event: any, data: { file: string; line?: number }) => {
      console.log('Received file open request:', data)
      handleFileOpen(data.file, data.line)
    }

    window.electron.ipcRenderer.on('editor:openFileRequested', handleOpenFileRequest)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('editor:openFileRequested')
    }
  }

  const loadProject = async () => {
    try {
      setIsLoading(true)
      const files = await window.electron.ipcRenderer.invoke('fs:readDirectory', folderPath)
      setFileTree(files)
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupFileWatcher = async () => {
    try {
      await window.electron.ipcRenderer.invoke('fs:watchDirectory', folderPath)

      window.electron.ipcRenderer.on('fs:fileChanged', (event, data) => {
        console.log('File changed:', data)
        loadProject()
      })
    } catch (error) {
      console.error('Error setting up file watcher:', error)
    }
  }

  const addToNavigationHistory = (file: string, line?: number) => {
    const newEntry = { file, line }
    const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1)
    newHistory.push(newEntry)

    if (newHistory.length > 50) {
      newHistory.shift()
    }

    setNavigationHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)
  }

  const navigateBack = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1
      const entry = navigationHistory[newIndex]
      setCurrentHistoryIndex(newIndex)
      loadFileContent(entry.file, entry.line)
    }
  }

  const navigateForward = () => {
    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1
      const entry = navigationHistory[newIndex]
      setCurrentHistoryIndex(newIndex)
      loadFileContent(entry.file, entry.line)
    }
  }

  const resolveFilePath = async (inputPath: string): Promise<string> => {
    try {
      return await window.electron.ipcRenderer.invoke('fs:resolvePath', {
        inputPath,
        projectPath: folderPath
      })
    } catch (error) {
      console.error('Error resolving file path:', error)
      return inputPath
    }
  }

  // Fixed loadFileContent function - không xóa tabs cũ
  const loadFileContent = async (filePath: string, targetLineNumber?: number) => {
    try {
      console.log('loadFileContent - Loading file:', filePath, 'target line:', targetLineNumber)

      const resolvedPath = await resolveFilePath(filePath)
      console.log('loadFileContent - Resolved path:', resolvedPath)

      const content = await window.electron.ipcRenderer.invoke('fs:readFile', resolvedPath)
      console.log('loadFileContent - File content loaded, length:', content.length)

      const tabId = resolvedPath
      const existingTabIndex = openTabs.findIndex((tab) => tab.id === tabId)

      // Update or create tab
      let newTabs = [...openTabs]
      if (existingTabIndex === -1) {
        const newTab: TabFile = {
          id: tabId,
          path: resolvedPath,
          name: getBasename(resolvedPath),
          content: content,
          isDirty: false,
          lastSaved: new Date()
        }
        newTabs.push(newTab)
        console.log('loadFileContent - Created new tab:', newTab.name)
      } else {
        newTabs[existingTabIndex] = {
          ...newTabs[existingTabIndex],
          content,
          isDirty: false
        }
        console.log('loadFileContent - Updated existing tab:', newTabs[existingTabIndex].name)
      }

      // Update all states
      setOpenTabs(newTabs)
      setActiveTabId(tabId)
      setSelectedFile(resolvedPath)
      setFileContent(content)
      setActiveTab('editor')

      console.log('loadFileContent - State updated, activeTabId:', tabId)

      // Handle target line scrolling
      if (targetLineNumber && targetLineNumber > 0) {
        console.log('loadFileContent - Setting target line:', targetLineNumber)
        // Use a longer delay to ensure everything is ready
        setTimeout(() => {
          setTargetLine(targetLineNumber)
          console.log('loadFileContent - Target line set:', targetLineNumber)
        }, 300)
      }
    } catch (error) {
      console.error('Error reading file:', error)

      // Fallback attempt
      try {
        console.log('Trying direct file access:', filePath)
        const content = await window.electron.ipcRenderer.invoke('fs:readFile', filePath)

        const tabId = filePath
        const existingTabIndex = openTabs.findIndex((tab) => tab.id === tabId)

        if (existingTabIndex === -1) {
          const newTab: TabFile = {
            id: tabId,
            path: filePath,
            name: getBasename(filePath),
            content: content,
            isDirty: false,
            lastSaved: new Date()
          }
          setOpenTabs((prev) => [...prev, newTab])
        }

        setActiveTabId(tabId)
        setSelectedFile(filePath)
        setFileContent(content)

        if (targetLineNumber) {
          setTargetLine(targetLineNumber)
          setTimeout(() => setTargetLine(undefined), 1000)
        }
      } catch (secondError) {
        console.error('Second attempt failed:', secondError)
        setFileContent('// Error reading file: ' + (error as Error).message)
      }
    }
  }

  const handleFileSelect = async (filePath: string, targetLineNumber?: number | boolean) => {
    console.log('handleFileSelect called:', {
      filePath,
      targetLineNumber,
      type: typeof targetLineNumber
    })

    // Chỉ coi là navigation request khi targetLineNumber là number và > 0
    if (typeof targetLineNumber === 'number' && targetLineNumber > 0) {
      console.log(
        'Navigation request detected, calling handleFileOpen with line:',
        targetLineNumber
      )
      await handleFileOpen(filePath, targetLineNumber)
      return
    }

    // Original file selection logic cho directories và regular file clicks
    console.log('Regular file selection, checking file stats')

    try {
      const stats = await window.electron.ipcRenderer.invoke('fs:getFileStats', filePath)

      if (stats && !stats.isDirectory) {
        // It's a file - check if it's a supported type
        if (
          filePath.endsWith('.go') ||
          filePath.endsWith('.ts') ||
          filePath.endsWith('.js') ||
          filePath.endsWith('.md')
        ) {
          addToNavigationHistory(filePath)
          await loadFileContent(filePath) // Không truyền targetLine ở đây
        }
      }
      // For directories, the FileExplorer will handle expansion internally
    } catch (error) {
      console.error('Error in handleFileSelect:', error)
    }
  }

  const handleFileOpen = async (filePath: string, targetLineNumber?: number) => {
    console.log('handleFileOpen called:', {
      filePath,
      targetLine: targetLineNumber,
      currentFolder: folderPath
    })

    try {
      const resolvedPath = await resolveFilePath(filePath)
      console.log('Resolved path for navigation:', resolvedPath)

      // Add to navigation history
      addToNavigationHistory(resolvedPath, targetLineNumber)

      // Load the file content
      await loadFileContent(resolvedPath, targetLineNumber)
    } catch (error) {
      console.error('Error in handleFileOpen:', error)
      // Fallback - try with original path
      addToNavigationHistory(filePath, targetLineNumber)
      await loadFileContent(filePath, targetLineNumber)
    }
  }

  // Improved tab management
  const handleTabSelect = (tabId: string) => {
    const tab = openTabs.find((t) => t.id === tabId)
    if (tab) {
      setActiveTabId(tabId)
      setSelectedFile(tab.path)
      setFileContent(tab.content)
    }
  }

  const handleTabClose = (tabId: string) => {
    const tabIndex = openTabs.findIndex((tab) => tab.id === tabId)
    if (tabIndex === -1) return

    const newTabs = openTabs.filter((tab) => tab.id !== tabId)
    setOpenTabs(newTabs)

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        // Switch to the adjacent tab (prefer right, then left)
        const nextTabIndex = tabIndex < newTabs.length ? tabIndex : newTabs.length - 1
        const nextTab = newTabs[nextTabIndex]
        handleTabSelect(nextTab.id)
      } else {
        // No tabs left
        setActiveTabId(null)
        setSelectedFile(null)
        setFileContent('')
      }
    }
  }

  // Update tab content when editor content changes
  const handleContentChange = (content: string) => {
    setFileContent(content)
    if (activeTabId) {
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, content, isDirty: tab.content !== content } : tab
        )
      )
    }
  }

  // Save file and update tab state
  const handleSaveFile = async (tabId: string) => {
    const tab = openTabs.find((t) => t.id === tabId)
    if (!tab) return

    try {
      await window.electron.ipcRenderer.invoke('fs:writeFile', tab.path, tab.content)
      setOpenTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isDirty: false, lastSaved: new Date() } : t))
      )
      console.log('File saved successfully:', tab.path)
    } catch (error) {
      console.error('Error saving file:', error)
    }
  }

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + Left Arrow: Go back
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateBack()
      }

      // Alt + Right Arrow: Go forward
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        navigateForward()
      }

      // Ctrl + S: Save current file
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        if (activeTabId) {
          handleSaveFile(activeTabId)
        }
      }

      // Ctrl + W: Close current tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
        event.preventDefault()
        if (activeTabId) {
          handleTabClose(activeTabId)
        }
      }

      // Ctrl + Tab: Switch to next tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') {
        event.preventDefault()
        if (openTabs.length > 1 && activeTabId) {
          const currentIndex = openTabs.findIndex((tab) => tab.id === activeTabId)
          const nextIndex = (currentIndex + 1) % openTabs.length
          handleTabSelect(openTabs[nextIndex].id)
        }
      }

      // Ctrl + Shift + Tab: Switch to previous tab
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Tab') {
        event.preventDefault()
        if (openTabs.length > 1 && activeTabId) {
          const currentIndex = openTabs.findIndex((tab) => tab.id === activeTabId)
          const prevIndex = currentIndex === 0 ? openTabs.length - 1 : currentIndex - 1
          handleTabSelect(openTabs[prevIndex].id)
        }
      }

      // Ctrl + Number: Switch to tab by index
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '9') {
        event.preventDefault()
        const tabIndex = parseInt(event.key) - 1
        if (tabIndex < openTabs.length) {
          handleTabSelect(openTabs[tabIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentHistoryIndex, navigationHistory, activeTabId, openTabs])

  if (!folderPath) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">No folder selected</h2>
          <p className="text-gray-600">Please go back and select a folder</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'editor'
                ? 'text-white bg-gray-700 border-b-2 border-blue-400'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'flow'
                ? 'text-white bg-gray-700 border-b-2 border-blue-400'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            API Flow Tracer
          </button>

          {/* Navigation Controls */}
          <div className="ml-auto flex items-center space-x-2 pr-4">
            <button
              onClick={navigateBack}
              disabled={currentHistoryIndex <= 0}
              className={`p-2 rounded text-sm transition-colors ${
                currentHistoryIndex <= 0
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title="Go Back (Alt + ←)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>
            <button
              onClick={navigateForward}
              disabled={currentHistoryIndex >= navigationHistory.length - 1}
              className={`p-2 rounded text-sm transition-colors ${
                currentHistoryIndex >= navigationHistory.length - 1
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title="Go Forward (Alt + →)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 11h12.17l-5.59-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4v-2z" />
              </svg>
            </button>

            {navigationHistory.length > 0 && (
              <span className="text-xs text-gray-400 px-2">
                {currentHistoryIndex + 1}/{navigationHistory.length}
              </span>
            )}

            {/* Toggle File Explorer */}
            <button
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              className="p-2 rounded text-sm text-gray-300 hover:text-white hover:bg-gray-700"
              title="Toggle File Explorer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar - Only show when editor is active and has tabs */}
      {activeTab === 'editor' && openTabs.length > 0 && (
        <TabBar
          tabs={openTabs}
          activeTabId={activeTabId}
          onTabSelect={handleTabSelect}
          onTabClose={handleTabClose}
          onTabSave={handleSaveFile}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer Sidebar */}
        {showFileExplorer && (
          <div className="w-64 border-r border-gray-700 overflow-hidden">
            <FileExplorer
              files={fileTree}
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
              projectPath={folderPath}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <CodeEditor
              filePath={selectedFile}
              content={fileContent}
              onContentChange={handleContentChange}
              onFileSelect={handleFileOpen}
              targetLine={targetLine}
              projectPath={folderPath}
            />
          )}

          {activeTab === 'flow' && (
            <APIFlowTracer projectPath={folderPath} selectedFile={selectedFile} />
          )}
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 text-gray-300 px-4 py-1 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>{selectedFile ? `${selectedFile.split('/').pop()}` : 'No file selected'}</span>
          {selectedFile && <span className="text-gray-500">{selectedFile}</span>}
          {isLoading && <span className="text-yellow-400">Loading...</span>}
          {targetLine && <span className="text-blue-400">Line {targetLine}</span>}
          {activeTabId && openTabs.find((t) => t.id === activeTabId)?.isDirty && (
            <span className="text-yellow-400">● Unsaved</span>
          )}
          {openTabs.length > 0 && (
            <span className="text-gray-500">
              {openTabs.length} file{openTabs.length !== 1 ? 's' : ''} open
            </span>
          )}
        </div>

        <div className="flex items-center space-x-6 text-gray-500">
          <span>Go</span>
          <span>UTF-8</span>
          <span>
            Ctrl+Click: Go to Definition | F12: Go to Definition | Ctrl+S: Save | Ctrl+W: Close
          </span>
        </div>
      </div>
    </div>
  )
}

export default EditorPage
