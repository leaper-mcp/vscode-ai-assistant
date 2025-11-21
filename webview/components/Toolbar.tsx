import React, { useState } from 'react';
import { McpServerInfo } from '../types';
import styles from './Toolbar.module.css';

interface ToolbarProps {
    toolsEnabled: boolean;
    onToggleTools: (enabled: boolean) => void;
    allMcpServers?: McpServerInfo[];
    selectedMcpServers?: string[];
    onMcpSelectionChange?: (servers: string[]) => void;
    onReconnectServer?: (serverName: string) => void;
    onDisconnectServer?: (serverName: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    toolsEnabled, 
    onToggleTools,
    allMcpServers = [],
    selectedMcpServers = [],
    onMcpSelectionChange,
    onReconnectServer,
    onDisconnectServer
}) => {
    const [mcpServerInfos, setMcpServerInfos] = useState<McpServerInfo[]>(allMcpServers);

    React.useEffect(() => {
        setMcpServerInfos(allMcpServers);
    }, [allMcpServers]);

    const handleMcpToggle = (serverName: string, checked: boolean) => {
        let newSelection: string[];
        if (checked) {
            newSelection = [...selectedMcpServers, serverName];
        } else {
            newSelection = selectedMcpServers.filter(name => name !== serverName);
        }
        onMcpSelectionChange?.(newSelection);
    };

    const handleConnect = (serverName: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onReconnectServer?.(serverName);
    };

    const handleDisconnect = (serverName: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDisconnectServer?.(serverName);
    };

    const handleSelectAll = () => {
        const connectedServers = mcpServerInfos
            .filter(info => info.connected)
            .map(info => info.name);
        onMcpSelectionChange?.(connectedServers);
    };

    const handleConnectAll = () => {
        // 连接所有未连接的服务器
        const disconnectedServers = mcpServerInfos
            .filter(info => !info.connected)
            .map(info => info.name);
        
        // 逐个连接服务器
        disconnectedServers.forEach(serverName => {
            onReconnectServer?.(serverName);
        });
    };

    const handleDisconnectAll = () => {
        // 断开所有已连接的服务器
        const connectedServers = mcpServerInfos
            .filter(info => info.connected)
            .map(info => info.name);
        
        // 逐个断开服务器连接
        connectedServers.forEach(serverName => {
            onDisconnectServer?.(serverName);
        });
    };

    const handleDeselectAll = () => {
        onMcpSelectionChange?.([]);
    };

    return (
        <div className={styles.toolbar}>
            <div className={styles.switchContainer}>
                <label className={styles.switch}>
                    <input
                        type="checkbox"
                        checked={toolsEnabled}
                        onChange={(e) => onToggleTools(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                </label>
                <span className={styles.switchLabel}>Agent模式(如果模型支持则可能会读取并修改代码)</span>
            </div>
            
            {toolsEnabled && mcpServerInfos.length > 0 && (
                <div className={styles.mcpSelector}>
                    <div className={styles.mcpHeader}>
                        <span className={styles.mcpLabel}>MCP服务:</span>
                        <div className={styles.mcpActions}>
                            <button 
                                className={styles.mcpActionButton}
                                onClick={handleConnectAll}
                                title="连接所有未连接的服务"
                            >
                                连接全部
                            </button>
                            <button 
                                className={styles.mcpActionButton}
                                onClick={handleDisconnectAll}
                                title="断开所有已连接的服务"
                            >
                                断开全部
                            </button>
                            <button 
                                className={styles.mcpActionButton}
                                onClick={handleSelectAll}
                                title="选择所有已连接的服务"
                            >
                                全选
                            </button>
                            <button 
                                className={styles.mcpActionButton}
                                onClick={handleDeselectAll}
                                title="取消选择所有服务"
                            >
                                全不选
                            </button>
                        </div>
                    </div>
                    <div className={styles.mcpList}>
                        {mcpServerInfos.map((serverInfo) => {
                            const isConnected = serverInfo.connected;
                            const isSelected = selectedMcpServers.includes(serverInfo.name);
                            
                            return (
                                <div key={serverInfo.name} className={styles.mcpItem}>
                                    <label className={`${styles.mcpCheckboxLabel} ${!isConnected ? styles.disabled : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={!isConnected}
                                            onChange={(e) => handleMcpToggle(serverInfo.name, e.target.checked)}
                                        />
                                        <span className={`${styles.mcpServerName} ${isConnected ? styles.connected : styles.disconnected}`}>
                                            {serverInfo.name}
                                        </span>
                                        {!isConnected && (
                                            <span className={`${styles.mcpStatusIndicator} ${styles.disconnected}`}>未连接</span>
                                        )}
                                        {isConnected && (
                                            <span className={`${styles.mcpStatusIndicator} ${styles.connected}`}>已连接</span>
                                        )}
                                    </label>
                                    {!isConnected && (
                                        <button 
                                            className={styles.mcpReconnectButton}
                                            onClick={(e) => handleConnect(serverInfo.name, e)}
                                            title="连接此服务器"
                                        >
                                            连接
                                        </button>
                                    )}
                                    {isConnected && (
                                        <button 
                                            className={styles.mcpDisconnectButton}
                                            onClick={(e) => handleDisconnect(serverInfo.name, e)}
                                            title="断开此服务器"
                                        >
                                            断开
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};