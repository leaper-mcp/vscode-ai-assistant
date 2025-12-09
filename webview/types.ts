export interface ChatMessage {
    role: 'user' | 'assistant'|'tool';
    content: string;
    timestamp: number;
    tool_calls?: any[];
    tool_call_id?: string;
}

export interface ExtensionMessage {
    type: 'sendMessage' | 'cancelMessage' | 'clearHistory' | 'configureSettings' | 'requestHistory' | 'toggleTools' | 'requestMcpServers' | 'updateMcpSelection' | 'reconnectMcpServer' | 'requestAllMcpServers';
    message?: string;
    enabled?: boolean;
    selectedMcpServers?: string[];
    serverName?: string;
}

export interface McpServerInfo {
    name: string;
    connected: boolean;
}

export interface WebviewMessage {
    type: 'updateHistory' | 'streamStart' | 'streamChunk' | 'streamEnd' | 'thinking' | 'error' | 'status' | 'updateMcpServers' | 'updateAllMcpServers';
    history?: ChatMessage[];
    messageId?: number;
    data?: ChatMessage[];
    toolsEnabled?: boolean;
    showToolsExec?: boolean;
    message?: string;
    mcpServers?: string[];
    allMcpServers?: McpServerInfo[];
    selectedMcpServers?: string[];
}