import * as vscode from 'vscode';

export interface McpServerConfig {
    name: string;
    command: string;
    args: string[];
}

export class McpManager implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private connectedServers: string[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('MCP Server');
    }

    public async initialize(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiChat');
        const servers = config.get<McpServerConfig[]>('mcpServers', []);

        this.outputChannel.appendLine('正在初始化MCP服务器...');
        this.connectedServers = [];

        for (const serverConfig of servers) {
            try {
                await this.connectToServer(serverConfig);
            } catch (error: any) {
                this.outputChannel.appendLine(`连接MCP服务器 ${serverConfig.name} 失败: ${error.message}`);
                vscode.window.showWarningMessage(`MCP服务器 ${serverConfig.name} 连接失败: ${error.message}`);
            }
        }
    }

    private async connectToServer(config: McpServerConfig): Promise<void> {
        this.outputChannel.appendLine(`尝试连接MCP服务器: ${config.name}`);
        this.outputChannel.appendLine(`命令: ${config.command} ${config.args.join(' ')}`);

        // 简化版本 - 只是记录连接信息
        // 实际的MCP集成需要根据具体的SDK版本来实现
        this.connectedServers.push(config.name);
        this.outputChannel.appendLine(`MCP服务器 ${config.name} 已记录（简化模式）`);

        // 在这里可以添加实际的MCP连接逻辑
        // 需要参考最新的MCP SDK文档
    }

    public async callTool(serverName: string, toolName: string, args: any): Promise<any> {
        if (!this.connectedServers.includes(serverName)) {
            throw new Error(`MCP服务器 ${serverName} 未连接`);
        }

        // 简化版本 - 返回模拟响应
        this.outputChannel.appendLine(`模拟调用MCP工具 ${serverName}.${toolName}，参数: ${JSON.stringify(args)}`);
        
        return {
            content: [
                {
                    type: "text",
                    text: `模拟响应：工具 ${toolName} 被调用，参数: ${JSON.stringify(args)}`
                }
            ]
        };
    }

    public async listTools(serverName: string): Promise<any> {
        if (!this.connectedServers.includes(serverName)) {
            throw new Error(`MCP服务器 ${serverName} 未连接`);
        }

        // 简化版本 - 返回模拟工具列表
        this.outputChannel.appendLine(`列出MCP服务器 ${serverName} 的工具（模拟）`);
        
        return {
            tools: [
                {
                    name: "example_tool",
                    description: "示例工具",
                    inputSchema: {
                        type: "object",
                        properties: {
                            message: { type: "string" }
                        }
                    }
                }
            ]
        };
    }

    public getConnectedServers(): string[] {
        return [...this.connectedServers];
    }

    public isServerConnected(serverName: string): boolean {
        return this.connectedServers.includes(serverName);
    }

    public async reconnectServer(serverName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiChat');
        const servers = config.get<McpServerConfig[]>('mcpServers', []);
        const serverConfig = servers.find(s => s.name === serverName);

        if (!serverConfig) {
            throw new Error(`未找到MCP服务器配置: ${serverName}`);
        }

        // 先断开现有连接
        this.disconnectServer(serverName);

        // 重新连接
        await this.connectToServer(serverConfig);
    }

    private disconnectServer(serverName: string): void {
        const index = this.connectedServers.indexOf(serverName);
        if (index > -1) {
            this.connectedServers.splice(index, 1);
            this.outputChannel.appendLine(`MCP服务器 ${serverName} 已断开`);
        }
    }

    public async refreshConnections(): Promise<void> {
        // 断开所有现有连接
        this.connectedServers = [];

        // 重新初始化
        await this.initialize();
    }

    public showOutput(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        // 清理所有连接
        this.connectedServers = [];
        this.outputChannel.dispose();
    }
}