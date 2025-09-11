import React from 'react'
import { TabFile } from '../types'

interface TabBarProps {
  tabs: TabFile[]
  activeTabId: string | null
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabSave: (tabId: string) => void
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabSave
}) => {
  const handleTabClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    onTabSelect(tabId)
  }

  const handleTabCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    onTabClose(tabId)
  }

  const handleTabSaveClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    onTabSave(tabId)
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      // Middle mouse button
      e.preventDefault()
      onTabClose(tabId)
    }
  }

  const getFileIcon = (fileName: string) => {
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
      case 'js':
      case 'jsx':
        return '🟨'
      case 'ts':
      case 'tsx':
        return '🔷'
      default:
        return '📄'
    }
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700 flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
      <div className="flex">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              relative flex items-center px-3 py-2 border-r border-gray-700 cursor-pointer group min-w-0 max-w-xs
              transition-colors duration-150
              ${
                activeTabId === tab.id
                  ? 'bg-gray-700 text-white border-t-2 border-t-blue-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
            onClick={(e) => handleTabClick(e, tab.id)}
            onMouseDown={(e) => handleMiddleClick(e, tab.id)}
            title={`${tab.path}${tab.isDirty ? ' • Modified' : ''}`}
          >
            {/* File Icon */}
            <span className="mr-2 flex-shrink-0 text-xs">{getFileIcon(tab.name)}</span>

            {/* Tab Name */}
            <span
              className={`
              truncate text-xs flex-1
              ${activeTabId === tab.id ? 'text-white' : 'text-gray-300'}
            `}
            >
              {tab.name}
            </span>

            {/* Dirty Indicator */}
            {tab.isDirty && <span className="ml-1 text-white text-sm">●</span>}

            {/* Action Buttons Container */}
            <div className="flex items-center ml-2">
              {/* Save Button (only show when dirty and on hover) */}
              {tab.isDirty && (
                <button
                  className={`
                    p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-gray-600
                    transition-all duration-150
                    ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}
                  onClick={(e) => handleTabSaveClick(e, tab.id)}
                  title="Save (Ctrl+S)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                  </svg>
                </button>
              )}

              {/* Close Button */}
              <button
                className={`
                  p-1 rounded text-gray-400 hover:text-white hover:bg-gray-600
                  transition-all duration-150
                  ${
                    activeTabId === tab.id || tab.isDirty
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }
                `}
                onClick={(e) => handleTabCloseClick(e, tab.id)}
                title="Close (Ctrl+W, Middle Click)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Active Tab Indicator */}
            {activeTabId === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
            )}
          </div>
        ))}
      </div>

      {/* Tab Actions */}
      <div className="flex items-center px-2">
        <button
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
          title="New Tab (Ctrl+T)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TabBar
