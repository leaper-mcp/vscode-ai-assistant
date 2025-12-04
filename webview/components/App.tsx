import React, { useState, useEffect } from 'react';
import { ChatContainer } from './ChatContainer';
import { Toolbar } from './Toolbar';
import { InputArea } from './InputArea';
import { ChatMessage, ExtensionMessage, WebviewMessage } from '../types';
import styles from './App.module.css';

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
    const [allMcpServers, setAllMcpServers] = useState<any[]>([]);
    const [selectedMcpServers, setSelectedMcpServers] = useState<string[]>([]);
    
    useEffect(() => {
        // 请求初始数据
        vscode.postMessage({ type: 'requestHistory' });
        vscode.postMessage({ type: 'requestMcpServers' });
        vscode.postMessage({ type: 'requestAllMcpServers' });

        // 监听来自扩展的消息
        const handleMessage = (event: MessageEvent<WebviewMessage>) => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateHistory':
                    setMessages(message.history || []);
                    if (message.toolsEnabled !== undefined) {
                        setToolsEnabled(message.toolsEnabled);
                    }
                    if(Array.isArray(message.selectedMcpServers)) {
                        setSelectedMcpServers(message.selectedMcpServers)
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
                    

                case 'updateAllMcpServers':
                    setAllMcpServers(message.allMcpServers || []);
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

    const handleCancelMessage = () => {
        const userMessage = {
            type: 'cancelMessage'
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
        console.log('handleMcpSelectionChange',servers);
        vscode.postMessage({
            type: 'updateMcpSelection',
            selectedMcpServers: servers
        });
    };

    const handleReconnectServer = (serverName: string) => {
        vscode.postMessage({
            type: 'reconnectMcpServer',
            serverName: serverName
        });
    };

    const handleDisconnectServer = (serverName: string) => {
        vscode.postMessage({
            type: 'disconnectMcpServer',
            serverName: serverName
        });
    };

    const handleAddServer = () => {
        vscode.postMessage({
            type: 'addMcpServer'
        });
    };

    const handleRemoveServer = (serverName: string) => {
        vscode.postMessage({
            type: 'deleteSpecificServer',
            serverName: serverName
        });
    };

    return (
        <div className={styles.app}>
            <ChatContainer 
                messages={messages} 
                streamingMessageId={streamingMessageId}
            />
            <Toolbar 
                toolsEnabled={toolsEnabled}
                onToggleTools={handleToggleTools}
                allMcpServers={allMcpServers}
                selectedMcpServers={selectedMcpServers}
                onMcpSelectionChange={handleMcpSelectionChange}
                onReconnectServer={handleReconnectServer}
                onDisconnectServer={handleDisconnectServer}
                onAddServer={handleAddServer}
                onRemoveServer={handleRemoveServer}
            />
            <InputArea 
                onSendMessage={handleSendMessage}
                onCancelMessage={handleCancelMessage}
                isLoading={isLoading}
            />
        </div>
    );
};