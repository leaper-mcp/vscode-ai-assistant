import * as vscode from 'vscode';
import { AiChatProvider } from './aiChatProvider';
import { McpManager } from './mcpManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chat Assistant 插件已激活');

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

    // MCP相关命令
    const listMcpServersCommand = vscode.commands.registerCommand('aiChat.mcp.listServers', async () => {
        const servers = mcpManager.getConnectedServers();
        if (servers.length === 0) {
            vscode.window.showInformationMessage('当前没有连接的MCP服务器');
        } else {
            const selected = await vscode.window.showQuickPick(servers, {
                placeHolder: '选择一个MCP服务器查看详情'
            });
            if (selected) {
                try {
                    const tools = await mcpManager.listTools(selected);
                    vscode.window.showInformationMessage(
                        `服务器 ${selected} 的工具: ${JSON.stringify(tools, null, 2)}`,
                        { modal: true }
                    );
                } catch (error: any) {
                    vscode.window.showErrorMessage(`获取工具列表失败: ${error.message}`);
                }
            }
        }
    });

    const reconnectMcpServerCommand = vscode.commands.registerCommand('aiChat.mcp.reconnectServer', async () => {
        const servers = mcpManager.getConnectedServers();
        if (servers.length === 0) {
            vscode.window.showInformationMessage('当前没有连接的MCP服务器');
            return;
        }

        const selected = await vscode.window.showQuickPick(servers, {
            placeHolder: '选择要重连的MCP服务器'
        });

        if (selected) {
            try {
                await mcpManager.reconnectServer(selected);
                vscode.window.showInformationMessage(`MCP服务器 ${selected} 重连成功`);
            } catch (error: any) {
                vscode.window.showErrorMessage(`重连失败: ${error.message}`);
            }
        }
    });

    const showMcpOutputCommand = vscode.commands.registerCommand('aiChat.mcp.showOutput', () => {
        mcpManager.showOutput();
    });

    context.subscriptions.push(
        openChatCommand,
        configureSettingsCommand,
        clearHistoryCommand,
        listMcpServersCommand,
        reconnectMcpServerCommand,
        showMcpOutputCommand,
        aiChatProvider,
        mcpManager
    );

    // 初始化MCP
    mcpManager.initialize();
}

export function deactivate() {
    console.log('AI Chat Assistant 插件已停用');
}