import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, type ApiAgent, type CreateAgentRequest } from '../services/api';
import type { Agent, Connection } from '../types';

interface AgentOrchestrationState {
  agents: Agent[];
  connections: Connection[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export const useAgentOrchestration = () => {
  const [state, setState] = useState<AgentOrchestrationState>({
    agents: [],
    connections: [],
    loading: true,
    error: null,
    connected: false,
  });

  // Use ref to store latest setState function for stable callback
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [agents, connections] = await Promise.all([
        apiService.listAgents(),
        apiService.listConnections(),
      ]);

      // apiAgentToUIAgent now handles position persistence internally
      const uiAgents = agents.map(apiService.apiAgentToUIAgent);
      const uiConnections = connections.map(apiService.apiConnectionToUIConnection);

      setState(prev => ({
        ...prev,
        agents: uiAgents,
        connections: uiConnections,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false,
      }));
    }
  }, []);

  // Create a stable WebSocket message handler that doesn't change
  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('📡 Frontend WebSocket message handler called with:', data);

    try {
      setState(currentState => {
        console.log('📡 Current state before update:', currentState);
        
        try {
          switch (data.type) {
        case 'initial_state':
          // Handle initial state from WebSocket
          const initialAgents = data.agents?.map((apiAgent: ApiAgent) => {
            return apiService.apiAgentToUIAgent(apiAgent);
          }) || [];

          const initialConnections = data.connections?.map(apiService.apiConnectionToUIConnection) || [];

          return {
            ...currentState,
            agents: initialAgents,
            connections: initialConnections,
            loading: false,
            connected: true,
          };

        case 'agent_updated':
          return {
            ...currentState,
            agents: currentState.agents.map(agent => {
              if (agent.id === data.agent.id) {
                const updatedAgent = apiService.apiAgentToUIAgent(data.agent);
                // Preserve UI position
                updatedAgent.x = agent.x;
                updatedAgent.y = agent.y;
                updatedAgent.selected = agent.selected;
                return updatedAgent;
              }
              return agent;
            }),
          };

        case 'agent_deleted':
          return {
            ...currentState,
            agents: currentState.agents.filter(agent => agent.id !== data.agent_id),
            connections: currentState.connections.filter(
              conn => conn.fromAgent !== data.agent_id && conn.toAgent !== data.agent_id
            ),
          };

        case 'connection_added':
          return {
            ...currentState,
            connections: [...currentState.connections, apiService.apiConnectionToUIConnection(data.connection)],
          };

        case 'connection_removed':
          return {
            ...currentState,
            connections: currentState.connections.filter(conn => conn.id !== data.connection_id),
          };

        case 'connection_failed':
          return {
            ...currentState,
            connected: false,
            error: 'Connection to orchestration layer failed'
          };

        case 'connection_error':
          console.error('🔌 WebSocket connection error:', data);
          return {
            ...currentState,
            connected: false,
            error: `WebSocket error: ${data.error || 'Connection failed'}`
          };

        case 'connection_established':
          console.log('✅ WebSocket connection established');
          return {
            ...currentState,
            connected: true,
            error: null // Clear any previous connection errors
          };

            default:
              console.log('📡 Unhandled WebSocket message type:', data.type);
              return currentState;
          }
        } catch (stateError) {
          console.error('📡 Error in WebSocket state update:', stateError);
          console.error('📡 Problematic data:', data);
          // Return current state unchanged on error
          return currentState;
        }
      });
    } catch (handlerError) {
      console.error('📡 Error in WebSocket message handler:', handlerError);
      console.error('📡 Problematic data:', data);
    }
  }, []);

  // Initialize WebSocket connection once
  useEffect(() => {
    console.log('🔌 Initializing WebSocket connection...');
    
    // Use the real WebSocket handler with error protection
    apiService.connectWebSocket(handleWebSocketMessage);
    loadData();

    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      apiService.removeWebSocketCallback(handleWebSocketMessage);
    };
  }, []); // Only run once on mount

  // API methods with UI updates
  const createAgent = useCallback(async (request: CreateAgentRequest) => {
    try {
      const apiAgent = await apiService.createAgent(request);
      // WebSocket will handle the update, but we can optimistically add it
      const newAgent = apiService.apiAgentToUIAgent(apiAgent);
      
      setState(prev => ({
        ...prev,
        agents: [...prev.agents, newAgent],
      }));

      return newAgent;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create agent',
      }));
      throw error;
    }
  }, []);

  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      await apiService.deleteAgent(agentId);
      // Remove stored position
      setAgentPositions(prev => {
        const newPos = { ...prev };
        delete newPos[agentId];
        return newPos;
      });
      // WebSocket will handle the UI update
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete agent',
      }));
      throw error;
    }
  }, []);

  const updateAgent = useCallback(async (agentId: string, updates: Partial<CreateAgentRequest>) => {
    try {
      await apiService.updateAgent(agentId, updates);
      // WebSocket will handle the update
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update agent',
      }));
      throw error;
    }
  }, []);

  const startAgent = useCallback(async (agentId: string) => {
    try {
      await apiService.startAgent(agentId);
      // WebSocket will handle the status update
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start agent',
      }));
      throw error;
    }
  }, []);

  const stopAgent = useCallback(async (agentId: string) => {
    try {
      await apiService.stopAgent(agentId);
      // WebSocket will handle the status update
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop agent',
      }));
      throw error;
    }
  }, []);

  const queryAgent = useCallback(async (agentId: string, query: string, context?: Record<string, any>) => {
    try {
      return await apiService.queryAgent(agentId, { query, context });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to query agent',
      }));
      throw error;
    }
  }, []);

  const createConnection = useCallback(async (fromAgent: string, toAgent: string, fromHandle: string, toHandle: string) => {
    // Check if connection already exists to prevent duplicates
    const existingConnection = state.connections.find(conn => 
      conn.fromAgent === fromAgent && 
      conn.toAgent === toAgent &&
      conn.fromHandle === fromHandle &&
      conn.toHandle === toHandle
    );
    
    if (existingConnection) {
      console.log('🔗 Connection already exists:', existingConnection.id);
      return;
    }

    // Create temporary ID for optimistic update
    const tempConnectionId = `temp-${Date.now()}-${Math.random()}`;

    try {
      // Optimistically add connection to UI for immediate feedback
      const optimisticConnection = {
        id: tempConnectionId,
        fromAgent,
        toAgent,
        fromHandle,
        toHandle,
      };

      setState(prev => ({
        ...prev,
        connections: [...prev.connections, optimisticConnection],
      }));

      await apiService.createConnection({
        from_agent: fromAgent,
        to_agent: toAgent,
        from_handle: fromHandle,
        to_handle: toHandle,
        enabled: true,
      });

      // Remove optimistic connection - WebSocket will provide the real one
      setState(prev => ({
        ...prev,
        connections: prev.connections.filter(conn => conn.id !== tempConnectionId),
      }));

    } catch (error) {
      // Remove failed optimistic connection
      setState(prev => ({
        ...prev,
        connections: prev.connections.filter(conn => conn.id !== tempConnectionId),
        error: error instanceof Error ? error.message : 'Failed to create connection',
      }));
      throw error;
    }
  }, [state.connections]);

  const deleteConnection = useCallback(async (connectionId: string) => {
    // Store the connection for potential rollback
    const connectionToDelete = state.connections.find(conn => conn.id === connectionId);
    
    if (!connectionToDelete) {
      console.warn('🔗 Connection not found for deletion:', connectionId);
      return;
    }

    try {
      // Optimistically remove connection from UI
      setState(prev => ({
        ...prev,
        connections: prev.connections.filter(conn => conn.id !== connectionId),
      }));

      await apiService.deleteConnection(connectionId);
      // WebSocket will confirm the deletion

    } catch (error) {
      // Rollback optimistic update on error
      setState(prev => ({
        ...prev,
        connections: [...prev.connections, connectionToDelete],
        error: error instanceof Error ? error.message : 'Failed to delete connection',
      }));
      throw error;
    }
  }, [state.connections]);

  const executeWorkflow = useCallback(async (initialMessage: string) => {
    try {
      const agentIds = state.agents.map(agent => agent.id);
      const apiConnections = state.connections.map(apiService.uiConnectionToApiConnection);
      
      return await apiService.executeWorkflow(agentIds, initialMessage, apiConnections);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to execute workflow',
      }));
      throw error;
    }
  }, [state.agents, state.connections]);

  // UI-specific methods
  const updateAgentPosition = useCallback((agentId: string, x: number, y: number) => {
    // Store position in localStorage for persistence
    apiService.storeAgentPosition(agentId, x, y);

    // Update UI state
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(agent =>
        agent.id === agentId ? { ...agent, x, y } : agent
      ),
    }));
  }, []);

  const selectAgent = useCallback((agentId: string | null) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(agent => ({
        ...agent,
        selected: agent.id === agentId,
      })),
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    // State
    ...state,
    
    // Agent management
    createAgent,
    deleteAgent,
    updateAgent,
    startAgent,
    stopAgent,
    queryAgent,
    
    // Connection management  
    createConnection,
    deleteConnection,
    
    // Workflow execution
    executeWorkflow,
    
    // UI helpers
    updateAgentPosition,
    selectAgent,
    clearError,
    refresh,
  };
};