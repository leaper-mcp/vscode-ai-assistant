export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ExtensionMessage {
    type: 'sendMessage' | 'clearHistory' | 'configureSettings' | 'requestHistory' | 'toggleTools' | 'requestMcpServers' | 'updateMcpSelection';
    message?: string;
    enabled?: boolean;
    selectedMcpServers?: string[];
}

export interface WebviewMessage {
    type: 'updateHistory' | 'streamStart' | 'streamChunk' | 'streamEnd' | 'thinking' | 'error' | 'status' | 'updateMcpServers';
    history?: ChatMessage[];
    messageId?: number;
    content?: string;
    toolsEnabled?: boolean;
    message?: string;
    mcpServers?: string[];
}