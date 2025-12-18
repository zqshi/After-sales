export interface AgentScopeConfig {
  serviceUrl: string;
  websocket: {
    enabled: boolean;
    heartbeatInterval: number;
  };
  timeout: {
    response: number;
    escalation: number;
  };
  routing: {
    autoAgentThreshold: number;
    complexityThreshold: number;
    sentimentRiskThreshold: number;
  };
  events: {
    nodeToAgentPath: string;
    agentToNodePath: string;
    outboundTimeoutMs: number;
  };
}

export const agentScopeConfig: AgentScopeConfig = {
  serviceUrl: process.env.AGENTSCOPE_URL || 'http://localhost:5000',
  websocket: {
    enabled: process.env.AGENTSCOPE_WEBSOCKET_ENABLED !== 'false',
    heartbeatInterval: parseInt(process.env.AGENTSCOPE_WEBSOCKET_HEARTBEAT || '30000', 10),
  },
  timeout: {
    response: parseInt(process.env.AGENTSCOPE_RESPONSE_TIMEOUT || '30000', 10),
    escalation: parseInt(process.env.AGENTSCOPE_ESCALATION_TIMEOUT || '120000', 10),
  },
  routing: {
    autoAgentThreshold: parseFloat(process.env.AGENTSCOPE_AUTO_AGENT_THRESHOLD || '0.85'),
    complexityThreshold: parseFloat(process.env.AGENTSCOPE_COMPLEXITY_THRESHOLD || '0.7'),
    sentimentRiskThreshold: parseFloat(process.env.AGENTSCOPE_SENTIMENT_RISK_THRESHOLD || '-0.6'),
  },
  events: {
    nodeToAgentPath: process.env.AGENTSCOPE_NODE_TO_AGENT_PATH || '/api/events/bridge',
    agentToNodePath: process.env.AGENTSCOPE_AGENT_TO_NODE_PATH || '/agentscope/events',
    outboundTimeoutMs: parseInt(process.env.AGENTSCOPE_EVENT_TIMEOUT || '5000', 10),
  },
};
