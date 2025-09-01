import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Define types locally since they're not exported in this version
type Node = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: any;
};

type Edge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  style?: any;
  markerEnd?: any;
};

type Connection = {
  source: string | null;
  target: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type OnConnect = (connection: Connection) => void;

import AgentFlowNode from './AgentFlowNode';
import type { Agent, Connection as CustomConnection } from '../types';

interface ReactFlowCanvasProps {
  agents: Agent[];
  connections: CustomConnection[];
  onAgentMove: (id: string, x: number, y: number) => void;
  onConnectionCreate: (fromAgent: string, toAgent: string, handleInfo?: any) => void;
  onConnectionDelete: (connectionId: string) => void;
  onCanvasClick: () => void;
  onAgentSelect: (agentId: string) => void;
}

// Register custom node types
const nodeTypes = {
  agentNode: AgentFlowNode,
};

const ReactFlowCanvas: React.FC<ReactFlowCanvasProps> = ({
  agents,
  connections,
  onAgentMove,
  onConnectionCreate,
  onConnectionDelete,
  onCanvasClick,
  onAgentSelect,
}) => {
  // Convert our agent data to React Flow nodes
  const convertAgentsToNodes = useCallback((): Node[] => {
    return agents.map(agent => ({
      id: agent.id,
      type: 'agentNode',
      position: { x: agent.x, y: agent.y },
      data: { 
        label: agent.label,
        selected: agent.selected,
        hasConnections: connections.some(conn => 
          conn.fromAgent === agent.id || conn.toAgent === agent.id
        ),
        status: agent.status,
        error: agent.error,
        onAgentSelect,
        id: agent.id,
      },
    }));
  }, [agents, connections, onAgentSelect]);

  // Convert our connections to React Flow edges
  const convertConnectionsToEdges = useCallback((): Edge[] => {
    return connections.map(connection => ({
      id: connection.id,
      source: connection.fromAgent,
      target: connection.toAgent,
      sourceHandle: connection.fromHandle,
      targetHandle: connection.toHandle,
      style: {
        strokeWidth: 4,
        stroke: '#8b5cf6',
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#8b5cf6',
      },
    }));
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Track if we're currently dragging to prevent updates during drag
  const [isDragging, setIsDragging] = React.useState(false);

  // Update nodes when agents change (but not during drag)
  React.useEffect(() => {
    if (!isDragging) {
      const newNodes = convertAgentsToNodes();
      setNodes(newNodes);
    }
  }, [convertAgentsToNodes, setNodes, isDragging]);

  // Update edges when connections change
  React.useEffect(() => {
    const newEdges = convertConnectionsToEdges();
    setEdges(newEdges);
  }, [convertConnectionsToEdges, setEdges]);

  // Handle node drag start
  const handleNodeDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle node drag end to sync with parent state
  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    setIsDragging(false);
    onAgentMove(node.id, node.position.x, node.position.y);
  }, [onAgentMove]);

  // Custom nodes change handler that batches updates
  const handleNodesChange = useCallback((changes: any[]) => {
    // Filter out position changes during dragging to prevent conflicts
    const filteredChanges = changes.filter(change => {
      if (isDragging && change.type === 'position') {
        return false;
      }
      return true;
    });
    
    if (filteredChanges.length > 0) {
      onNodesChange(filteredChanges);
    }
  }, [onNodesChange, isDragging]);

  // Handle connection creation
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      const handleInfo = {
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle
      };
      onConnectionCreate(connection.source, connection.target, handleInfo);
    }
  }, [onConnectionCreate]);

  // Handle background click
  const handlePaneClick = useCallback(() => {
    onCanvasClick();
  }, [onCanvasClick]);

  // Handle node click for selection
  const handleNodeClick = useCallback((event: any, node: Node) => {
    console.log('🖱️ Node clicked:', node.id, node);
    event.stopPropagation();
    console.log('📞 Calling onAgentSelect with:', node.id);
    onAgentSelect(node.id);
  }, [onAgentSelect]);

  // Track selected edges
  const [selectedEdges, setSelectedEdges] = React.useState<string[]>([]);

  // Alternative: handle selection changes
  const handleSelectionChange = useCallback((params: any) => {
    console.log('🎯 Selection changed:', params);
    
    // Track selected edges
    if (params.edges) {
      const edgeIds = params.edges.map((edge: any) => edge.id);
      setSelectedEdges(edgeIds);
      console.log('🔗 Selected edges:', edgeIds);
    }
    
    if (params.nodes && params.nodes.length > 0) {
      const selectedNode = params.nodes[0];
      console.log('📞 Calling onAgentSelect from selection change:', selectedNode.id);
      onAgentSelect(selectedNode.id);
    }
  }, [onAgentSelect]);

  // Handle keyboard events for deletion
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    console.log('⌨️ Key pressed:', event.key, 'Selected edges:', selectedEdges);
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedEdges.length > 0) {
        console.log('🗑️ Deleting edges:', selectedEdges);
        selectedEdges.forEach(edgeId => {
          onConnectionDelete(edgeId);
        });
        setSelectedEdges([]);
      } else {
        console.log('❌ No edges selected for deletion');
      }
    }
  }, [selectedEdges, onConnectionDelete]);

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onSelectionChange={handleSelectionChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        multiSelectionKeyCode="Shift"
        fitView={false}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        style={{ width: '100%', height: '100%' }}
        snapToGrid={true}
        snapGrid={[20, 20]}
      >
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#e5e7eb"
        />
      </ReactFlow>
    </div>
  );
};

export default ReactFlowCanvas;