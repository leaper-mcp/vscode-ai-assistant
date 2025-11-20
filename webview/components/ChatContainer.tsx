import React from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatContainerProps {
    messages: ChatMessageType[];
    streamingMessageId?: number;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
    messages, 
    streamingMessageId 
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="chat-container" ref={containerRef}>
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
        <div className="chat-container" ref={containerRef}>
            {messages.map((message, index) => (
                <ChatMessage
                    key={index}
                    message={message}
                    messageId={index}
                    isStreaming={streamingMessageId === index}
                />
            ))}
        </div>
    );
};