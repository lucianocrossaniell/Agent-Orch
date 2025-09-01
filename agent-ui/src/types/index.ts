export interface Agent {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  selected: boolean;
  model: string;
  prompt: string;
  status?: 'stopped' | 'starting' | 'running' | 'error' | 'stopping';
  url?: string;
  error?: string;
}

export interface Connection {
  id: string;
  fromAgent: string;
  fromHandle: 'top' | 'right' | 'bottom' | 'left';
  toAgent: string;
  toHandle: 'top' | 'right' | 'bottom' | 'left';
  direction?: 'forward' | 'backward';
}

export interface DiagramState {
  agents: Agent[];
  connections: Connection[];
  connectingMode: boolean;
  connectingFrom: { agentId: string; handle: 'top' | 'right' | 'bottom' | 'left' } | null;
  selectedAgentId: string | null;
}