import React, { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

interface FunctionDef {
  name: string
  file: string
  line: number
  package: string
  params: string[]
  returns: string[]
}

interface FunctionCall {
  callerFunc: string
  callerFile: string
  callerLine: number
  calledFunc: string
  calledFile?: string
  calledLine?: number
  package: string
}

interface CallGraph {
  functions: FunctionDef[]
  calls: FunctionCall[]
}

interface FlowDiagramProps {
  projectPath: string
  selectedFile?: string | null
}

const nodeWidth = 200
const nodeHeight = 100

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = direction === 'LR' ? 'left' : 'top'
    node.sourcePosition = direction === 'LR' ? 'right' : 'bottom'

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2
    }

    return node
  })

  return { nodes, edges }
}

const FlowDiagram: React.FC<FlowDiagramProps> = ({ projectPath, selectedFile }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [callGraph, setCallGraph] = useState<CallGraph | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterPackage, setFilterPackage] = useState<string>('all')
  const [highlightedFile, setHighlightedFile] = useState<string>('')
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('LR')
  const [showOnlyConnected, setShowOnlyConnected] = useState(true)

  // Load call graph data
  useEffect(() => {
    if (projectPath) {
      loadCallGraph()
    }
  }, [projectPath])

  // Update visualization when call graph changes
  useEffect(() => {
    if (callGraph) {
      generateFlowVisualization()
    }
  }, [callGraph, filterPackage, highlightedFile, layoutDirection, showOnlyConnected])

  // Listen for file open requests from main process
  useEffect(() => {
    const handleFileOpenRequest = (_event: any, { file, line }: { file: string; line: number }) => {
      console.log('Open file requested:', file, 'at line', line)
    }

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('editor:openFileRequested', handleFileOpenRequest)
    }

    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeListener(
          'editor:openFileRequested',
          handleFileOpenRequest
        )
      }
    }
  }, [])

  const loadCallGraph = async () => {
    try {
      setIsLoading(true)
      const result = await window.electron.ipcRenderer.invoke('go:analyzeCallGraph', projectPath)
      setCallGraph(result)
    } catch (error) {
      console.error('Error loading call graph:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateFlowVisualization = () => {
    if (!callGraph) return

    // Group functions by file
    const files = new Map<string, { functions: FunctionDef[]; package: string }>()

    callGraph.functions.forEach((func) => {
      if (!files.has(func.file)) {
        files.set(func.file, { functions: [], package: func.package })
      }
      files.get(func.file)!.functions.push(func)
    })

    // Filter by package if needed
    let filteredFiles = Array.from(files.entries())
    if (filterPackage !== 'all') {
      filteredFiles = filteredFiles.filter(([_, fileData]) => fileData.package === filterPackage)
    }

    // Create file nodes
    const newNodes: Node[] = filteredFiles.map(([filePath, fileData]) => {
      const isHighlighted =
        highlightedFile === filePath || (selectedFile && filePath.includes(selectedFile))
      const fileName = filePath.split('/').pop() || filePath

      return {
        id: filePath,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: (
            <div className="text-center p-2">
              <div className="font-bold text-sm text-gray-900">{fileName}</div>
              <div className="text-xs text-gray-600 mt-1">{fileData.package}</div>
              <div className="text-xs text-blue-600 mt-1">
                {fileData.functions.length} function{fileData.functions.length !== 1 ? 's' : ''}
              </div>
            </div>
          )
        },
        style: {
          background: isHighlighted
            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
            : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: isHighlighted ? '2px solid #f59e0b' : '1px solid #d1d5db',
          borderRadius: 8,
          minWidth: nodeWidth - 20,
          minHeight: nodeHeight - 20,
          fontSize: 12,
          boxShadow: isHighlighted
            ? '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
            : '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
        }
      }
    })

    // Create edges between files based on function calls
    const fileConnections = new Map<string, Map<string, number>>()

    callGraph.calls.forEach((call) => {
      if (call.callerFile && call.calledFile && call.callerFile !== call.calledFile) {
        const source = call.callerFile
        const target = call.calledFile

        if (!fileConnections.has(source)) {
          fileConnections.set(source, new Map())
        }
        const targetMap = fileConnections.get(source)!
        targetMap.set(target, (targetMap.get(target) || 0) + 1)
      }
    })

    const newEdges: Edge[] = []
    fileConnections.forEach((targets, source) => {
      targets.forEach((count, target) => {
        // Only create edges if both source and target files are in our filtered list
        if (files.has(source) && files.has(target)) {
          newEdges.push({
            id: `${source}-${target}`,
            source,
            target,
            animated: highlightedFile === source || highlightedFile === target,
            style: {
              stroke:
                highlightedFile === source || highlightedFile === target ? '#f59e0b' : '#6b7280',
              strokeWidth: highlightedFile === source || highlightedFile === target ? 3 : 2
            },
            markerEnd: {
              type: 'arrowclosed',
              color:
                highlightedFile === source || highlightedFile === target ? '#f59e0b' : '#6b7280'
            },
            label: `${count} call${count !== 1 ? 's' : ''}`,
            labelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 'bold' },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 }
          })
        }
      })
    })

    // If showOnlyConnected is true, filter out isolated files
    let finalNodes = newNodes
    if (showOnlyConnected && newEdges.length > 0) {
      const connectedFiles = new Set<string>()
      newEdges.forEach((edge) => {
        connectedFiles.add(edge.source)
        connectedFiles.add(edge.target)
      })
      finalNodes = newNodes.filter((node) => connectedFiles.has(node.id))
    }

    // Apply auto-layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      finalNodes,
      newEdges,
      layoutDirection
    )

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  const onNodeClick = useCallback(async (event: React.MouseEvent, node: Node) => {
    setHighlightedFile(node.id)
  }, [])

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setHighlightedFile(node.id)
  }, [])

  const getUniquePackages = () => {
    if (!callGraph) return []
    return [...new Set(callGraph.functions.map((f) => f.package))].sort()
  }

  const resetHighlight = () => {
    setHighlightedFile('')
  }

  const toggleLayout = () => {
    setLayoutDirection((current) => (current === 'TB' ? 'LR' : 'TB'))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing Go project structure...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a moment for large projects</p>
        </div>
      </div>
    )
  }

  if (!callGraph || callGraph.functions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Go Functions Found</h3>
          <p className="text-gray-600 mb-4">
            Make sure this directory contains Go files with function definitions.
          </p>
          <button
            onClick={loadCallGraph}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        attributionPosition="top-right"
        className="bg-gray-50"
      >
        <Background color="#e2e8f0" gap={20} size={1} style={{ backgroundColor: '#f8fafc' }} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === highlightedFile) return '#f59e0b'
            return '#3b82f6'
          }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        />

        <Panel
          position="top-left"
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200"
        >
          <div className="flex flex-col gap-3 min-w-64">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Package:</label>
              <select
                value={filterPackage}
                onChange={(e) => setFilterPackage(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Packages</option>
                {getUniquePackages().map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showConnected"
                checked={showOnlyConnected}
                onChange={(e) => setShowOnlyConnected(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showConnected" className="text-sm text-gray-700">
                Show only connected files
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleLayout}
                className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                title="Toggle layout direction"
              >
                {layoutDirection === 'TB' ? '↕ Vertical' : '↔ Horizontal'}
              </button>
              <button
                onClick={resetHighlight}
                className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
              >
                Clear Highlight
              </button>
              <button
                onClick={loadCallGraph}
                className="flex-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
              >
                Refresh
              </button>
            </div>

            {highlightedFile && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                <strong>Highlighted:</strong> {highlightedFile.split('/').pop()}
                <div className="text-xs text-gray-600 mt-1">
                  Click to highlight • Double-click to focus
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          position="bottom-left"
          className="bg-white p-3 rounded-lg shadow-lg border border-gray-200"
        >
          <div className="text-xs text-gray-600 space-y-1">
            <div className="font-medium text-gray-800">Project Stats</div>
            <div>Files: {new Set(callGraph.functions.map((f) => f.file)).size}</div>
            <div>Functions: {callGraph.functions.length}</div>
            <div>Function Calls: {callGraph.calls.length}</div>
            <div>Packages: {getUniquePackages().length}</div>
            <div>
              Showing: {nodes.length} files, {edges.length} connections
            </div>
          </div>
        </Panel>

        <Panel
          position="bottom-right"
          className="bg-white p-3 rounded-lg shadow-lg border border-gray-200"
        >
          <div className="text-xs text-gray-600 space-y-1">
            <div className="font-medium text-gray-800">Controls</div>
            <div>• Click node: Highlight file</div>
            <div>• Drag: Pan around</div>
            <div>• Scroll: Zoom in/out</div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default FlowDiagram
