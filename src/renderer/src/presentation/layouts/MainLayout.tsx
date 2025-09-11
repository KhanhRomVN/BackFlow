import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../providers/theme-provider'

const MainLayout: React.FC = () => {
  const themeContext = useTheme()
  const location = useLocation()
  const [sidebarState, setSidebarState] = useState({
    folderOpen: true,
    diagramOpen: false
  })

  const { theme, setTheme } = themeContext

  // Check if we're in the editor page
  const isEditorPage = location.pathname === '/editor'

  useEffect(() => {
    console.log('Theme actually changed to:', theme)
  }, [theme])

  const toggleTheme = () => {
    let newTheme: 'light' | 'dark' | 'system'

    if (theme === 'light') {
      newTheme = 'dark'
    } else if (theme === 'dark') {
      newTheme = 'system'
    } else {
      newTheme = 'light'
    }

    try {
      setTheme(newTheme)
    } catch (error) {
      console.error('Error calling setTheme:', error)
    }
  }

  const handleFolderToggle = () => {
    if (!isEditorPage) return

    setSidebarState((prev) => ({
      ...prev,
      folderOpen: !prev.folderOpen
    }))

    // Send message to editor to toggle file explorer
    window.dispatchEvent(
      new CustomEvent('toggle-file-explorer', {
        detail: { isOpen: !sidebarState.folderOpen }
      })
    )
  }

  const handleDiagramToggle = () => {
    if (!isEditorPage) return

    setSidebarState((prev) => ({
      ...prev,
      diagramOpen: !prev.diagramOpen
    }))

    // Send message to editor to show main diagram
    window.dispatchEvent(
      new CustomEvent('show-main-diagram', {
        detail: { isOpen: !sidebarState.diagramOpen }
      })
    )
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️'
      case 'dark':
        return '🌙'
      case 'system':
        return '💻'
      default:
        return '🌙'
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light Theme'
      case 'dark':
        return 'Dark Theme'
      case 'system':
        return 'System Theme'
      default:
        return 'Theme'
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Primary Sidebar */}
      <aside className="w-12 h-full bg-sidebar-background flex flex-col">
        <div className="flex-1 flex flex-col items-center py-4 space-y-6">
          <button
            onClick={handleFolderToggle}
            className={`w-8 h-8 flex items-center justify-center text-lg rounded transition-colors ${
              sidebarState.folderOpen && isEditorPage
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
            } ${!isEditorPage ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Toggle File Explorer"
            disabled={!isEditorPage}
          >
            📁
          </button>

          <button
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 rounded transition-colors text-gray-300"
            title="Search"
          >
            🔍
          </button>

          <button
            onClick={handleDiagramToggle}
            className={`w-8 h-8 flex items-center justify-center text-lg rounded transition-colors ${
              sidebarState.diagramOpen && isEditorPage
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
            } ${!isEditorPage ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Show Main Flow Diagram"
            disabled={!isEditorPage}
          >
            👁️
          </button>
        </div>

        <div className="p-2 border-t border-gray-700 space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 rounded transition-colors text-gray-300"
            title={getThemeLabel()}
          >
            {getThemeIcon()}
          </button>

          {/* Settings Button */}
          <button
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 rounded transition-colors text-gray-300"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-sidebar-background">
          <div className="px-4 py-2">
            {/* Menu Items - Căn trái */}
            <nav>
              <div className="flex space-x-1">
                {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map(
                  (item) => (
                    <button
                      key={item}
                      className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
