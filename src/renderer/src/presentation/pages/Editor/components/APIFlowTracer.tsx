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
  Panel,
  Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface APIRoute {
  id: string
  method: string
  path: string
  handler: string
  handlerFile: string
  handlerLine: number
  codeSnippet?: string
}

interface DataFlowNode {
  id: string
  type: 'route' | 'handler' | 'service' | 'dto' | 'repository' | 'database' | 'external'
  name: string
  file: string
  line?: number
  content?: string
}

interface DataFlowEdge {
  source: string
  target: string
  dataType?: string
}

interface APIFlowTracerProps {
  projectPath: string
  selectedFile?: string | null
}

const APIFlowTracer: React.FC<APIFlowTracerProps> = ({ projectPath }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [apiRoutes, setApiRoutes] = useState<APIRoute[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [selectedRouteDetails, setSelectedRouteDetails] = useState<APIRoute | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [flowData, setFlowData] = useState<{ nodes: DataFlowNode[]; edges: DataFlowEdge[] } | null>(
    null
  )

  useEffect(() => {
    if (projectPath) {
      loadAPIRoutes()
    }
  }, [projectPath])

  const loadAPIRoutes = async () => {
    try {
      setIsLoading(true)
      const routes = await window.electron.ipcRenderer.invoke('go:discoverAPIRoutes', projectPath)
      setApiRoutes(routes)
    } catch (error) {
      console.error('Error loading API routes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRouteSelect = async (routeId: string) => {
    setSelectedRouteId(routeId)
    if (routeId) {
      try {
        setIsLoading(true)
        const data = await window.electron.ipcRenderer.invoke('go:traceAPIFlow', {
          projectPath,
          routeId
        })
        setFlowData(data)
        generateFlowVisualization(data)

        // Find and set the selected route details
        const route = apiRoutes.find((r) => r.id === routeId)
        setSelectedRouteDetails(route || null)
      } catch (error) {
        console.error('Error tracing API flow:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      setSelectedRouteDetails(null)
    }
  }

  const generateFlowVisualization = (data: { nodes: DataFlowNode[]; edges: DataFlowEdge[] }) => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create nodes with enhanced information
    data.nodes.forEach((node, index) => {
      const position = { x: 250 * (index % 3), y: 150 * Math.floor(index / 3) }

      let nodeStyle = {}
      let nodeContent = null

      switch (node.type) {
        case 'route':
          nodeStyle = { background: '#FF6B6B', color: '#fff', minWidth: 250, minHeight: 120 }
          nodeContent = (
            <div className="text-center p-2">
              <div className="font-semibold text-sm mb-2">{node.name}</div>
              {node.content && (
                <pre className="text-xs bg-gray-800 bg-opacity-50 p-2 rounded overflow-auto max-h-32">
                  {node.content}
                </pre>
              )}
              {node.file && (
                <div className="text-xs mt-2 opacity-75">
                  {node.file.split('/').pop()}:{node.line}
                </div>
              )}
            </div>
          )
          break
        case 'handler':
          nodeStyle = { background: '#4ECDC4', color: '#fff', minWidth: 250, minHeight: 120 }
          nodeContent = (
            <div className="text-center p-2">
              <div className="font-semibold text-sm mb-2">{node.name}</div>
              {node.content && (
                <pre className="text-xs bg-gray-800 bg-opacity-50 p-2 rounded overflow-auto max-h-32">
                  {node.content}
                </pre>
              )}
              {node.file && (
                <div className="text-xs mt-2 opacity-75">
                  {node.file.split('/').pop()}:{node.line}
                </div>
              )}
            </div>
          )
          break
        case 'service':
          nodeStyle = { background: '#45B7D1', color: '#fff', minWidth: 200, minHeight: 100 }
          nodeContent = (
            <div className="text-center p-2">
              <div className="font-semibold text-sm mb-1">{node.name}</div>
              <div className="text-xs mt-1">Service</div>
              {node.content && (
                <div className="text-xs mt-1 opacity-75 truncate">
                  {node.content.length > 50 ? node.content.substring(0, 50) + '...' : node.content}
                </div>
              )}
              {node.file && (
                <div className="text-xs mt-1 truncate" title={node.file}>
                  {node.file.split('/').pop()}
                </div>
              )}
            </div>
          )
          break
        case 'repository':
          nodeStyle = { background: '#96CEB4', color: '#fff', minWidth: 200, minHeight: 100 }
          nodeContent = (
            <div className="text-center p-2">
              <div className="font-semibold text-sm mb-1">{node.name}</div>
              <div className="text-xs mt-1">Repository</div>
              {node.content && (
                <div className="text-xs mt-1 opacity-75 truncate">
                  {node.content.length > 50 ? node.content.substring(0, 50) + '...' : node.content}
                </div>
              )}
              {node.file && (
                <div className="text-xs mt-1 truncate" title={node.file}>
                  {node.file.split('/').pop()}
                </div>
              )}
            </div>
          )
          break
        case 'database':
          nodeStyle = { background: '#FFEAA7', color: '#333', minWidth: 200, minHeight: 100 }
          nodeContent = (
            <div className="text-center p-2">
              <div className="font-semibold text-sm mb-1">{node.name}</div>
              <div className="text-xs mt-1">Database</div>
              {node.content && (
                <div className="text-xs mt-1 opacity-75 truncate">
                  {node.content.length > 50 ? node.content.substring(0, 50) + '...' : node.content}
                </div>
              )}
            </div>
          )
          break
        default:
          nodeStyle = { background: '#DDA0DD', color: '#fff', minWidth: 180, minHeight: 80 }
          nodeContent = (
            <div className="text-center p-2">
              <div className="font-semibold text-sm">{node.name}</div>
              <div className="text-xs mt-1">{node.type}</div>
              {node.file && (
                <div className="text-xs mt-1 truncate" title={node.file}>
                  {node.file.split('/').pop()}
                </div>
              )}
            </div>
          )
      }

      newNodes.push({
        id: node.id,
        type: 'default',
        position,
        data: {
          label: nodeContent
        },
        style: {
          ...nodeStyle,
          border: '2px solid #ddd',
          borderRadius: 8,
          fontSize: 12
        }
      })
    })

    // Create edges
    data.edges.forEach((edge) => {
      newEdges.push({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        style: { stroke: '#666', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#666' },
        label: edge.dataType || 'data',
        labelStyle: { fontSize: 10, fill: '#666' },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 }
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  // Route Details Panel Component
  const RouteDetailsPanel = () => {
    if (!selectedRouteDetails) return null

    return (
      <Panel
        position="top-right"
        className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-md"
      >
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Route Details</h3>
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Method:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {selectedRouteDetails.method}
              </span>
            </div>
            <div className="mt-2">
              <span className="font-medium">Path:</span>
              <div className="text-gray-600 mt-1 font-mono text-xs bg-gray-50 p-2 rounded">
                {selectedRouteDetails.path}
              </div>
            </div>
            <div className="mt-2">
              <span className="font-medium">Handler:</span>
              <div className="text-gray-600 mt-1 font-mono text-xs">
                {selectedRouteDetails.handler}
              </div>
            </div>
            <div className="mt-2">
              <span className="font-medium">File:</span>
              <div
                className="text-gray-600 mt-1 text-xs truncate"
                title={selectedRouteDetails.handlerFile}
              >
                {selectedRouteDetails.handlerFile}
              </div>
            </div>
            <div className="mt-2">
              <span className="font-medium">Line:</span>
              <div className="text-gray-600 mt-1">{selectedRouteDetails.handlerLine}</div>
            </div>
            {selectedRouteDetails.codeSnippet && (
              <div className="mt-2">
                <span className="font-medium">Code:</span>
                <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded mt-1 overflow-auto">
                  {selectedRouteDetails.codeSnippet}
                </pre>
              </div>
            )}
          </div>
        </div>
      </Panel>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing API flow...</p>
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
        fitView
        attributionPosition="top-right"
        className="bg-gray-50"
      >
        <Background color="#e2e8f0" gap={20} size={1} style={{ backgroundColor: '#f8fafc' }} />
        <Controls />
        <MiniMap
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        />

        {/* Route Selection Panel */}
        <Panel
          position="top-left"
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200"
        >
          <div className="space-y-3 min-w-80">
            <h3 className="font-semibold text-gray-800">API Routes</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Route to Trace:
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a route</option>
                {apiRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.method} {route.path} → {route.handler}
                  </option>
                ))}
              </select>
            </div>

            {selectedRouteId && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <div className="font-medium text-blue-800">Selected Route:</div>
                {(() => {
                  const route = apiRoutes.find((r) => r.id === selectedRouteId)
                  return route ? (
                    <div className="text-blue-700 mt-1">
                      <div>
                        {route.method} {route.path}
                      </div>
                      <div className="text-xs mt-1">Handler: {route.handler}</div>
                      <div className="text-xs">File: {route.handlerFile.split('/').pop()}</div>
                    </div>
                  ) : null
                })()}
              </div>
            )}

            <button
              onClick={loadAPIRoutes}
              className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
            >
              Refresh Routes
            </button>
          </div>
        </Panel>

        {/* Route Details Panel */}
        <RouteDetailsPanel />

        {/* Legend Panel */}
        <Panel
          position="bottom-left"
          className="bg-white p-3 rounded-lg shadow-lg border border-gray-200"
        >
          <div className="text-xs text-gray-600 space-y-2">
            <div className="font-medium text-gray-800">Node Legend</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#FF6B6B]"></div>
              <span>Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#4ECDC4]"></div>
              <span>Handler</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#45B7D1]"></div>
              <span>Service</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#96CEB4]"></div>
              <span>Repository</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#FFEAA7]"></div>
              <span>Database</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default APIFlowTracer
