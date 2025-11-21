import React from 'react';
import { marked } from 'marked';
import { ChatMessage as ChatMessageType } from '../types';
import styles from './ChatMessage.module.css';

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
            className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}
            data-message-id={messageId}
        >
            <div className={styles.messageRole}>
                {isUser ? '用户' : 'AI助手'}
            </div>
            <div 
                className={isUser ? styles.pre : `${styles.markdownContent} ${isStreaming ? styles.streaming : ''}`}
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