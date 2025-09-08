import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const HomePage = () => {
  const navigate = useNavigate()
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedParentPath, setSelectedParentPath] = useState('')

  const handleOpenFolder = async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0]
        navigate('/editor', { state: { folderPath } })
      }
    } catch (error) {
      console.error('Error opening folder:', error)
    }
  }

  const handleSelectParentDirectory = async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedParentPath(result.filePaths[0])
      }
    } catch (error) {
      console.error('Error selecting directory:', error)
    }
  }

  const handleCreateProjectClick = async () => {
    // First select the parent directory
    const result = await window.electron.dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) return

    setSelectedParentPath(result.filePaths[0])
    setShowProjectModal(true)
  }

  const handleCreateProject = async () => {
    if (!projectName) {
      alert('Please enter a project name')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(projectName)) {
      alert('Project name can only contain letters, numbers, and underscores.')
      return
    }

    if (!selectedParentPath) {
      alert('Please select a parent directory')
      return
    }

    try {
      const success = await window.electron.ipcRenderer.invoke('project:create', {
        parentPath: selectedParentPath,
        projectName
      })

      if (success) {
        alert(`Project "${projectName}" created successfully!`)
        setShowProjectModal(false)
        setProjectName('')
        setSelectedParentPath('')
        navigate('/editor', { state: { folderPath: `${selectedParentPath}/${projectName}` } })
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Error creating project: ' + error)
    }
  }

  const closeModal = () => {
    setShowProjectModal(false)
    setProjectName('')
    setSelectedParentPath('')
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Project</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Directory
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={selectedParentPath}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-600"
                  placeholder="Select directory"
                />
                <button
                  onClick={handleSelectParentDirectory}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-r-md"
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={closeModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="text-6xl mb-6">🔄</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Zentri IDE</h1>
          <p className="text-xl text-gray-600 mb-8">
            Visualize Go Backend Flow • Understand Function Calls • Navigate Code Structure
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Get Started</h2>
          <p className="text-gray-600 mb-6">
            Select a Go project directory to analyze its structure and visualize function call flows
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleOpenFolder}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              📁 Open Go Project
            </button>

            <button
              onClick={handleCreateProjectClick}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              🆕 Create New Project
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold">Flow Diagrams</div>
              <div>Visualize function calls</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold">Code Analysis</div>
              <div>Navigate through functions</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold">Real-time</div>
              <div>Live project monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
