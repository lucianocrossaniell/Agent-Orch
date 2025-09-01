import type { Agent, Connection } from '../types';

// API configuration
const API_BASE_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

// API Types matching integration layer
export interface ApiAgent {
  id: string;
  config: {
    id: string;
    name: string;
    type: string;
    port: number;
    model: string;
    prompt?: string;
    openai_api_key: string;
  };
  status: 'stopped' | 'starting' | 'running' | 'error' | 'stopping';
  pid?: number;
  url?: string;
  error_message?: string;
  last_health_check?: string;
}

export interface ApiConnection {
  id: string;
  from_agent: string;
  to_agent: string;
  from_handle: string;
  to_handle: string;
  enabled: boolean;
}

export interface CreateAgentRequest {
  name: string;
  type?: string;
  model?: string;
  prompt?: string;
  openai_api_key: string;
}

export interface QueryAgentRequest {
  query: string;
  context?: Record<string, any>;
}

// API Service Class
export class AgentOrchestrationAPI {
  private ws: WebSocket | null = null;
  private wsCallbacks: Array<(data: any) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private isReconnecting = false;
  private connectionCleanup = false;
  private heartbeatInterval: number | null = null;

  // WebSocket methods
  connectWebSocket(callback: (data: any) => void) {
    console.log(`🔌 connectWebSocket called. Current state: ${this.ws?.readyState}, isReconnecting: ${this.isReconnecting}`);
    
    // Prevent multiple connection attempts
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already open, adding callback');
      if (!this.wsCallbacks.includes(callback)) {
        this.wsCallbacks.push(callback);
      }
      return;
    }
    
    if (this.isReconnecting) {
      console.log('🔌 Already reconnecting, adding callback');
      if (!this.wsCallbacks.includes(callback)) {
        this.wsCallbacks.push(callback);
      }
      return;
    }

    // Clear any existing connection first
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isReconnecting = true;
    console.log(`🔌 Connecting to WebSocket (attempt ${this.reconnectAttempts + 1})`);

    this.ws = new WebSocket(WS_URL);
    
    // Add callback if not already present
    if (!this.wsCallbacks.includes(callback)) {
      this.wsCallbacks.push(callback);
    }

    this.ws.onopen = () => {
      console.log('🔌 Connected to agent orchestration WebSocket');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      // Start heartbeat to keep connection alive
      this.startHeartbeat();
      
      // Notify UI of successful connection
      this.wsCallbacks.forEach(cb => cb({ 
        type: 'connection_established', 
        status: 'connected' 
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        console.log('📨 Raw WebSocket message received:', event.data);
        const data = JSON.parse(event.data);
        console.log('📨 Parsed WebSocket message:', data);
        this.wsCallbacks.forEach(cb => {
          try {
            console.log('📨 Calling WebSocket callback with data:', data);
            cb(data);
            console.log('📨 WebSocket callback completed successfully');
          } catch (error) {
            console.error('📨 WebSocket callback error:', error);
            console.error('📨 Error occurred with data:', data);
          }
        });
      } catch (error) {
        console.error('🔌 Failed to parse WebSocket message:', error);
        console.error('🔌 Raw message was:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket connection closed', event.code, event.reason);
      this.isReconnecting = false;
      
      // Don't reconnect if this was a deliberate disconnect
      if (this.connectionCleanup || this.wsCallbacks.length === 0) {
        return;
      }

      // Attempt to reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connectWebSocket(callback);
        }, delay);
      } else {
        console.warn('🔌 Max reconnection attempts reached');
        this.wsCallbacks.forEach(cb => cb({ type: 'connection_failed' }));
      }
    };

    this.ws.onerror = (error) => {
      console.error('🔌 WebSocket error details:', {
        error,
        url: WS_URL,
        readyState: this.ws?.readyState,
        readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws?.readyState || 3]
      });
      
      this.isReconnecting = false;
      
      // Don't immediately trigger reconnect on error - let onclose handle it
    };
  }

  disconnectWebSocket() {
    this.connectionCleanup = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Deliberate disconnect');
      this.ws = null;
    }
    
    this.wsCallbacks = [];
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.connectionCleanup = false;
  }

  // Remove specific callback
  removeWebSocketCallback(callback: (data: any) => void) {
    const initialLength = this.wsCallbacks.length;
    this.wsCallbacks = this.wsCallbacks.filter(cb => cb !== callback);
    console.log(`🔌 Removed WebSocket callback. Remaining: ${this.wsCallbacks.length} (was ${initialLength})`);
    
    // Disconnect if no callbacks remain
    if (this.wsCallbacks.length === 0) {
      console.log('🔌 No callbacks remaining, disconnecting WebSocket');
      this.disconnectWebSocket();
    }
  }

  // Agent management methods
  async createAgent(request: CreateAgentRequest): Promise<ApiAgent> {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create agent: ${error}`);
    }

    return response.json();
  }

  async listAgents(): Promise<ApiAgent[]> {
    const response = await fetch(`${API_BASE_URL}/agents`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch agents');
    }

    return response.json();
  }

  async getAgent(agentId: string): Promise<ApiAgent> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent ${agentId}`);
    }

    return response.json();
  }

  async updateAgent(agentId: string, updates: Partial<CreateAgentRequest>): Promise<ApiAgent> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update agent: ${error}`);
    }

    return response.json();
  }

  async startAgent(agentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to start agent ${agentId}`);
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop agent ${agentId}`);
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete agent ${agentId}`);
    }
  }

  async queryAgent(agentId: string, request: QueryAgentRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to query agent: ${error}`);
    }

    return response.json();
  }

  // Connection management methods
  async createConnection(connection: Omit<ApiConnection, 'id'>): Promise<void> {
    const connectionWithId = {
      ...connection,
      id: `${connection.from_agent}-${connection.to_agent}-${Date.now()}`,
    };

    const response = await fetch(`${API_BASE_URL}/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionWithId),
    });

    if (!response.ok) {
      throw new Error('Failed to create connection');
    }
  }

  async listConnections(): Promise<ApiConnection[]> {
    const response = await fetch(`${API_BASE_URL}/connections`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch connections');
    }

    return response.json();
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/connections/${connectionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete connection');
    }
  }

  // Message routing methods
  async routeMessage(fromAgent: string, toAgent: string, message: string, context?: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/messages/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_agent: fromAgent,
        to_agent: toAgent,
        message,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to route message');
    }

    return response.json();
  }

  async executeWorkflow(agents: string[], initialMessage: string, connections: ApiConnection[], context?: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workflows/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: `workflow-${Date.now()}`,
        agents,
        connections,
        initial_message: initialMessage,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute workflow: ${error}`);
    }

    return response.json();
  }

  // Position persistence methods
  private getStoredPosition(agentId: string): { x: number; y: number } | null {
    try {
      const stored = localStorage.getItem(`agent_position_${agentId}`);
      if (stored) {
        const position = JSON.parse(stored);
        // Validate position
        if (typeof position.x === 'number' && typeof position.y === 'number') {
          return position;
        }
      }
    } catch (error) {
      console.warn('Failed to get stored position:', error);
    }
    return null;
  }

  storeAgentPosition(agentId: string, x: number, y: number) {
    try {
      localStorage.setItem(`agent_position_${agentId}`, JSON.stringify({ x, y }));
    } catch (error) {
      console.warn('Failed to store agent position:', error);
    }
  }

  private generateDefaultPosition(): { x: number; y: number } {
    // Create a grid-like layout for new agents
    const gridSize = 200;
    const existingPositions = this.getAllStoredPositions();
    
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const x = col * gridSize + 100;
        const y = row * gridSize + 100;
        
        // Check if this position is already taken
        const isOccupied = existingPositions.some(pos => 
          Math.abs(pos.x - x) < 50 && Math.abs(pos.y - y) < 50
        );
        
        if (!isOccupied) {
          return { x, y };
        }
      }
    }
    
    // Fallback to random if grid is full
    return {
      x: Math.random() * 400 + 50,
      y: Math.random() * 300 + 50
    };
  }

  private getAllStoredPositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('agent_position_')) {
        try {
          const position = JSON.parse(localStorage.getItem(key) || '');
          if (typeof position.x === 'number' && typeof position.y === 'number') {
            positions.push(position);
          }
        } catch (error) {
          // Ignore invalid stored positions
        }
      }
    }
    
    return positions;
  }

  // Helper methods to convert between UI and API formats
  apiAgentToUIAgent(apiAgent: ApiAgent): Agent {
    const storedPosition = this.getStoredPosition(apiAgent.id);
    const position = storedPosition || this.generateDefaultPosition();

    return {
      id: apiAgent.id,
      x: position.x,
      y: position.y,
      width: 120,
      height: 80,
      label: apiAgent.config.name,
      selected: false,
      model: apiAgent.config.model,
      prompt: apiAgent.config.prompt || '',
      status: apiAgent.status,
      url: apiAgent.url,
      error: apiAgent.error_message,
    };
  }

  apiConnectionToUIConnection(apiConnection: ApiConnection): Connection {
    return {
      id: apiConnection.id,
      fromAgent: apiConnection.from_agent,
      fromHandle: apiConnection.from_handle as any,
      toAgent: apiConnection.to_agent,
      toHandle: apiConnection.to_handle as any,
    };
  }

  uiConnectionToApiConnection(uiConnection: Connection): ApiConnection {
    return {
      id: uiConnection.id,
      from_agent: uiConnection.fromAgent,
      to_agent: uiConnection.toAgent,
      from_handle: uiConnection.fromHandle,
      to_handle: uiConnection.toHandle,
      enabled: true,
    };
  }
}

// Create singleton instance
export const apiService = new AgentOrchestrationAPI();