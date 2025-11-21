import React, { useState } from 'react';
import styles from './InputArea.module.css';

interface InputAreaProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
    onSendMessage, 
    disabled = false 
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = () => {
        const message = inputValue.trim();
        if (message && !disabled) {
            onSendMessage(message);
            setInputValue('');
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={styles.inputContainer}>
            <input
                type="text"
                id="messageInput"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={disabled}
                className={styles.messageInput}
            />
            <button 
                className={styles.button} 
                onClick={handleSubmit}
                disabled={disabled}
            >
                发送
            </button>
        </div>
    );
};