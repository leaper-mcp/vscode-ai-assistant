import React from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.min.css';
import { ChatMessage as ChatMessageType } from '../types';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
    message: ChatMessageType;
    messageId: number;
    isStreaming?: boolean;
    showToolsExec?: boolean;
}

// 配置 marked 使用 highlight.js 进行代码高亮
marked.setOptions({
  extensions: {
    renderers: {
      code: function(code) {
       return `<pre class='code'><code>${hljs.highlightAuto(code.text).value}</code></pre>`;
      }
    },
    childTokens:{}
  }
});


export const ChatMessage: React.FC<ChatMessageProps> = ({ 
    message, 
    showToolsExec = false ,
    messageId, 
    isStreaming = false 
}) => {
    if(!showToolsExec) {
        if(message.role === 'tool') {
        return (<div></div>)
    }
    }
    
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
                {message.role === 'user' && (message.content)}
                {message.role === 'assistant' && (<div 
                    dangerouslySetInnerHTML={{ 
                        __html: marked.parse(message.content) 
                    }} 
                />)}
                {message.role === 'tool' && (<div>执行结果：<div 
                    dangerouslySetInnerHTML={{ 
                        __html: marked.parse(message.content) 
                    }} 
                /></div>)}
                {message?.tool_calls?.length && (
                    <div>
                        {message.tool_calls.map((toolCall, index) => (
                            <div key={index}>
                                <div>
                                    {
                                        toolCall?.function?.name && (

                                            <span>调用工具【{toolCall?.function?.name}】中...</span>

                                        )
                                    }
                                    {toolCall?.function?.arguments && showToolsExec &&  (<div>参数：<div 
                                        dangerouslySetInnerHTML={{ 
                                            __html: marked.parse(toolCall?.function?.arguments) 
                                        }} 
                                    /></div>)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};