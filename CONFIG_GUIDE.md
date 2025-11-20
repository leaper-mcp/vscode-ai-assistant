# 高级配置指南

本指南详细说明如何使用自定义header和body配置来支持各种AI服务提供商。

## ⚠️ 重要更新

**配置界面改进**：`customHeaders`、`customBodyFields` 和 `mcpServers` 现在使用 **多行文本框** 输入，而不是对象/数组编辑器。这样可以更方便地编辑复杂的 JSON 配置。

### 📝 新的使用方式：

1. **直接输入 JSON**：在文本框中直接输入 JSON 内容，不需要引号包围
2. **更好的可读性**：支持多行格式，便于编辑和查看
3. **错误提示**：如果 JSON 格式错误，会显示具体的错误信息

### ✨ 示例：
现在可以这样输入：
```json
{
  "Authorization": "Bearer your-api-key",
  "User-Agent": "MyApp/1.0",
  "X-Custom-Header": "custom-value"
}
```

---

## 📋 配置选项说明

### 1. 自定义请求头 (customHeaders)

允许添加自定义HTTP请求头，用于兼容不同的API格式。

#### 配置格式：
在 VSCode 设置中的 `aiChat.customHeaders` 字段输入以下 JSON 字符串：

```json
{
  "Authorization": "Bearer your-api-key",
  "User-Agent": "MyApp/1.0",
  "X-Custom-Header": "custom-value"
}
```

**注意**：现在使用多行文本框输入，不需要外层的引号，直接输入 JSON 内容即可。

#### 常用场景：
- **Claude API**: 需要特殊的Authorization格式
- **国内API**: 可能需要特殊的User-Agent
- **自定义认证**: 支持其他认证方式

---

### 2. AI助手角色设定 (systemRole)

为AI助手设置特定的角色或个性，会作为系统消息添加到每次对话的开头。

#### 配置方式：
在 VSCode 设置中的 `aiChat.systemRole` 字段直接输入文本内容。

#### 常用角色示例：

**开发专家**：
```
你现在是一个资深的软件开发专家，具有丰富的前端和后端开发经验。你擅长分析代码、解决问题，并提供最佳实践建议。
```

**产品经理**：
```
你现在是一个经验丰富的产品经理，擅长需求分析、用户研究和产品设计。你能够从用户角度思考问题，并提供清晰的产品建议。
```

**数据分析师**：
```
你现在是一个专业的数据分析师，精通数据处理、统计分析和可视化。你能够洞察数据背后的趋势，并提供有价值的商业洞察。
```

**创意写作助手**：
```
你现在是一个富有创意的写作助手，擅长各种文体的创作。你能够提供优美的文笔、丰富的想象力和独特的表达方式。
```

**教师**：
```
你现在是一个耐心细致的教师，擅长用简单易懂的方式解释复杂的概念。你能够循序渐进地引导学生，并提供实用的学习建议。
```

#### 使用效果：
- 设置后，AI助手会以指定角色的身份回应所有对话
- 影响回答的语气、专业性和风格
- 可以显著提升特定领域的对话质量
- 适用于专业场景或特定任务需求

---

### 3. 自定义请求体字段 (customBodyFields)

允许添加或覆盖请求体中的字段。

#### 配置格式：
在 VSCode 设置中的 `aiChat.customBodyFields` 字段输入以下 JSON 字符串：

```json
{
  "stream": false,
  "top_p": 0.9,
  "frequency_penalty": 0.1,
  "presence_penalty": 0.1
}
```

**注意**：现在使用多行文本框输入，不需要外层的引号，直接输入 JSON 内容即可。

#### 常用场景：
- **Claude API**: 需要不同的字段名称
- **参数扩展**: 添加模型特有的参数
- **行为控制**: 控制流式响应、重复性等

---

### 4. 覆盖默认请求体 (overrideDefaultBody)

完全覆盖默认请求体结构，用于API格式完全不同的服务。

#### 配置格式：
在 VSCode 设置中配置：

1. 设置 `aiChat.overrideDefaultBody` 为 `true`
2. 在 `aiChat.customBodyFields` 字段中输入：
```json
{
  "prompt": "{{message}}",
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**注意**: 开启此选项后，需要完全重写请求体结构。

---

## 🔧 实际配置示例

### 示例 1: OpenAI 兼容API

在 VSCode 设置中配置：

- `aiChat.apiBaseUrl`: `https://api.openai.com/v1`
- `aiChat.apiKey`: `sk-xxxxxxxx`
- `aiChat.modelName`: `gpt-3.5-turbo`
- `aiChat.customHeaders`:
```json
{
  "Authorization": "Bearer sk-xxxxxxxx"
}
```
- `aiChat.customBodyFields`:
```json
{
  "stream": false,
  "top_p": 0.9
}
```
- `aiChat.overrideDefaultBody`: `false`

- `aiChat.customHeaders`:
```json
{
  "x-api-key": "your-claude-api-key",
  "anthropic-version": "2023-06-01",
  "Content-Type": "application/json"
}
```
- `aiChat.customBodyFields`:
```json
{
  "max_tokens": 2000,
  "stream": false
}
```
- `aiChat.overrideDefaultBody`: `true`

### 示例 3: 国内API提供商

在 VSCode 设置中配置：

- `aiChat.apiBaseUrl`: `https://api.deepseek.com/v1`
- `aiChat.apiKey`: `sk-xxxxxxxx`
- `aiChat.modelName`: `deepseek-chat`
- `aiChat.customHeaders`:
```json
{
  "Authorization": "Bearer sk-xxxxxxxx",
  "User-Agent": "VSCode-AI-Chat/1.0"
}
```
- `aiChat.customBodyFields`:
```json
{
  "stream": false
}
```
- `aiChat.overrideDefaultBody`: `false`

---

### 5. MCP服务器配置 (mcpServers)

配置 MCP (Model Context Protocol) 服务器来扩展 AI 助手的功能。

#### 配置格式：
在 VSCode 设置中的 `aiChat.mcpServers` 字段输入以下 JSON 数组：

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
  },
  {
    "name": "sse-server",
    "type": "sse",
    "sse": "http://localhost:3000/sse"
  },
  {
    "name": "websocket-server",
    "type": "websocket",
    "websocket": "ws://localhost:3000/ws"
  }
]
```

#### 服务器类型说明：

- **stdio**: 标准输入输出通信方式，适合本地进程
- **sse**: Server-Sent Events 通信方式，适合 HTTP 服务
- **websocket**: WebSocket 通信方式，适合实时双向通信

#### 常用 MCP 服务器：

1. **文件系统访问**：
```json
{
  "name": "filesystem",
  "type": "stdio",
  "stdio": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "/your/workspace/path"]
  }
}
```

2. **Git 仓库操作**：
```json
{
  "name": "git",
  "type": "stdio",
  "stdio": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-git", "--repository", "/your/repo/path"]
  }
}
```

---

## 🎯 高级用法

### 1. 动态参数调整
通过配置不同的参数来调整AI输出：

在 `aiChat.customBodyFields` 字段中配置：

```json
{
  "temperature": 0.1,    // 低温度：更保守的回答
  "top_p": 0.9,         // 核采样
  "frequency_penalty": 0.5, // 降低重复性
    "presence_penalty": 0.3   // 增加话题多样性
  }
}
```

### 2. 流式响应控制
```json
{
  "aiChat.customBodyFields": {
    "stream": true  // 启用流式响应（需要前端支持）
  }
}
```

### 3. 特殊格式API
对于完全不同的API格式：
```json
{
  "aiChat.overrideDefaultBody": true,
  "aiChat.customBodyFields": {
    "input": "{{message}}",
    "parameters": {
      "max_new_tokens": 2000,
      "temperature": 0.7
    }
  }
}
```

---

## 🐛 调试技巧

### 1. 查看配置信息
点击侧边栏中的"配置信息"按钮，查看当前生效的配置：

```
配置信息：
- API地址: https://api.example.com/v1
- 模型名称: gpt-3.5-turbo
- 温度: 0.7
- 最大令牌数: 2000
- 自定义请求头: {"Authorization": "Bearer xxx", "User-Agent": "VSCode"}
- 自定义请求体字段: {"stream": false}
- 覆盖默认请求体: 否
```

### 2. 常见错误处理

**错误**: "请先配置API密钥或自定义Authorization头"
- 检查 customHeaders 中是否包含 Authorization
- 或者配置 apiKey

**错误**: "API请求失败: 400 Bad Request"
- 检查 customBodyFields 字段格式是否正确
- 确认 overrideDefaultBody 设置是否合适

### 3. 调试命令
在VSCode命令面板中使用：
- "显示当前配置信息": 查看完整配置
- "配置AI设置": 快速打开设置页面

---

## 🔒 安全注意事项

1. **API密钥保护**: 使用 `scope: "application"` 确保密钥安全
2. **敏感信息**: 避免在配置中直接写入敏感信息
3. **版本控制**: 记得将 `.vscode/settings.json` 添加到 `.gitignore`

---

## 📚 参考资源

- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [Claude API 文档](https://docs.anthropic.com/claude/reference)
- [VSCode 扩展配置](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration)

通过合理配置这些选项，你可以让插件支持几乎所有的AI服务提供商！🚀