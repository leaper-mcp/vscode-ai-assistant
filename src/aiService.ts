import * as vscode from 'vscode';
import {tools, toolHandlers} from './tools';
import type {McpManager} from './mcpManager';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    tool_call_id?: string;
    tool_calls?: any[];
    content: string;
    timestamp: number;
}

export interface StreamChunk {
    data: ChatMessage[];
    done: boolean;
}

export type StreamCallback = (chunk: StreamChunk) => void;

export interface AiConfig {
    apiBaseUrl: string;
    apiKey: string;
    modelName: string;
    temperature: number;
    maxTokens: number;
    customHeaders: Record<string, string>;
    customBodyFields: Record<string, any>;
    overrideDefaultBody: boolean;
    enableStream: boolean;
    isEnableTools: boolean;
    showToolsExec: boolean;
    systemRole: string;
    enabledTools: string[];
}

export class AiService {
    private config: AiConfig;
    private mcpManager?: McpManager;
    private selectedMcpServers: string[] = [];
    private lastRequestController: AbortController | null = null;

    constructor(mcpManager?: any) {
        this.config = this.loadConfig();
        this.mcpManager = mcpManager;
        
        // 监听配置变化
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('aiChat')) {
                this.config = this.loadConfig();
            }
        });
    }

    private loadConfig(): AiConfig {
        const config = vscode.workspace.getConfiguration('aiChat');
        
        // 直接获取自定义请求头对象
        let customHeaders: Record<string, string> = config.get('customHeaders', {}) as Record<string, string>;
        
        // 直接获取自定义请求体字段对象
        let customBodyFields: Record<string, any> = config.get('customBodyFields', {}) as Record<string, any>;
        
        // 直接获取启用的工具列表数组
        let enabledTools: string[] = config.get('enabledTools', []) as string[];
        
        // 验证enabledTools是否为数组
        if (!Array.isArray(enabledTools)) {
            console.warn('enabledTools 不是数组格式，将重置为空数组');
            enabledTools = [];
        }
        
        return {
            apiBaseUrl: config.get('apiBaseUrl', 'https://api.openai.com/v1'),
            apiKey: config.get('apiKey', ''),
            modelName: config.get('modelName', 'gpt-3.5-turbo'),
            temperature: config.get('temperature', 0.7),
            maxTokens: config.get('maxTokens', 2000),
            customHeaders: customHeaders,
            customBodyFields: customBodyFields,
            overrideDefaultBody: config.get('overrideDefaultBody', false),
            enableStream: config.get('enableStream', true),
            isEnableTools: config.get('isEnableTools', true),
            showToolsExec: config.get('showToolsExec', false),
            systemRole: config.get('systemRole', ''),
            enabledTools: enabledTools
        };
    }

    private async getMcpTools(): Promise<any[]> {
        const mcpTools: any[] = [];
        
        if (this.mcpManager && this.selectedMcpServers.length > 0) {
            for (const serverName of this.selectedMcpServers) {
                try {
                    const toolsList = await this.mcpManager.listTools(serverName);
                    console.log(`MCP服务器 ${serverName} 的工具列表:`, toolsList);
                    if (toolsList && toolsList.tools) {
                        // 为每个MCP工具添加前缀，格式为 serverName_toolName
                        for (const tool of toolsList.tools) {
                            mcpTools.push({
                                type: "function",
                                function: {
                                    name: `${serverName}_${tool.name}`,
                                    description: `[MCP:${serverName}] ${tool.description}`,
                                    parameters: tool.inputSchema
                                }
                            });
                        }
                    }
                } catch (error: any) {
                    console.warn(`获取MCP服务器 ${serverName} 的工具列表失败:`, error.message);
                }
            }
        }
        
        return mcpTools;
    }

    private filterTools(builtInTools: any[], mcpTools: any[]): any[] {
        // 过滤内置工具
        let filteredBuiltInTools = builtInTools;
        if (this.config.enabledTools && this.config.enabledTools.length > 0) {
            filteredBuiltInTools = builtInTools.filter(tool => {
                const toolName = tool.function?.name;
                return this.config.enabledTools.includes(toolName);
            });
        }
        
        // MCP工具不过滤，全部启用
        return [...filteredBuiltInTools, ...mcpTools];
    }

    public async cancelMessage() {
        if (this.lastRequestController) {
            this.lastRequestController?.abort();
        }
    }

    public async sendMessage(messages: ChatMessage[]): Promise<ChatMessage[]> {
        if (!this.config.apiKey && !this.config.customHeaders['Authorization']) {
            throw new Error('请先配置API密钥或自定义Authorization头');
        }
        let responseData = null
        try {
            let conversationMessages = [...messages];
            
            // 如果设置了系统角色，添加到消息开头
            if (this.config.systemRole && this.config.systemRole.trim()) {
                const systemMessage: ChatMessage = {
                    role: 'system',
                    content: this.config.systemRole.trim(),
                    timestamp: Date.now()
                };
                
                // 检查是否已经存在系统消息
                const existingSystemIndex = conversationMessages.findIndex(msg => msg.role === 'system');
                if (existingSystemIndex >= 0) {
                    // 替换现有系统消息
                    conversationMessages[existingSystemIndex] = systemMessage;
                } else {
                    // 在开头添加系统消息
                    conversationMessages.unshift(systemMessage);
                }
            }
            
            let maxIterations = 10; // 防止无限循环
            let currentIteration = 0;

            while (currentIteration < maxIterations) {
                // 获取动态工具列表（包括MCP工具）
                let allTools: any[] = [];
                if (this.config.isEnableTools) {
                    const mcpTools = await this.getMcpTools();
                    // 分别处理内置工具和MCP工具
                    allTools = this.filterTools([...tools], mcpTools);
                }

                // 构建默认请求体
                const defaultBody: any = {
                    model: this.config.modelName,
                    messages: conversationMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        tool_call_id: msg.tool_call_id || undefined,
                        tool_calls: msg.tool_calls || undefined
                    })),
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens
                };

                // 只有在启用工具时才添加工具相关字段
                if (this.config.isEnableTools) {
                    defaultBody.tools = allTools;
                    defaultBody.tool_choice = "auto";
                }
                console.log('overrideDefaultBody:', this.config.overrideDefaultBody);
                // 构建最终请求体
                let finalBody: any;
                if (this.config.overrideDefaultBody) {
                    // 完全覆盖模式：只使用自定义字段
                    finalBody = { ...this.config.customBodyFields };
                } else {
                    // 合并模式：自定义字段覆盖默认字段
                    finalBody = { ...defaultBody, ...this.config.customBodyFields };
                }

                // 构建请求头
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...this.config.customHeaders
                };

                // 如果没有自定义Authorization，则使用默认的Bearer token
                if (!headers['Authorization'] && this.config.apiKey) {
                    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                }

                console.log('发送请求:', {
                    url: `${this.config.apiBaseUrl}/chat/completions`,
                    headers: headers,
                    body: finalBody
                });
                this.lastRequestController = new AbortController();
                const signal = this.lastRequestController.signal;
                const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(finalBody),
                    signal
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                responseData = await response.json()

                if (responseData.choices && responseData.choices.length > 0) {
                    const message = responseData.choices[0].message;
                    
                    // 检查是否有工具调用
                    if (message.tool_calls && message.tool_calls.length > 0) {
                        // 添加助手的响应到对话历史
                        conversationMessages.push({
                            role: 'assistant',
                            content: message.content || '',
                            tool_calls: message.tool_calls,
                            timestamp: Date.now()
                        });

                        // 执行工具调用
                        for (const toolCall of message.tool_calls) {
                            const functionName = toolCall.function.name;
                            const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

                            try {
                                // 执行工具函数
                                const result = await this.executeTool(functionName, functionArgs);
                                
                                // 添加工具结果到对话历史
                                conversationMessages.push({
                                    role: 'tool',
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify({
                                        success: true,
                                        result: result
                                    }),
                                    timestamp: Date.now()
                                });
                            } catch (error) {
                                // 添加工具错误到对话历史
                                conversationMessages.push({
                                    role: 'tool',
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify({
                                        success: false,
                                        error: error instanceof Error ? error.message : String(error)
                                    }),
                                    timestamp: Date.now()
                                });
                            }
                        }
                        
                        currentIteration++;
                        // 继续下一次循环，让AI基于工具结果生成最终响应
                        continue;
                    } else {
                        // 没有工具调用，直接返回响应内容
                        return conversationMessages || [];
                    }
                } else {
                    throw new Error('API返回了无效的响应');
                }
            }

            throw new Error('工具调用循环次数过多，可能存在无限循环');
        } catch (error: any) {
            console.error('AI服务错误:', error);
            
            if (responseData) {
                const status = responseData.status;
                const message = responseData?.error?.message || responseData.statusText;
                
                switch (status) {
                    case 401:
                        throw new Error('API密钥无效或已过期');
                    case 429:
                        throw new Error('请求过于频繁，请稍后再试');
                    case 500:
                        throw new Error('服务器内部错误');
                    default:
                        throw new Error(`API请求失败: ${message}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('请求超时，请检查网络连接');
            } else {
                throw new Error(`发送消息失败: ${error.message}`);
            }
        }
    }

    public async sendMessageStream(messages: ChatMessage[], callback: StreamCallback): Promise<void> {
        if (!this.config.apiKey && !this.config.customHeaders['Authorization']) {
            throw new Error('请先配置API密钥或自定义Authorization头');
        }

        try {
            let conversationMessages = [...messages];
            
            // 如果设置了系统角色，添加到消息开头
            if (this.config.systemRole && this.config.systemRole.trim()) {
                const systemMessage: ChatMessage = {
                    role: 'system',
                    content: this.config.systemRole.trim(),
                    timestamp: Date.now()
                };
                
                // 检查是否已经存在系统消息
                const existingSystemIndex = conversationMessages.findIndex(msg => msg.role === 'system');
                if (existingSystemIndex >= 0) {
                    // 替换现有系统消息
                    conversationMessages[existingSystemIndex] = systemMessage;
                } else {
                    // 在开头添加系统消息
                    conversationMessages.unshift(systemMessage);
                }
            }
            
            let maxIterations = 10; // 防止无限循环
            let currentIteration = 0;

            while (currentIteration < maxIterations) {
                // 获取动态工具列表（包括MCP工具）
                let allTools: any[] = [];
                if (this.config.isEnableTools) {
                    const mcpTools = await this.getMcpTools();
                    // 分别处理内置工具和MCP工具
                    allTools = this.filterTools([...tools], mcpTools);
                }

                // 构建默认请求体
                const defaultBody: any = {
                    model: this.config.modelName,
                    messages: conversationMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        tool_call_id: msg.tool_call_id || undefined,
                        tool_calls: msg.tool_calls || undefined
                    })),
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                    stream: true
                };

                // 只有在启用工具时才添加工具相关字段
                if (this.config.isEnableTools) {
                    defaultBody.tools = allTools;
                    defaultBody.tool_choice = "auto";
                }

                // 构建最终请求体
                let finalBody: any;
                if (this.config.overrideDefaultBody) {
                    // 完全覆盖模式：只使用自定义字段
                    finalBody = { ...this.config.customBodyFields, stream: true };
                } else {
                    // 合并模式：自定义字段覆盖默认字段
                    finalBody = { ...defaultBody, ...this.config.customBodyFields };
                }

                // 构建请求头
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    ...this.config.customHeaders
                };

                // 如果没有自定义Authorization，则使用默认的Bearer token
                if (!headers['Authorization'] && this.config.apiKey) {
                    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                }

                console.log('发送流式请求:', {
                    url: `${this.config.apiBaseUrl}/chat/completions`,
                    headers: headers,
                    body: finalBody
                });
                this.lastRequestController = new AbortController();
                const signal = this.lastRequestController.signal;
                const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(finalBody),
                    signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                
                if (!reader) {
                    throw new Error('无法读取响应流');
                }

                let buffer = '';
                let hasToolCalls = false;
                let toolCallMap: any = {};
                let assistantMessage = '';
                const message:ChatMessage = {
                    role: 'assistant',
                    content: assistantMessage,
                    timestamp: Date.now()
                }
                conversationMessages.push(message);

                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            
                            if (data === '[DONE]') {
                                break;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices?.[0]?.delta;
                                
                                if (delta?.content) {
                                    assistantMessage += delta.content;
                                    message.content = assistantMessage;
                                    callback({ data:conversationMessages, done: false });
                                }
                                
                                // 检查工具调用
                                if (delta?.tool_calls) {
                                    hasToolCalls = true;
                                    for (const toolCall of delta.tool_calls) {
                                        if (toolCall.index !== undefined) {
                                            if (!toolCallMap[toolCall.index]) {
                                                toolCallMap[toolCall.index] = {
                                                    id: toolCall.id,
                                                    type: 'function',
                                                    function: {
                                                        name: '',
                                                        arguments: ''
                                                    }
                                                };
                                            }
                                            
                                            if (toolCall.function?.name) {
                                                toolCallMap[toolCall.index].function.name += toolCall.function.name;
                                            }
                                            
                                            if (toolCall.function?.arguments) {
                                                toolCallMap[toolCall.index].function.arguments += toolCall.function.arguments;
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn('解析流式数据失败:', data, e);
                            }
                        }
                    }
                }

                if (hasToolCalls) {
                    // 有工具调用，执行工具并继续对话
                    const tool_calls:any = Object.values(toolCallMap)
                    message.tool_calls = tool_calls;
                    for(const toolCall of tool_calls) {
                        // 执行工具调用
                        const functionName = toolCall.function.name;
                        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

                        try {
                            // 执行工具函数
                            const result = await this.executeTool(functionName, functionArgs);
                            
                            // 添加工具结果到对话历史
                            conversationMessages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify({
                                    success: true,
                                    result: result
                                }),
                                timestamp: Date.now()
                            });
                        } catch (error) {
                            // 添加工具错误到对话历史
                            conversationMessages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify({
                                    success: false,
                                    error: error instanceof Error ? error.message : String(error)
                                }),
                                timestamp: Date.now()
                            });
                        }
                    }
                    
                    
                    currentIteration++;
                    // 通知客户端开始新的工具执行轮次
                    callback({  data:conversationMessages, done: false });
                    continue;
                } else {
                    // 没有工具调用，结束流式响应
                    callback({  data:conversationMessages, done: true });
                    return;
                }
            }

            throw new Error('工具调用循环次数过多，可能存在无限循环');
        } catch (error: any) {
            console.error('流式AI服务错误:', error);
            
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || error.response.statusText;
                
                switch (status) {
                    case 401:
                        throw new Error('API密钥无效或已过期');
                    case 429:
                        throw new Error('请求过于频繁，请稍后再试');
                    case 500:
                        throw new Error('服务器内部错误');
                    default:
                        throw new Error(`API请求失败: ${message}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('请求超时，请检查网络连接');
            } else {
                throw new Error(`发送消息失败: ${error.message}`);
            }
        }
    }

    public getConfig(): AiConfig {
        return { ...this.config };
    }

    private async executeTool(functionName: string, args: any): Promise<any> {
        console.log(`执行工具: ${functionName}`, args);
        // 然后检查内置工具
        if(toolHandlers[functionName]) {
            return await toolHandlers[functionName](args);
        } else {
            console.log(`未知的内置工具函数: ${functionName}`);
        }
        
        // 首先检查是否是MCP工具（格式：serverName_toolName）
        const mcpMatch = functionName.match(/^([^_]+)_(.+)$/);
        if (mcpMatch && this.mcpManager) {
            const [_input, serverName, toolName] = mcpMatch;
            console.log(`识别为MCP工具: 服务器=${serverName}, 工具=${toolName}`);
            // 检查是否选择了该MCP服务器
            if (this.selectedMcpServers.includes(serverName)) {
                try {
                    const result = await this.mcpManager.callTool(serverName, toolName, args);
                    return result;
                } catch (error: any) {
                    throw new Error(`MCP工具调用失败 (${serverName}.${toolName}): ${error.message}`);
                }
            } else {
                throw new Error(`MCP服务器 ${serverName} 未启用`);
            }
        }
        throw new Error(`未知的工具函数: ${functionName}`);
        
        
    }

    public setSelectedMcpServers(servers: string[]): void {
        this.selectedMcpServers = servers;
    }

    public async testConnection(): Promise<boolean> {
        try {
            await this.sendMessage([
                {
                    role: 'user',
                    content: '测试连接',
                    timestamp: Date.now()
                }
            ]);
            return true;
        } catch (error) {
            return false;
        }
    }
}