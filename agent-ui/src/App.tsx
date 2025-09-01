import { useState } from 'react';
import ReactFlowCanvas from './components/ReactFlowCanvas';
import Toolbar from './components/Toolbar';
import AgentConfigPanel from './components/AgentConfigPanel';
import { useAgentOrchestration } from './hooks/useAgentOrchestration';

function App() {
  const {
    agents,
    connections,
    loading,
    error,
    connected,
    createAgent,
    deleteAgent,
    updateAgent,
    startAgent,
    stopAgent,
    queryAgent,
    createConnection,
    deleteConnection,
    updateAgentPosition,
    selectAgent,
    clearError,
    executeWorkflow,
  } = useAgentOrchestration();

  const [uiState, setUiState] = useState({
    connectingMode: true,
    connectingFrom: null as { agentId: string; handle: string } | null,
    selectedAgentId: null as string | null,
    showCreateDialog: false,
  });

  const handleAddAgent = async () => {
    setUiState(prev => ({ ...prev, showCreateDialog: true }));
  };

  const handleCreateAgent = async (name: string, model: string, prompt: string, apiKey: string) => {
    try {
      await createAgent({
        name,
        model,
        prompt,
        openai_api_key: apiKey,
      });
      setUiState(prev => ({ ...prev, showCreateDialog: false }));
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleAgentMove = (id: string, x: number, y: number) => {
    updateAgentPosition(id, x, y);
  };

  const handleConnectionCreate = async (fromAgent: string, toAgent: string, handleInfo?: any) => {
    try {
      await createConnection(
        fromAgent,
        toAgent,
        handleInfo?.sourceHandle || 'right',
        handleInfo?.targetHandle || 'left'
      );
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    console.log('🗑️ Deleting connection:', connectionId);
    try {
      await deleteConnection(connectionId);
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  const handleAgentSelect = (agentId: string) => {
    console.log('🎯 handleAgentSelect called with:', agentId);
    selectAgent(agentId);
    setUiState(prev => ({ ...prev, selectedAgentId: agentId }));
  };

  const handleAgentConfigSave = async (agentId: string, updates: { model: string; prompt: string }) => {
    try {
      await updateAgent(agentId, updates);
    } catch (error) {
      console.error('Failed to update agent:', error);
    }
  };

  const handleConfigPanelClose = () => {
    selectAgent(null);
    setUiState(prev => ({ ...prev, selectedAgentId: null }));
  };

  const handleCanvasClick = () => {
    selectAgent(null);
    setUiState(prev => ({
      ...prev,
      connectingFrom: null,
      selectedAgentId: null,
    }));
  };

  const handleClearAll = async () => {
    try {
      // Delete all agents (this will also delete connections via the API)
      await Promise.all(agents.map(agent => deleteAgent(agent.id)));
    } catch (error) {
      console.error('Failed to clear all:', error);
    }
  };

  const handleExecuteWorkflow = async (message: string) => {
    try {
      const result = await executeWorkflow(message);
      console.log('Workflow result:', result);
      return result;
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  };

  const selectedAgent = uiState.selectedAgentId 
    ? agents.find(agent => agent.id === uiState.selectedAgentId) || null 
    : null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {connected ? 'Loading agents...' : 'Connecting to orchestration layer...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Connection status indicator */}
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {connected ? 'Connected to orchestration layer' : 'Disconnected from orchestration layer'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {agents.length} agents • {connections.length} connections
        </div>
      </div>

      <Toolbar
        onAddAgent={handleAddAgent}
        onClearAll={handleClearAll}
        onExecuteWorkflow={handleExecuteWorkflow}
      />
      
      <div className="flex-1 relative">
        <ReactFlowCanvas
          agents={agents}
          connections={connections}
          onAgentMove={handleAgentMove}
          onConnectionCreate={handleConnectionCreate}
          onConnectionDelete={handleConnectionDelete}
          onCanvasClick={handleCanvasClick}
          onAgentSelect={handleAgentSelect}
        />
      </div>
      
      {/* Create Agent Dialog */}
      {uiState.showCreateDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setUiState(prev => ({ ...prev, showCreateDialog: false }))}
        >
          <div 
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              width: '24rem',
              maxWidth: 'calc(100% - 2rem)',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create New Agent</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleCreateAgent(
                formData.get('name') as string,
                formData.get('model') as string,
                formData.get('prompt') as string,
                formData.get('apiKey') as string
              );
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full border rounded px-3 py-2"
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.5rem 0.75rem'
                    }}
                    placeholder="My Agent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model</label>
                  <select name="model" className="w-full border rounded px-3 py-2" style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.5rem 0.75rem'
                    }}>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">System Prompt (Optional)</label>
                  <textarea
                    name="prompt"
                    className="w-full border rounded px-3 py-2"
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.5rem 0.75rem',
                      resize: 'vertical'
                    }}
                    rows={3}
                    placeholder="You are a helpful assistant..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    name="apiKey"
                    required
                    className="w-full border rounded px-3 py-2"
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.5rem 0.75rem'
                    }}
                    placeholder="sk-..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setUiState(prev => ({ ...prev, showCreateDialog: false }))}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Agent Config Panel */}
      <AgentConfigPanel
        agent={selectedAgent}
        isOpen={uiState.selectedAgentId !== null}
        onClose={handleConfigPanelClose}
        onSave={handleAgentConfigSave}
        onStart={async (agentId: string) => {
          try {
            await startAgent(agentId);
          } catch (error) {
            console.error('Failed to start agent:', error);
          }
        }}
        onStop={async (agentId: string) => {
          try {
            await stopAgent(agentId);
          } catch (error) {
            console.error('Failed to stop agent:', error);
          }
        }}
        onDelete={async (agentId: string) => {
          try {
            await deleteAgent(agentId);
            handleConfigPanelClose();
          } catch (error) {
            console.error('Failed to delete agent:', error);
          }
        }}
        onQuery={async (agentId: string, query: string) => {
          try {
            return await queryAgent(agentId, query);
          } catch (error) {
            console.error('Failed to query agent:', error);
            throw error;
          }
        }}
      />
    </div>
  );
}

export default App;
