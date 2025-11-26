import * as vscode from 'vscode';
import { AiChatProvider } from './aiChatProvider';
import { McpManager } from './mcpManager';
import {EventSource} from 'eventsource';

console.log('EventSource',EventSource);
// 将 EventSource 挂载到全局
(global as any).EventSource = EventSource;

export function activate(context: vscode.ExtensionContext) {
    console.log('VSCODE AI Assistant 插件已激活');

    const mcpManager = new McpManager(context);
    const aiChatProvider = new AiChatProvider(context, mcpManager);

    // 注册Webview Provider
    vscode.window.registerWebviewViewProvider('aiChatView', aiChatProvider);

    // 注册命令
    const openChatCommand = vscode.commands.registerCommand('aiChat.openChat', () => {
        aiChatProvider.show();
    });

    const configureSettingsCommand = vscode.commands.registerCommand('aiChat.configureSettings', () => {
        aiChatProvider.configureSettings();
    });

    const clearHistoryCommand = vscode.commands.registerCommand('aiChat.clearHistory', () => {
        aiChatProvider.clearHistory();
    });


    context.subscriptions.push(
        openChatCommand,
        configureSettingsCommand,
        clearHistoryCommand,
        aiChatProvider,
        mcpManager
    );

    // 初始化MCP管理器（手动连接模式）
    mcpManager.initialize();
}


export function deactivate() {
    console.log('VSCODE AI Assistant 插件已停用');
}