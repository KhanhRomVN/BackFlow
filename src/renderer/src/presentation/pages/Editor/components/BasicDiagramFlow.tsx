import React, { useState, useEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface CodeStructure {
  filePath: string
  packageName: string
  imports: any[]
  types: any[]
  constants: any[]
  variables: any[]
  functions: any[]
  structs: any[]
  interfaces: any[]
}

// Add onNodeClick prop
interface BasicDiagramFlowProps {
  projectPath: string
  codeStructures: CodeStructure[]
  onNodeClick?: (filePath: string, lineNumber: number) => void
}

const BasicDiagramFlow: React.FC<BasicDiagramFlowProps> = ({
  projectPath,
  codeStructures,
  onNodeClick
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesState] = useEdgesState([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [selectedElement, setSelectedElement] = useState<any>(null)

  useEffect(() => {
    if (codeStructures.length > 0) {
      generateDiagram()
    }
  }, [codeStructures, selectedFile])

  const generateDiagram = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    if (!selectedFile) {
      // Hiển thị file-level overview
      codeStructures.forEach((structure, index) => {
        const node: Node = {
          id: structure.filePath,
          type: 'default',
          position: { x: index * 300, y: 0 },
          data: {
            label: (
              <div className="p-3">
                <div className="font-bold text-sm mb-2">📄 {structure.filePath}</div>
                <div className="text-xs text-gray-600">Package: {structure.packageName}</div>
                <div className="text-xs mt-1">
                  {structure.functions.length} funcs • {structure.structs.length} structs •{' '}
                  {structure.interfaces.length} interfaces
                </div>
              </div>
            ),
            structure: structure
          },
          style: {
            background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
            border: '2px solid #00acc1',
            borderRadius: '8px',
            minWidth: '250px',
            minHeight: '120px',
            fontSize: '12px'
          }
        }
        newNodes.push(node)
      })
    } else {
      // Hiển thị chi tiết một file cụ thể
      const structure = codeStructures.find((s) => s.filePath === selectedFile)
      if (structure) {
        let yPosition = 0

        // Package node
        newNodes.push(createPackageNode(structure, yPosition))
        yPosition += 150

        // Imports
        if (structure.imports.length > 0) {
          newNodes.push(createImportsNode(structure, yPosition))
          yPosition += 120
        }

        // Types
        structure.types.forEach((type, index) => {
          newNodes.push(createTypeNode(type, yPosition + index * 100))
        })
        yPosition += structure.types.length * 100

        // Constants
        structure.constants.forEach((constant, index) => {
          newNodes.push(createConstantNode(constant, yPosition + index * 80))
        })
        yPosition += structure.constants.length * 80

        // Variables
        structure.variables.forEach((variable, index) => {
          newNodes.push(createVariableNode(variable, yPosition + index * 80))
        })
        yPosition += structure.variables.length * 80

        // Structs
        structure.structs.forEach((struct, index) => {
          newNodes.push(createStructNode(struct, yPosition + index * 120))
        })
        yPosition += structure.structs.length * 120

        // Interfaces
        structure.interfaces.forEach((interfaceDef, index) => {
          newNodes.push(createInterfaceNode(interfaceDef, yPosition + index * 120))
        })
        yPosition += structure.interfaces.length * 120

        // Functions
        structure.functions.forEach((func, index) => {
          newNodes.push(createFunctionNode(func, yPosition + index * 100))
        })
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const createPackageNode = (structure: CodeStructure, y: number): Node => ({
    id: `package-${structure.filePath}`,
    type: 'default',
    position: { x: 0, y },
    data: {
      label: (
        <div className="p-3">
          <div className="font-bold text-sm">📦 Package</div>
          <div className="text-xs mt-1">{structure.packageName}</div>
        </div>
      )
    },
    style: {
      background: '#fff3e0',
      border: '2px solid #ff9800',
      borderRadius: '8px',
      minWidth: '200px'
    }
  })

  const createImportsNode = (structure: CodeStructure, y: number): Node => ({
    id: `imports-${structure.filePath}`,
    type: 'default',
    position: { x: 0, y },
    data: {
      label: (
        <div className="p-3">
          <div className="font-bold text-sm">📚 Imports</div>
          <div className="text-xs mt-1">{structure.imports.map((imp) => imp.path).join(', ')}</div>
        </div>
      )
    },
    style: {
      background: '#e8f5e8',
      border: '2px solid #4caf50',
      borderRadius: '8px',
      minWidth: '250px'
    }
  })

  const createStructNode = (struct: any, y: number): Node => ({
    id: `struct-${struct.name}`,
    type: 'default',
    position: { x: 200, y },
    data: {
      label: (
        <div className="p-3 cursor-pointer" onClick={() => setSelectedElement(struct)}>
          <div className="font-bold text-sm">🏗️ {struct.name}</div>
          <div className="text-xs mt-1">{struct.fields?.length || 0} fields</div>
          {struct.comments && struct.comments.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">{struct.comments[0]}</div>
          )}
        </div>
      )
    },
    style: {
      background: '#bbdefb',
      border: '2px solid #2196f3',
      borderRadius: '8px',
      minWidth: '200px'
    }
  })

  const createFunctionNode = (func: any, y: number): Node => ({
    id: `func-${func.name}`,
    type: 'default',
    position: { x: 400, y },
    data: {
      label: (
        <div className="p-3 cursor-pointer" onClick={() => setSelectedElement(func)}>
          <div className="font-bold text-sm">⚡ {func.name}</div>
          <div className="text-xs mt-1">{func.parameters?.length || 0} params</div>
          {func.comments && func.comments.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">{func.comments[0]}</div>
          )}
        </div>
      )
    },
    style: {
      background: '#ffecb3',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      minWidth: '200px'
    }
  })

  const createTypeNode = (type: any, y: number): Node => ({
    id: `type-${type.name}`,
    type: 'default',
    position: { x: 600, y },
    data: {
      label: (
        <div className="p-3 cursor-pointer" onClick={() => setSelectedElement(type)}>
          <div className="font-bold text-sm">📋 {type.name}</div>
          <div className="text-xs mt-1">Type: {type.type}</div>
        </div>
      )
    },
    style: {
      background: '#e1bee7',
      border: '2px solid #9c27b0',
      borderRadius: '8px',
      minWidth: '180px'
    }
  })

  const createConstantNode = (constant: any, y: number): Node => ({
    id: `const-${constant.name}`,
    type: 'default',
    position: { x: 800, y },
    data: {
      label: (
        <div className="p-3 cursor-pointer" onClick={() => setSelectedElement(constant)}>
          <div className="font-bold text-sm">🔒 {constant.name}</div>
          <div className="text-xs mt-1">Value: {constant.value}</div>
        </div>
      )
    },
    style: {
      background: '#c8e6c9',
      border: '2px solid #4caf50',
      borderRadius: '8px',
      minWidth: '180px'
    }
  })

  const createVariableNode = (variable: any, y: number): Node => ({
    id: `var-${variable.name}`,
    type: 'default',
    position: { x: 1000, y },
    data: {
      label: (
        <div className="p-3 cursor-pointer" onClick={() => setSelectedElement(variable)}>
          <div className="font-bold text-sm">📊 {variable.name}</div>
          <div className="text-xs mt-1">Type: {variable.type}</div>
        </div>
      )
    },
    style: {
      background: '#ffcdd2',
      border: '2px solid #f44336',
      borderRadius: '8px',
      minWidth: '180px'
    }
  })

  const createInterfaceNode = (interfaceDef: any, y: number): Node => ({
    id: `interface-${interfaceDef.name}`,
    type: 'default',
    position: { x: 1200, y },
    data: {
      label: (
        <div className="p-3 cursor-pointer" onClick={() => setSelectedElement(interfaceDef)}>
          <div className="font-bold text-sm">📜 {interfaceDef.name}</div>
          <div className="text-xs mt-1">{interfaceDef.methods?.length || 0} methods</div>
        </div>
      )
    },
    style: {
      background: '#ffe0b2',
      border: '2px solid #ff9800',
      borderRadius: '8px',
      minWidth: '200px'
    }
  })

  // Add click handler to nodes
  const handleNodeClick = async (event: React.MouseEvent, node: Node) => {
    if (node.id.includes('file-') || node.data?.structure) {
      setSelectedFile(node.id)
    }

    // Call the onNodeClick prop if it's a file node
    if (onNodeClick && node.data?.structure) {
      // Find the first function in the file to show
      const structure = node.data.structure
      if (structure.functions.length > 0) {
        const firstFunc = structure.functions[0]
        onNodeClick(structure.filePath, firstFunc.line || 1)
      } else {
        // If no functions, just pass line 1
        onNodeClick(structure.filePath, 1)
      }
    }
  }

  const handleBackToFiles = () => {
    setSelectedFile('')
    setSelectedElement(null)
  }

  return (
    <div className="h-full w-full relative bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesState}
        onNodeClick={handleNodeClick}
        fitView
        attributionPosition="top-right"
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls />
        <MiniMap />

        <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg">
          <div className="space-y-3">
            <h3 className="font-semibold">Code Structure Diagram</h3>

            {selectedFile && (
              <button
                onClick={handleBackToFiles}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                ← Back to Files
              </button>
            )}

            {selectedElement && (
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <h4 className="font-medium">{selectedElement.name}</h4>
                <pre className="text-xs mt-2 bg-gray-200 p-2 rounded">
                  {selectedElement.codeSnippet || JSON.stringify(selectedElement, null, 2)}
                </pre>
              </div>
            )}

            {onNodeClick && (
              <div className="text-xs text-gray-500 mt-2">
                💡 Click on file nodes to create function nodes
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default BasicDiagramFlow
