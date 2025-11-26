import * as vscode from 'vscode';
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { env } from 'process';


export interface McpServerConfig {
    name: string;
    type: 'sse' | 'stdio' | 'websocket';
    stdio?: {
        command: string;
        args?: string[];
        cwd?: string;
        env?: { [key: string]: string}
    }
    sse?: {
        url: string;
        headers?: { [key: string]: string}
    }
    websocket?: {
        url: string;
        headers?: { [key: string]: string}
    }
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
        this.outputChannel.appendLine('MCP管理器已初始化，使用手动连接模式');
        this.connectedServers = new Map();
    }

    private async connectToServer(config: McpServerConfig): Promise<void> {
        this.outputChannel.appendLine(`尝试连接MCP服务器: ${config.name}`);
        const mcpCli = new Client({
            name: "mcp-proxy-cli", 
            version: "1.0.0" 
        },{capabilities: {tools: true}});
        
        if(config.type === 'stdio' && config.stdio) {
            // 替换 ${workspaceFolder} 为实际的工作区路径
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const processedArgs = config.stdio?.args?.map(arg => 
                arg.replace(/\$\{workspaceFolder\}/g, workspaceFolder || '')
            );
            const processedEnv = config.stdio?.env ? Object.fromEntries(
                Object.entries(config.stdio.env).map(([key, value]) => [
                    key,
                    value.replace(/\$\{workspaceFolder\}/g, workspaceFolder || '')
                ])
            ) : undefined;
            
            const stdioConfig = {
                command: config.stdio.command,
                args: processedArgs || [],
                env: {
                    ...processedEnv,
                    ...(config.stdio.cwd ? { CWD: config.stdio.cwd.replace(/\$\{workspaceFolder\}/g, workspaceFolder || '') } : {})
                }
            };
            const transport = new StdioClientTransport(stdioConfig);
            await mcpCli.connect(transport);
        }
        if(config.type === 'sse' && config.sse) {
            const transport = new SSEClientTransport(new URL(config.sse.url));
            await mcpCli.connect(transport);
        }
        if(config.type === 'websocket' && config.websocket) {
            const transport = new WebSocketClientTransport(new URL(config.websocket.url));
            await mcpCli.connect(transport);
        }

        this.connectedServers.set(config.name,mcpCli);
        this.outputChannel.appendLine(`MCP服务器 ${config.name} 已连接`);
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

    public async connectServer(serverName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiChat');
        
        // 直接获取 MCP 服务器配置数组
        const servers = config.get('mcpServers', []) as McpServerConfig[];
        
        const serverConfig = servers.find(s => s.name === serverName);

        if (!serverConfig) {
            throw new Error(`未找到MCP服务器配置: ${serverName}`);
        }

        // 连接服务器（如果已连接，会先断开再连接）
        if (this.isServerConnected(serverName)) {
            await this.disconnectServer(serverName);
        }
        
        await this.connectToServer(serverConfig);
    }

    public async reconnectServer(serverName: string): Promise<void> {
        await this.connectServer(serverName);
    }

    public async disconnectServer(serverName: string): Promise<void> {
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