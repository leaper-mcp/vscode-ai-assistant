export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ExtensionMessage {
    type: 'sendMessage' | 'clearHistory' | 'configureSettings' | 'requestHistory' | 'toggleTools';
    message?: string;
    enabled?: boolean;
}

export interface WebviewMessage {
    type: 'updateHistory' | 'streamStart' | 'streamChunk' | 'streamEnd' | 'thinking' | 'error' | 'status';
    history?: ChatMessage[];
    messageId?: number;
    content?: string;
    toolsEnabled?: boolean;
    message?: string;
}