import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface AgentNodeData {
  label: string;
  selected: boolean;
  hasConnections: boolean;
  status?: 'stopped' | 'starting' | 'running' | 'error' | 'stopping';
  error?: string;
}

interface NodeProps {
  data: AgentNodeData & { onAgentSelect?: (id: string) => void; id?: string };
  selected?: boolean;
}

const AgentFlowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { label, hasConnections, status, error, onAgentSelect, id } = data;

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'starting': return 'text-yellow-500';
      case 'stopping': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'stopped': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return '●';
      case 'starting': return '◐';
      case 'stopping': return '◑';
      case 'error': return '⚠'; // Use warning symbol instead of dot for better visibility
      case 'stopped': return '○';
      default: return '?';
    }
  };

  const getBorderColor = () => {
    if (selected || data.selected) return 'border-blue-500';
    switch (status) {
      case 'running': return 'border-green-400';
      case 'starting':
      case 'stopping': return 'border-yellow-400';
      case 'error': return 'border-red-400';
      case 'stopped': return 'border-gray-300';
      default: return 'border-gray-300';
    }
  };
  
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('📝 Agent name clicked:', label, id);
    if (onAgentSelect && id) {
      console.log('🔄 Calling onAgentSelect directly from node');
      onAgentSelect(id);
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    console.log('🟦 Node div clicked:', label);
    // Let the event bubble up to React Flow's onNodeClick
  };
  
  return (
    <div 
      className={`relative rounded-lg shadow-lg border-2 transition-all cursor-pointer ${
        selected || data.selected
          ? 'bg-blue-50 shadow-xl'
          : hasConnections
          ? 'bg-purple-50 shadow-lg'
          : 'bg-white hover:shadow-lg'
      } ${getBorderColor()}`}
      style={{
        width: 120,
        height: 80,
        padding: '6px',
      }}
      onClick={handleClick}
      title={error ? `Error: ${error}` : `Status: ${status || 'unknown'}`}
      data-status={status}
      data-error={error}
    >
      {/* Status indicator */}
      <div className={`absolute top-1 right-1 text-xs ${getStatusColor()}`}>
        {getStatusIcon()}
      </div>

      {/* One-way connection: Blue (source) can only connect to Red (target) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#3b82f6' }}
      />
      
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#ef4444' }}
      />

      {/* Node Content */}
      <div className="flex flex-col items-center justify-center h-full text-sm">
        <span 
          className="cursor-pointer hover:text-blue-600 hover:underline px-1 py-0.5 rounded text-center font-medium text-gray-700 truncate max-w-full"
          onClick={handleNameClick}
          title={label}
        >
          {label}
        </span>
        
        <div className="flex items-center mt-1 space-x-1">
          {(selected || data.selected) && <span className="text-blue-600 text-xs">⚙️</span>}
          {hasConnections && <span className="text-purple-600 text-xs">⚡</span>}
          {status && (
            <span className={`text-xs ${getStatusColor()}`}>
              {status === 'running' ? '▶' : 
               status === 'stopped' ? '⏹' : 
               status === 'error' ? '⚠' : 
               status === 'starting' ? '⏳' : 
               status === 'stopping' ? '⏸' : '?'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentFlowNode;