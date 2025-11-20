import React, { useState, useEffect } from 'react';
import { ChatContainer } from './ChatContainer';
import { Toolbar } from './Toolbar';
import { InputArea } from './InputArea';
import { ChatMessage, ExtensionMessage, WebviewMessage } from '../types';

// VSCode API 全局变量
declare global {
    interface Window {
        acquireVsCodeApi: () => any;
    }
}
const vscode = window.acquireVsCodeApi();

export const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [toolsEnabled, setToolsEnabled] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<number | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [mcpServers, setMcpServers] = useState<string[]>([]);
    const [selectedMcpServers, setSelectedMcpServers] = useState<string[]>([]);
    
    useEffect(() => {
        // 请求初始数据
        vscode.postMessage({ type: 'requestHistory' });
        vscode.postMessage({ type: 'requestMcpServers' });

        // 监听来自扩展的消息
        const handleMessage = (event: MessageEvent<WebviewMessage>) => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateHistory':
                    setMessages(message.history || []);
                    if (message.toolsEnabled !== undefined) {
                        setToolsEnabled(message.toolsEnabled);
                    }
                    break;
                    
                case 'streamStart':
                    setStreamingMessageId(message.messageId);
                    setIsLoading(true);
                    break;
                    
                case 'streamChunk':
                    if (message.messageId !== undefined && message.content !== undefined) {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            if (message.messageId! < newMessages.length) {
                                newMessages[message.messageId!].content += message.content!;
                            }
                            return newMessages;
                        });
                    }
                    break;
                    
                case 'streamEnd':
                    setStreamingMessageId(undefined);
                    setIsLoading(false);
                    break;
                    
                case 'thinking':
                    setIsLoading(true);
                    break;
                    
                case 'error':
                    console.error('Error from extension:', message.message);
                    setIsLoading(false);
                    setStreamingMessageId(undefined);
                    break;
                    
                case 'status':
                    console.log('Status:', message.message);
                    break;
                    
                case 'updateMcpServers':
                    setMcpServers(message.mcpServers || []);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const handleSendMessage = (message: string) => {
        const userMessage: ExtensionMessage = {
            type: 'sendMessage',
            message
        };
        vscode.postMessage(userMessage);
    };

    const handleToggleTools = (enabled: boolean) => {
        setToolsEnabled(enabled);
        vscode.postMessage({
            type: 'toggleTools',
            enabled
        });
    };

    const handleMcpSelectionChange = (servers: string[]) => {
        setSelectedMcpServers(servers);
        vscode.postMessage({
            type: 'updateMcpSelection',
            selectedMcpServers: servers
        });
    };

    return (
        <div className="app">
            <ChatContainer 
                messages={messages} 
                streamingMessageId={streamingMessageId}
            />
            <Toolbar 
                toolsEnabled={toolsEnabled}
                onToggleTools={handleToggleTools}
                mcpServers={mcpServers}
                selectedMcpServers={selectedMcpServers}
                onMcpSelectionChange={handleMcpSelectionChange}
            />
            <InputArea 
                onSendMessage={handleSendMessage}
                disabled={isLoading}
            />
        </div>
    );
};