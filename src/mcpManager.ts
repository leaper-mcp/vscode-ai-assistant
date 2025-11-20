import * as vscode from 'vscode';
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";


export interface McpServerConfig {
    name: string;
    type: 'sse' | 'websocket' | 'stdio';
    stdio?:{
        command: string;
        args: string[];
    }
    sse?: string,
    websocket?: string,
}

export class McpManager implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private connectedServers: Map<string,Client> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('MCP Server');
    }

    public async initialize(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiChat');
        
        // 解析 MCP 服务器配置
        let servers: McpServerConfig[] = [];
        const serversStr = config.get('mcpServers', '[]') as string;
        if (serversStr && serversStr.trim()) {
            try {
                servers = JSON.parse(serversStr);
            } catch (e: any) {
                this.outputChannel.appendLine(`解析 mcpServers JSON 失败: ${e.message}`);
                vscode.window.showErrorMessage(`mcpServers JSON 格式错误: ${e.message}`);
            }
        }

        this.outputChannel.appendLine('正在初始化MCP服务器...');
        this.connectedServers = new Map();

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
        const mcpCli = new Client({
            name: "mcp-proxy-cli", 
            version: "1.0.0" 
        },{capabilities: {tools: true}});
        if(config.type === 'stdio' && config.stdio) {
            const transport = new StdioClientTransport(config.stdio);
            await mcpCli.connect(transport);
        }
        if(config.type === 'sse' && config.sse) {
            const transport = new SSEClientTransport(new URL(config.sse));
            await mcpCli.connect(transport);
        }
        if(config.type === 'websocket' && config.websocket) {
            const transport = new WebSocketClientTransport(new URL(config.websocket));
            await mcpCli.connect(transport);
        }

        this.connectedServers.set(config.name,mcpCli);
        this.outputChannel.appendLine(`MCP服务器 ${config.name} 已记录（简化模式）`);
    }

    public async callTool(serverName: string, toolName: string, args: any): Promise<any> {
        if (!this.getConnectedServers().includes(serverName)) {
            throw new Error(`MCP服务器 ${serverName} 未连接`);
        }
        this.outputChannel.appendLine(`模拟调用MCP工具 ${serverName}.${toolName}，参数: ${JSON.stringify(args)}`);
        return await this.connectedServers.get(serverName)?.callTool({
                name:toolName,
                arguments:args
        });
    }

    public async listTools(serverName: string): Promise<any> {
        if (!this.getConnectedServers().includes(serverName)) {
            throw new Error(`MCP服务器 ${serverName} 未连接`);
        }
        this.outputChannel.appendLine(`列出MCP服务器 ${serverName} 的工具`);
        return await this.connectedServers.get(serverName)?.listTools();
    }

    public getConnectedServers(): string[] {
        return Array.from(this.connectedServers.keys());
    }

    public isServerConnected(serverName: string): boolean {
        return this.getConnectedServers().includes(serverName);
    }

    public async reconnectServer(serverName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiChat');
        
        // 解析 MCP 服务器配置
        let servers: McpServerConfig[] = [];
        const serversStr = config.get('mcpServers', '[]') as string;
        if (serversStr && serversStr.trim()) {
            try {
                servers = JSON.parse(serversStr);
            } catch (e: any) {
                this.outputChannel.appendLine(`解析 mcpServers JSON 失败: ${e.message}`);
                vscode.window.showErrorMessage(`mcpServers JSON 格式错误: ${e.message}`);
                return;
            }
        }
        
        const serverConfig = servers.find(s => s.name === serverName);

        if (!serverConfig) {
            throw new Error(`未找到MCP服务器配置: ${serverName}`);
        }

        // 先断开现有连接
        await this.disconnectServer(serverName);

        // 重新连接
        await this.connectToServer(serverConfig);
    }

    private async disconnectServer(serverName: string): Promise<void> {
        if (this.connectedServers.has(serverName)) {
            await this.connectedServers.get(serverName)?.close();
            this.connectedServers.delete(serverName);
            this.outputChannel.appendLine(`MCP服务器 ${serverName} 已断开`);
        }
    }
    private async disconnectAllServer(): Promise<void> {
        for(const serverName of this.connectedServers.keys()) {
            await this.disconnectServer(serverName);
        }
    }

    public async refreshConnections(): Promise<void> {
        await this.disconnectAllServer();
        // 重新初始化
        await this.initialize();
    }

    public showOutput(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.disconnectAllServer();
        this.outputChannel.dispose();
    }
}