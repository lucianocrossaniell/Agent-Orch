import React, { useState, useEffect } from 'react';
import type { Agent } from '../types';

interface AgentConfigPanelProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentId: string, updates: { model: string; prompt: string }) => void;
  onStart?: (agentId: string) => Promise<void>;
  onStop?: (agentId: string) => Promise<void>;
  onDelete?: (agentId: string) => Promise<void>;
  onQuery?: (agentId: string, query: string) => Promise<any>;
}

const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
  agent,
  isOpen,
  onClose,
  onSave,
  onStart,
  onStop,
  onDelete,
  onQuery,
}) => {
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  // Update local state when agent changes
  useEffect(() => {
    if (agent) {
      setModel(agent.model || 'gpt-4');
      setPrompt(agent.prompt || '');
    }
  }, [agent]);

  const handleSave = () => {
    if (agent) {
      onSave(agent.id, { model, prompt });
      onClose();
    }
  };

  const handleCancel = () => {
    if (agent) {
      setModel(agent.model || 'gpt-4');
      setPrompt(agent.prompt || '');
    }
    onClose();
  };

  const modelOptions = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'llama-2', label: 'Llama 2' },
  ];

  console.log('🎛️ AgentConfigPanel props:', { agent, isOpen, hasAgent: !!agent });

  // Render panel even without agent for debugging
  if (!agent) {
    console.log('❌ No agent provided to AgentConfigPanel');
    return (
      <div className="fixed top-4 right-4 bg-red-500 text-white p-4 z-50">
        ❌ NO AGENT DATA
      </div>
    );
  }

  console.log('✅ AgentConfigPanel rendering with agent:', agent.label, 'isOpen:', isOpen);

  return (
    <>
      {/* Backdrop - always render when agent exists */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-25 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Panel - always render when agent exists */}
      <div 
        className={`fixed w-[500px] z-50 ${
          isOpen ? '' : 'translate-x-full'
        }`}
        style={{ 
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          transition: 'transform 300ms ease-in-out',
          willChange: 'transform',
          top: '64px',
          right: '0px',
          bottom: '16px',
          height: 'auto',
          left: 'auto',
          padding: '0 16px 0 0'
        }}
      >
        <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden">
          {/* DEBUG: Right side indicator */}
          <div className="p-2 bg-green-500 text-white text-center font-bold">
            ➡️ RIGHT SIDE PANEL ➡️
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Configure Agent</h2>
              <p className="text-sm text-gray-600">{agent.label}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-6 overflow-y-auto bg-gray-100">
            {/* Model Selection */}
            <div>
              <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                id="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Configuration */}
            <div>
              <label htmlFor="prompt-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                id="prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter the system prompt for this agent..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Agent Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Agent Information</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <p><span className="font-medium">ID:</span> {agent.id.slice(-8)}</p>
                <p><span className="font-medium">Position:</span> ({Math.round(agent.x)}, {Math.round(agent.y)})</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 bg-opacity-100">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AgentConfigPanel;