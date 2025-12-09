import React from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from '../types';
import styles from './ChatContainer.module.css';

interface ChatContainerProps {
    messages: ChatMessageType[];
    showToolsExec?: boolean;
    streamingMessageId?: number;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
    messages, 
    showToolsExec,
    streamingMessageId 
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages,showToolsExec]);

    if (messages.length === 0) {
        return (
            <div className={styles.chatContainer} ref={containerRef}>
                <div style={{ 
                    textAlign: 'center', 
                    opacity: 0.6, 
                    padding: '20px' 
                }}>
                    暂无对话记录，开始与AI助手对话吧！
                </div>
            </div>
        );
    }

    return (
        <div className={styles.chatContainer} ref={containerRef}>
            {messages.map((message, index) => (
                <ChatMessage
                    key={index}
                    message={message}
                    showToolsExec={showToolsExec}
                    messageId={index}
                    isStreaming={streamingMessageId === index}
                />
            ))}
        </div>
    );
};