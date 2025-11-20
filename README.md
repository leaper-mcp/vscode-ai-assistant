# AI Chat Assistant

一个支持AI对话和MCP(Model Context Protocol)接入的VSCode插件。

## 功能特性

- ✅ 支持多种AI模型配置（OpenAI API格式）
- ✅ 可配置API地址、密钥、模型名称等参数
- ✅ **🔧 高级配置支持**：自定义HTTP请求头和请求体
- ✅ **🌐 广泛兼容**：支持Claude、国内API等各类服务
- ✅ **🚀 流式响应**：实时查看AI回复过程，类似ChatGPT体验
- ✅ 美观的对话界面，支持历史记录
- ✅ MCP服务器接入支持
- ✅ 实时查看MCP服务器状态和工具列表
- ✅ 快捷键支持（Ctrl+Alt+A）

## 安装

1. 克隆此仓库到本地
2. 在VSCode中打开项目
3. 运行 `npm install` 安装依赖
4. 运行 `npm run compile` 编译TypeScript代码
5. 按F5启动调试模式

## 配置

在VSCode设置中搜索 "AI Chat" 进行配置：

### 基本配置

- `aiChat.apiBaseUrl`: AI模型API基础地址（默认: `https://api.openai.com/v1`）
- `aiChat.apiKey`: API密钥（需要手动配置）
- `aiChat.modelName`: 模型名称（默认: `gpt-3.5-turbo`）
- `aiChat.systemRole`: **AI助手角色设定**（可选），会作为系统消息添加到对话开头，例如：你现在是一个开发专家

### 🔧 高级配置

- `aiChat.customHeaders`: **自定义HTTP请求头**（JSON格式），支持不同的认证方式
- `aiChat.customBodyFields`: **自定义请求体字段**（JSON格式），可添加模型特有参数
- `aiChat.overrideDefaultBody`: **覆盖默认请求体**，用于API格式完全不同的服务

> 💡 **详细配置指南**: 
> - 查看 [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) 了解如何配置各种AI服务
> - 查看 [STREAM_GUIDE.md](./STREAM_GUIDE.md) 了解流式响应的使用

### MCP配置

`aiChat.mcpServers`: MCP服务器配置列表（JSON数组格式），现在使用多行文本框输入。

示例配置（直接在设置界面中输入）：
```json
[
  {
    "name": "filesystem",
    "type": "stdio",
    "stdio": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  },
  {
    "name": "git",
    "type": "stdio",
    "stdio": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-git", "--repository", "/path/to/repo"]
    }
  }
]
```

**注意**：
- 现在使用多行文本框输入，不需要外层的引号
- 每个服务器需要指定 `type`（stdio、sse 或 websocket）
- 对于 stdio 类型的服务器，使用 `stdio` 对象包含命令和参数

## 使用方法

### 打开AI对话
- 在左侧活动栏找到 **AI对话助手** 图标 💬 并点击
- 使用快捷键 `Ctrl+Alt+A`（Mac: `Cmd+Alt+A`）
- 或在命令面板中搜索 "打开AI对话"

### 侧边栏功能
- **对话区域**：显示与AI助手的完整对话历史
- **输入框**：在底部输入消息，按Enter发送
- **工具栏按钮**：
  - 配置：打开设置页面配置API参数
  - 清空：清除所有对话历史记录

### Agent模式和MCP管理

**Agent模式**：
- 在对话界面顶部找到"Agent模式"开关
- 开启后，AI可以使用文件操作等工具来读取和修改代码
- 开启Agent模式后，会显示可用的MCP服务器列表
- 勾选需要的MCP服务器，AI将能够使用这些服务器提供的工具
- **动态工具集成**：AI会自动发现已启用的MCP服务器的所有工具，并在对话中可以使用
- **智能工具命名**：MCP工具会以`服务器名_工具名`的格式提供给AI，避免冲突
- **实时状态反馈**：选择/取消MCP服务器时会显示状态消息

**MCP管理**：
- 列出MCP服务器：在命令面板中搜索 "列出MCP服务器"
- 重连MCP服务器：在命令面板中搜索 "重连MCP服务器"
- 查看MCP输出：在命令面板中搜索 "显示MCP输出"

### 其他功能
- 配置设置：在命令面板中搜索 "配置AI设置"
- 清空历史：在命令面板中搜索 "清空对话历史"

### 角色配置
在 VSCode 设置中配置 `aiChat.systemRole` 来设定 AI 助手的角色：
- **开发专家**：提供专业的编程建议和代码分析
- **产品经理**：从产品角度提供需求分析建议
- **数据分析师**：进行数据解读和洞察分析
- **教师**：用简单易懂的方式解释概念
- **创意写作助手**：提供创意和写作建议

设置后，AI助手会以指定角色的身份回应所有对话。

## 开发

### 项目结构
```
src/
├── extension.ts        # 插件入口
├── aiService.ts       # AI服务类
├── aiChatProvider.ts  # 聊天界面Provider
└── mcpManager.ts      # MCP管理器
```

### 编译和调试
- `npm run compile`: 编译TypeScript
- `npm run watch`: 监听文件变化并自动编译
- 按F5启动VSCode调试实例

## 注意事项

1. 确保已正确配置API密钥
2. MCP服务器需要按规范实现，否则可能连接失败
3. 首次使用MCP功能时，建议查看输出面板了解连接状态
4. 对话历史会保存在VSCode的全局状态中

## 依赖

- `@modelcontextprotocol/sdk`: MCP SDK
- `axios`: HTTP请求库
- `vscode`: VSCode扩展API

## 许可证

MIT License