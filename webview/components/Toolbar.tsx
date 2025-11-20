import React from 'react';

interface ToolbarProps {
    toolsEnabled: boolean;
    onToggleTools: (enabled: boolean) => void;
    mcpServers?: string[];
    selectedMcpServers?: string[];
    onMcpSelectionChange?: (servers: string[]) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    toolsEnabled, 
    onToggleTools,
    mcpServers = [],
    selectedMcpServers = [],
    onMcpSelectionChange
}) => {
    const handleMcpToggle = (serverName: string, checked: boolean) => {
        let newSelection: string[];
        if (checked) {
            newSelection = [...selectedMcpServers, serverName];
        } else {
            newSelection = selectedMcpServers.filter(name => name !== serverName);
        }
        onMcpSelectionChange?.(newSelection);
    };

    return (
        <div className="toolbar">
            <div className="switch-container">
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={toolsEnabled}
                        onChange={(e) => onToggleTools(e.target.checked)}
                    />
                    <span className="slider"></span>
                </label>
                <span className="switch-label">Agent模式(如果模型支持则可能会读取并修改代码)</span>
            </div>
            
            {toolsEnabled && mcpServers.length > 0 && (
                <div className="mcp-selector">
                    <span className="mcp-label">MCP服务:</span>
                    {mcpServers.map((serverName) => (
                        <div key={serverName} className="mcp-checkbox-container">
                            <label className="mcp-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedMcpServers.includes(serverName)}
                                    onChange={(e) => handleMcpToggle(serverName, e.target.checked)}
                                />
                                <span>{serverName}</span>
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};