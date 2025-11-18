# 高级配置指南

本指南详细说明如何使用自定义header和body配置来支持各种AI服务提供商。

## 📋 配置选项说明

### 1. 自定义请求头 (customHeaders)

允许添加自定义HTTP请求头，用于兼容不同的API格式。

#### 配置格式：
```json
{
  "aiChat.customHeaders": {
    "Authorization": "Bearer your-api-key",
    "User-Agent": "MyApp/1.0",
    "X-Custom-Header": "custom-value"
  }
}
```

#### 常用场景：
- **Claude API**: 需要特殊的Authorization格式
- **国内API**: 可能需要特殊的User-Agent
- **自定义认证**: 支持其他认证方式

---

### 2. 自定义请求体字段 (customBodyFields)

允许添加或覆盖请求体中的字段。

#### 配置格式：
```json
{
  "aiChat.customBodyFields": {
    "stream": false,
    "top_p": 0.9,
    "frequency_penalty": 0.1,
    "presence_penalty": 0.1
  }
}
```

#### 常用场景：
- **Claude API**: 需要不同的字段名称
- **参数扩展**: 添加模型特有的参数
- **行为控制**: 控制流式响应、重复性等

---

### 3. 覆盖默认请求体 (overrideDefaultBody)

完全覆盖默认请求体结构，用于API格式完全不同的服务。

#### 配置格式：
```json
{
  "aiChat.overrideDefaultBody": true,
  "aiChat.customBodyFields": {
    "prompt": "{{message}}",
    "max_tokens": 2000,
    "temperature": 0.7
  }
}
```

**注意**: 开启此选项后，需要完全重写请求体结构。

---

## 🔧 实际配置示例

### 示例 1: OpenAI 兼容API
```json
{
  "aiChat.apiBaseUrl": "https://api.openai.com/v1",
  "aiChat.apiKey": "sk-xxxxxxxx",
  "aiChat.modelName": "gpt-3.5-turbo",
  "aiChat.customHeaders": {
    "Authorization": "Bearer sk-xxxxxxxx"
  },
  "aiChat.customBodyFields": {
    "stream": false,
    "top_p": 0.9
  },
  "aiChat.overrideDefaultBody": false
}
```

### 示例 2: Claude API
```json
{
  "aiChat.apiBaseUrl": "https://api.anthropic.com/v1",
  "aiChat.modelName": "claude-3-sonnet-20240229",
  "aiChat.customHeaders": {
    "x-api-key": "your-claude-api-key",
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json"
  },
  "aiChat.customBodyFields": {
    "max_tokens": 2000,
    "stream": false
  },
  "aiChat.overrideDefaultBody": true
}
```

### 示例 3: 国内API提供商
```json
{
  "aiChat.apiBaseUrl": "https://api.deepseek.com/v1",
  "aiChat.apiKey": "sk-xxxxxxxx",
  "aiChat.modelName": "deepseek-chat",
  "aiChat.customHeaders": {
    "Authorization": "Bearer sk-xxxxxxxx",
    "User-Agent": "VSCode-AI-Chat/1.0"
  },
  "aiChat.customBodyFields": {
    "stream": false
  },
  "aiChat.overrideDefaultBody": false
}
```

---

## 🎯 高级用法

### 1. 动态参数调整
通过配置不同的参数来调整AI输出：

```json
{
  "aiChat.customBodyFields": {
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