import React from 'react';

interface ToolbarProps {
    toolsEnabled: boolean;
    onToggleTools: (enabled: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    toolsEnabled, 
    onToggleTools 
}) => {
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
                <span className="switch-label">Agent模式(此模式会读取并修改代码)</span>
            </div>
        </div>
    );
};