import * as vscode from 'vscode';
import * as fs from 'fs';
import { AiService, ChatMessage } from './aiService';
import type { McpManager } from './mcpManager';

export class AiChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiChatView';
    private _view?: vscode.WebviewView;
    private aiService: AiService;
    private chatHistory: ChatMessage[] = [];
    private context: vscode.ExtensionContext;
    private mcpManager?: McpManager;
    private selectedMcpServers: string[] = [];

    constructor(context: vscode.ExtensionContext, mcpManager?: any) {
        this.context = context;
        this.mcpManager = mcpManager;
        this.aiService = new AiService(mcpManager);
        this.loadChatHistory();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 发送初始数据
        this.updateWebview();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleSendMessage(data.message);
                    break;
                case 'clearHistory':
                    this.clearHistory();
                    break;
                case 'configureSettings':
                    this.configureSettings();
                    break;
                case 'requestHistory':
                    this.updateWebview();
                    break;
                case 'toggleTools':
                    await this.toggleTools(data.enabled);
                    break;
                case 'requestMcpServers':
                    this.sendMcpServers();
                    break;
                case 'requestAllMcpServers':
                    this.sendAllMcpServers();
                    break;
                case 'updateMcpSelection':
                    this.selectedMcpServers = data.selectedMcpServers || [];
                    this.aiService.setSelectedMcpServers(this.selectedMcpServers);
                    // 显示状态消息
                    if (this._view) {
                        const statusMessage = this.selectedMcpServers.length > 0 
                            ? `已启用 ${this.selectedMcpServers.length} 个MCP服务器: ${this.selectedMcpServers.join(', ')}`
                            : '已禁用所有MCP服务器';
                        this._view.webview.postMessage({
                            type: 'status',
                            message: statusMessage
                        });
                    }
                    break;
                case 'reconnectMcpServer':
                    await this.reconnectMcpServer(data.serverName);
                    break;
                case 'disconnectMcpServer':
                    await this.disconnectMcpServer(data.serverName);
                    break;
                case 'addMcpServer':
                    await this.addMcpServer();
                    break;
                case 'deleteSpecificServer':
                    await this.disconnectMcpServer(data.serverName);
                    await this.deleteSpecificMcpServer(data.serverName);
                    break;
            }
        });

        // 当视图可见时，确保更新内容
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateWebview();
                this.sendMcpServers();
            }
        });
    }

    private async handleSendMessage(message: string) {
        if (!this._view) {
            return;
        }

        const userMessage: ChatMessage = {
            role: 'user',
            content: message,
            timestamp: Date.now()
        };

        this.chatHistory.push(userMessage);
        this.saveChatHistory();
        this.updateWebview();

        try {
            // 创建一个空的助手消息用于流式更新
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            };

            this.chatHistory.push(assistantMessage);
            this.saveChatHistory();
            this.updateWebview();
            
            // 显示思考状态
            if (this._view) {
                this._view.webview.postMessage({ 
                    type: 'streamStart',
                    messageId: this.chatHistory.length - 1 
                });
            }

            const config = this.aiService.getConfig();

            if (config.enableStream) {
                // 使用流式响应
                await this.aiService.sendMessageStream(this.chatHistory.slice(0, -1), (chunk) => {
                    if (chunk.done) {
                        if (this._view) {
                            this._view.webview.postMessage({ 
                                type: 'streamEnd',
                                messageId: this.chatHistory.length - 1 
                            });
                        }
                    } else {
                        if (this._view) {
                            this._view.webview.postMessage({ 
                                type: 'streamChunk',
                                messageId: this.chatHistory.length - 1,
                                content: chunk.content 
                            });
                        }
                        
                        // 更新本地消息内容
                        this.chatHistory[this.chatHistory.length - 1].content += chunk.content;
                    }
                });
            } else {
                // 使用普通响应
                this._view.webview.postMessage({ type: 'thinking' });
                
                const response = await this.aiService.sendMessage(this.chatHistory.slice(0, -1));
                
                this.chatHistory[this.chatHistory.length - 1].content = response;
                
                if (this._view) {
                    this._view.webview.postMessage({ 
                        type: 'streamEnd',
                        messageId: this.chatHistory.length - 1 
                    });
                }
            }

            this.saveChatHistory();
            this.updateWebview();
        } catch (error: any) {
            this._view.webview.postMessage({
                type: 'error',
                message: error.message || '发送消息时出错'
            });
        }
    }

    private updateWebview() {
        if (this._view) {
            const config = this.aiService.getConfig();
            this._view.webview.postMessage({
                type: 'updateHistory',
                history: this.chatHistory,
                toolsEnabled: config.enableTools
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const webviewPath = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview');
        const indexHtmlUri = vscode.Uri.joinPath(webviewPath, 'index.html');
        const webviewUri = webview.asWebviewUri(webviewPath);
        
        // 读取 HTML 文件内容
        let html = fs.readFileSync(indexHtmlUri.fsPath, 'utf8');
        
        html = html.replace(/href="\/assets\/([^"]+)"/g, `href="${webviewUri}/assets/$1"`);
        html = html.replace(/src="\/assets\/([^"]+)"/g, `src="${webviewUri}/assets/$1"`);

        return html;
    }

    public show() {
        if (this._view) {
            this._view.show();
        }
    }

    public configureSettings() {
        vscode.commands.executeCommand('workbench.action.openSettings', 'aiChat');
    }

    public clearHistory() {
        this.chatHistory = [];
        this.saveChatHistory();
        this.updateWebview();
    }

    public async toggleTools(enabled: boolean) {
        const config = vscode.workspace.getConfiguration('aiChat');
        await config.update('enableTools', enabled, vscode.ConfigurationTarget.Global);
        this.aiService = new AiService(); // 重新创建服务实例以使用新配置
        
        // 显示状态提示
        if (this._view) {
            const statusMessage = enabled ? '工具调用已启用' : '工具调用已禁用';
            this._view.webview.postMessage({
                type: 'status',
                message: statusMessage
            });
        }
    }

    private sendMcpServers() {
        if (this._view && this.mcpManager) {
            // 获取配置的所有MCP服务器和连接状态
            const config = vscode.workspace.getConfiguration('aiChat');
            let allServers: string[] = [];
            const serversConfig = config.get('mcpServers', []) as any[];
            if (serversConfig && Array.isArray(serversConfig)) {
                allServers = serversConfig.map((s: any) => s.name).filter(Boolean);
            }
            
            const connectedServers = this.mcpManager.getConnectedServers();
            const allMcpServers = allServers.map(name => ({
                name,
                connected: connectedServers.includes(name)
            }));
            
            this._view.webview.postMessage({
                type: 'updateAllMcpServers',
                allMcpServers
            });
        }
    }

    private async sendAllMcpServers() {
        if (this._view && this.mcpManager) {
            const config = vscode.workspace.getConfiguration('aiChat');
            let allServers: string[] = [];
            const serversConfig = config.get('mcpServers', []) as any[];
            if (serversConfig && Array.isArray(serversConfig)) {
                allServers = serversConfig.map((s: any) => s.name).filter(Boolean);
            }
            
            const connectedServers = this.mcpManager.getConnectedServers();
            const allMcpServers = allServers.map(name => ({
                name,
                connected: connectedServers.includes(name)
            }));
            
            this._view.webview.postMessage({
                type: 'updateAllMcpServers',
                allMcpServers
            });
        }
    }

    private async reconnectMcpServer(serverName?: string) {
        if (!serverName || !this.mcpManager) {
            return;
        }
        
        try {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    message: `正在连接MCP服务器: ${serverName}...`
                });
            }
            
            await this.mcpManager.reconnectServer(serverName);
            
            // 连接成功后更新状态
            await this.sendAllMcpServers();
            this.sendMcpServers();
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    message: `MCP服务器 ${serverName} 连接成功`
                });
            }
        } catch (error: any) {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `连接MCP服务器 ${serverName} 失败: ${error.message}`
                });
            }
        }
    }

    private async disconnectMcpServer(serverName?: string) {
        if (!serverName || !this.mcpManager) {
            return;
        }
        
        try {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    message: `正在关闭MCP服务器: ${serverName}...`
                });
            }
            
            await this.mcpManager.disconnectServer(serverName);
            
            // 关闭成功后更新状态
            await this.sendAllMcpServers();
            this.sendMcpServers();
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    message: `MCP服务器 ${serverName} 关闭成功`
                });
            }
        } catch (error: any) {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `关闭MCP服务器 ${serverName} 失败: ${error.message}`
                });
            }
        }
    }

    private async addMcpServer(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiChat');
        const servers = config.get('mcpServers', []) as any[];
        
        const name = await vscode.window.showInputBox({
            prompt: '输入MCP服务器名称',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return '服务器名称不能为空';
                }
                if (servers.some((s: any) => s.name === value.trim())) {
                    return '服务器名称已存在';
                }
                return null;
            }
        });
        
        if (!name) return;
        
        const type = await vscode.window.showQuickPick([
            { label: 'STDIO', value: 'stdio' },
            { label: 'SSE', value: 'sse' },
            { label: 'WebSocket', value: 'websocket' }
        ], {
            placeHolder: '选择连接类型'
        });
        
        if (!type) return;
        
        let serverConfig: any = {
            name: name.trim(),
            type: type.value
        };
        
        if (type.value === 'stdio') {
            const command = await vscode.window.showInputBox({
                prompt: '输入执行命令',
                placeHolder: 'npx'
            });
            if (!command) return;
            
            const argsInput = await vscode.window.showInputBox({
                prompt: '输入命令参数（可选，用空格分隔）',
                placeHolder: '-y @modelcontextprotocol/server-memory'
            });
            const args = argsInput ? argsInput.trim().split(/\s+/) : [];
            
            serverConfig.stdio = {
                command: command.trim(),
                args: args
            };
        } else if (type.value === 'sse' || type.value === 'websocket') {
            const url = await vscode.window.showInputBox({
                prompt: `输入${type.value === 'sse' ? 'SSE' : 'WebSocket'}连接URL`,
                placeHolder: type.value === 'sse' 
                    ? 'https://your-mcp-server.com/sse' 
                    : 'wss://your-mcp-server.com/ws'
            });
            if (!url) return;
            
            const configKey = type.value as 'sse' | 'websocket';
            serverConfig[configKey] = { url: url.trim() };
        }
        try {
            const newServers = [...servers, serverConfig];
            await config.update('mcpServers', newServers, vscode.ConfigurationTarget.Global);
            // 更新界面
            await this.sendAllMcpServers();
            this.sendMcpServers();
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    message: `MCP服务器 ${name} 已添加`
                });
            }
        } catch (error: any) {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `添加MCP服务器 ${name} 失败: ${error.message}`
                });
            }
        }
    }

    private async deleteSpecificMcpServer(serverName?: string) {
        if (!serverName) {
            return;
        }
        
        try {
            // 先断开连接（如果已连接）
            if (this.mcpManager && this.mcpManager.getConnectedServers().includes(serverName)) {
                await this.mcpManager.disconnectServer(serverName);
            }
            
            // 从配置中删除
            const config = vscode.workspace.getConfiguration('aiChat');
            const servers = config.get('mcpServers', []) as any[];
            const newServers = servers.filter((s: any) => s.name !== serverName);
            await config.update('mcpServers', newServers, vscode.ConfigurationTarget.Global);
            
            // 更新界面
            await this.sendAllMcpServers();
            this.sendMcpServers();
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    message: `MCP服务器 ${serverName} 已删除`
                });
            }
        } catch (error: any) {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `删除MCP服务器 ${serverName} 失败: ${error.message}`
                });
            }
        }
    }
    

    private loadChatHistory() {
        const history = this.context.globalState.get<ChatMessage[]>('chatHistory', []);
        this.chatHistory = history;
    }

    private saveChatHistory() {
        this.context.globalState.update('chatHistory', this.chatHistory);
    }

    public dispose() {
        // 清理资源
    }
}