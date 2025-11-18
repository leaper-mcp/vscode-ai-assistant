import * as vscode from 'vscode';
import { AiService, ChatMessage } from './aiService';

export class AiChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiChatView';
    private _view?: vscode.WebviewView;
    private aiService: AiService;
    private chatHistory: ChatMessage[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.aiService = new AiService();
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
                case 'showConfigInfo':
                    vscode.commands.executeCommand('aiChat.showConfigInfo');
                    break;
                case 'requestHistory':
                    this.updateWebview();
                    break;
            }
        });

        // 当视图可见时，确保更新内容
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateWebview();
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
            this._view.webview.postMessage({ type: 'thinking' });
            
            const response = await this.aiService.sendMessage(this.chatHistory);
            
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };

            this.chatHistory.push(assistantMessage);
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
            this._view.webview.postMessage({
                type: 'updateHistory',
                history: this.chatHistory
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI对话助手</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            margin: 0;
            padding: 8px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 8px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            background-color: var(--vscode-editor-background);
        }
        
        .message {
            margin-bottom: 12px;
            padding: 6px 8px;
            border-radius: 6px;
            word-wrap: break-word;
        }
        
        .user-message {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 10%;
        }
        
        .assistant-message {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: 10%;
        }
        
        .message-role {
            font-weight: bold;
            margin-bottom: 2px;
            font-size: 0.8em;
            opacity: 0.8;
        }
        
        .input-container {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
        }
        
        #messageInput {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        
        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        
        .button {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            white-space: nowrap;
        }
        
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .button-small {
            padding: 4px 8px;
            font-size: 0.85em;
        }
        
        .toolbar {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        
        .thinking {
            font-style: italic;
            opacity: 0.7;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 6px;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 0.9em;
        }
        
        .pre {
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            line-height: 1.4;
        }
        
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 8px;
            padding: 8px;
            background-color: var(--vscode-panel-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }
    </style>
</head>
<body>
    <div class="header">AI对话助手</div>
    
    <div class="toolbar">
        <button class="button button-small" onclick="configureSettings()">配置</button>
        <button class="button button-small" onclick="showConfigInfo()">配置信息</button>
        <button class="button button-small" onclick="clearHistory()">清空</button>
    </div>
    
    <div class="chat-container" id="chatContainer"></div>
    
    <div class="input-container">
        <input type="text" id="messageInput" placeholder="输入消息..." onkeypress="handleKeyPress(event)">
        <button class="button" onclick="sendMessage()">发送</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message) {
                vscode.postMessage({
                    type: 'sendMessage',
                    message: message
                });
                input.value = '';
            }
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        function clearHistory() {
            vscode.postMessage({ type: 'clearHistory' });
        }
        
        function configureSettings() {
            vscode.postMessage({ type: 'configureSettings' });
        }
        
        function showConfigInfo() {
            vscode.postMessage({ type: 'showConfigInfo' });
        }
        
        function updateChatHistory(history) {
            const container = document.getElementById('chatContainer');
            container.innerHTML = '';
            
            if (history.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.opacity = '0.6';
                emptyDiv.style.padding = '20px';
                emptyDiv.textContent = '暂无对话记录，开始与AI助手对话吧！';
                container.appendChild(emptyDiv);
                return;
            }
            
            history.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + (msg.role === 'user' ? 'user-message' : 'assistant-message');
                
                const roleDiv = document.createElement('div');
                roleDiv.className = 'message-role';
                roleDiv.textContent = msg.role === 'user' ? '用户' : 'AI助手';
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'pre';
                contentDiv.textContent = msg.content;
                
                messageDiv.appendChild(roleDiv);
                messageDiv.appendChild(contentDiv);
                container.appendChild(messageDiv);
            });
            
            container.scrollTop = container.scrollHeight;
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateHistory':
                    updateChatHistory(message.history);
                    break;
                case 'thinking':
                    const thinkingDiv = document.createElement('div');
                    thinkingDiv.className = 'message assistant-message thinking';
                    thinkingDiv.innerHTML = '<div class="message-role">AI助手</div><div>正在思考中...</div>';
                    document.getElementById('chatContainer').appendChild(thinkingDiv);
                    thinkingDiv.scrollIntoView();
                    break;
                case 'error':
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error';
                    errorDiv.textContent = message.message;
                    document.getElementById('chatContainer').appendChild(errorDiv);
                    errorDiv.scrollIntoView();
                    break;
            }
        });
        
        // 请求初始数据
        vscode.postMessage({ type: 'requestHistory' });
    </script>
</body>
</html>`;
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

    private loadChatHistory() {
        const history = this.context.globalState.get<ChatMessage[]>('chatHistory', []);
        this.chatHistory = history;
    }

    private saveChatHistory() {
        this.context.globalState.update('chatHistory', this.chatHistory);
    }

    public getConfigInfo(): string {
        return this.aiService.getConfigInfo();
    }

    public dispose() {
        // 清理资源
    }
}