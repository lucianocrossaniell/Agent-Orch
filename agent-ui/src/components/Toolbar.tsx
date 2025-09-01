import React, { useState } from "react";

interface ToolbarProps {
  onAddAgent: () => void;
  onClearAll: () => void;
  onExecuteWorkflow: (message: string) => Promise<any>;
}

interface WorkflowResult {
  workflow_id: string;
  initial_message: string;
  agents: string[];
  steps: Array<{
    agent_id: string;
    message: string;
    response?: string;
    error?: string;
    status: 'success' | 'error';
  }>;
  final_result: string;
  status: 'success' | 'partial_failure' | 'error';
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddAgent, onClearAll, onExecuteWorkflow }) => {
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const handleExecuteWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const message = formData.get('message') as string;
    
    if (!message.trim()) return;
    
    setExecutingWorkflow(true);
    setWorkflowResult(null);
    
    try {
      const result = await onExecuteWorkflow(message);
      console.log('Workflow result:', result);
      
      // Store the result for display
      setWorkflowResult(result);
      setShowWorkflowDialog(false);
      setShowResultDialog(true);
    } catch (error) {
      console.error('Workflow execution failed:', error);
      
      // Create error result
      setWorkflowResult({
        workflow_id: 'error-' + Date.now(),
        initial_message: message,
        agents: [],
        steps: [],
        final_result: '',
        status: 'error'
      });
      setShowWorkflowDialog(false);
      setShowResultDialog(true);
    } finally {
      setExecutingWorkflow(false);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">
            Agent Orchestration Builder
          </h1>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onAddAgent}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Agent
            </button>

            <button
              onClick={() => setShowWorkflowDialog(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m2-7H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2z" />
              </svg>
              Execute Workflow
            </button>

            <button
              onClick={onClearAll}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Execution Dialog */}
      {showWorkflowDialog && (
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
          onClick={() => setShowWorkflowDialog(false)}
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
            <h3 className="text-lg font-semibold mb-4">Execute Workflow</h3>
            <form onSubmit={handleExecuteWorkflow}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Initial Message</label>
                  <textarea
                    name="message"
                    required
                    className="w-full border rounded px-3 py-2"
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.5rem 0.75rem',
                      resize: 'vertical'
                    }}
                    rows={4}
                    placeholder="Enter the initial message to start the workflow across all connected agents..."
                  />
                </div>
                <div className="text-sm text-gray-500">
                  This will execute the message across all agents in sequence based on their connections.
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowWorkflowDialog(false)}
                  disabled={executingWorkflow}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    backgroundColor: 'white',
                    cursor: executingWorkflow ? 'not-allowed' : 'pointer',
                    opacity: executingWorkflow ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executingWorkflow}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: executingWorkflow ? 'not-allowed' : 'pointer',
                    opacity: executingWorkflow ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {executingWorkflow && (
                    <div 
                      className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                      style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '50%',
                        border: '2px solid transparent',
                        borderBottom: '2px solid white',
                        animation: 'spin 1s linear infinite'
                      }}
                    ></div>
                  )}
                  {executingWorkflow ? 'Executing...' : 'Execute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow Results Dialog */}
      {showResultDialog && workflowResult && (
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
          onClick={() => setShowResultDialog(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '56rem',
              width: '100%',
              margin: '0 1rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Workflow Execution Results</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                workflowResult.status === 'success' 
                  ? 'bg-green-100 text-green-800'
                  : workflowResult.status === 'partial_failure'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`} style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: workflowResult.status === 'success' 
                  ? '#dcfce7' 
                  : workflowResult.status === 'partial_failure'
                  ? '#fef3c7'
                  : '#fee2e2',
                color: workflowResult.status === 'success' 
                  ? '#166534' 
                  : workflowResult.status === 'partial_failure'
                  ? '#92400e'
                  : '#991b1b'
              }}>
                {workflowResult.status === 'success' ? 'Success' 
                 : workflowResult.status === 'partial_failure' ? 'Partial Failure'
                 : 'Error'}
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Workflow ID</h4>
                  <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded" style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    fontFamily: 'monospace'
                  }}>
                    {workflowResult.workflow_id}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Initial Message</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded" style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.5rem',
                    borderRadius: '0.25rem'
                  }}>
                    "{workflowResult.initial_message}"
                  </p>
                </div>
              </div>

              {/* Agents Involved */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Agents Involved ({workflowResult.agents.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {workflowResult.agents.map((agentId) => (
                    <span 
                      key={agentId} 
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        fontSize: '0.75rem',
                        borderRadius: '0.25rem'
                      }}
                    >
                      {agentId.slice(0, 8)}...
                    </span>
                  ))}
                </div>
              </div>

              {/* Execution Steps */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">
                  Execution Steps ({workflowResult.steps.length})
                </h4>
                <div className="space-y-3">
                  {workflowResult.steps.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4" style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '1rem'
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Step {index + 1}</span>
                          <span className="text-xs text-gray-500 font-mono" style={{
                            fontFamily: 'monospace'
                          }}>
                            {step.agent_id?.slice(0, 8)}...
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          step.status === 'success' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`} style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: step.status === 'success' ? '#dcfce7' : '#fee2e2',
                          color: step.status === 'success' ? '#15803d' : '#dc2626'
                        }}>
                          {step.status === 'success' ? 'Success' : 'Error'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-600">Message:</span>
                          <p className="text-sm text-gray-700 mt-1">{step.message}</p>
                        </div>
                        
                        {step.response && (
                          <div>
                            <span className="text-xs font-medium text-gray-600">Response:</span>
                            <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded" style={{
                              backgroundColor: '#f9fafb',
                              padding: '0.5rem',
                              borderRadius: '0.25rem'
                            }}>
                              {step.response}
                            </p>
                          </div>
                        )}
                        
                        {step.error && (
                          <div>
                            <span className="text-xs font-medium text-red-600">Error:</span>
                            <p className="text-sm text-red-700 mt-1 bg-red-50 p-2 rounded" style={{
                              backgroundColor: '#fef2f2',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              color: '#dc2626'
                            }}>
                              {step.error}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Result */}
              {workflowResult.final_result && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Final Result</h4>
                  <div className="bg-green-50 p-4 rounded-lg" style={{
                    backgroundColor: '#f0fdf4',
                    padding: '1rem',
                    borderRadius: '0.5rem'
                  }}>
                    <p className="text-sm text-gray-700">{workflowResult.final_result}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowResultDialog(false)}
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;
