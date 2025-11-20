import React from 'react';
import { marked } from 'marked';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
    message: ChatMessageType;
    messageId: number;
    isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
    message, 
    messageId, 
    isStreaming = false 
}) => {
    const isUser = message.role === 'user';
    
    return (
        <div 
            className={`message ${isUser ? 'user-message' : 'assistant-message'}`}
            data-message-id={messageId}
        >
            <div className="message-role">
                {isUser ? '用户' : 'AI助手'}
            </div>
            <div 
                className={isUser ? 'pre' : `markdown-content ${isStreaming ? 'streaming' : ''}`}
                data-message-content={messageId}
            >
                {isUser ? (
                    message.content
                ) : (
                    <div 
                        dangerouslySetInnerHTML={{ 
                            __html: marked.parse(message.content) 
                        }} 
                    />
                )}
            </div>
        </div>
    );
};