import * as vscode from 'vscode';
import * as fs from 'fs';
import { AiService, ChatMessage } from './aiService';

export class AiChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiChatView';
    private _view?: vscode.WebviewView;
    private aiService: AiService;
    private chatHistory: ChatMessage[] = [];
    private context: vscode.ExtensionContext;
    private mcpManager?: any;
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
            const servers = this.mcpManager.getConnectedServers();
            this._view.webview.postMessage({
                type: 'updateMcpServers',
                mcpServers: servers
            });
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