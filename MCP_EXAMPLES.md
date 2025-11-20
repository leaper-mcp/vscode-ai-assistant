# MCP配置示例

这个文件展示了如何在VSCode AI Chat Assistant中配置MCP服务器。

## 基本配置格式

在VSCode设置中搜索 "aiChat.mcpServers"，在输入框中添加以下JSON格式的配置：

```json
[
  {
    "name": "filesystem",
    "type": "stdio",
    "stdio": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    }
  },
  {
    "name": "git",
    "type": "stdio", 
    "stdio": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-git", "--repository", "${workspaceFolder}"]
    }
  },
  {
    "name": "github",
    "type": "stdio",
    "stdio": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-github"]
    }
  },
  {
    "name": "sqlite",
    "type": "stdio",
    "stdio": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-sqlite", "path/to/database.db"]
    }
  },
  {
    "name": "brave-search",
    "type": "stdio",
    "stdio": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-brave-search"]
    }
  }
]
```

## 支持的连接类型

### 1. stdio (标准输入输出)
适用于本地进程运行的MCP服务器：

```json
{
  "name": "服务器名称",
  "type": "stdio",
  "stdio": {
    "command": "可执行文件路径",
    "args": ["参数1", "参数2", ...]
  }
}
```

### 2. SSE (Server-Sent Events)
适用于基于HTTP的MCP服务器：

```json
{
  "name": "服务器名称", 
  "type": "sse",
  "sse": "https://your-mcp-server.com/sse"
}
```

### 3. WebSocket
适用于WebSocket连接的MCP服务器：

```json
{
  "name": "服务器名称",
  "type": "websocket", 
  "websocket": "wss://your-mcp-server.com/ws"
}
```

## 特殊变量

### ${workspaceFolder}
自动替换为当前工作区的路径。例如：
```json
{
  "name": "filesystem",
  "type": "stdio",
  "stdio": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
  }
}
```

## 使用说明

1. **配置MCP服务器**：在VSCode设置中添加服务器配置
2. **启动Agent模式**：在AI对话界面开启Agent模式
3. **选择MCP服务器**：勾选要使用的MCP服务器
4. **开始对话**：AI将自动发现并可以使用所有启用的MCP工具

## 工具调用格式

AI会自动发现MCP工具，调用格式为：
- **工具名称**：`服务器名_工具名` (例如：`filesystem_read_file`)
- **工具描述**：会显示`[MCP:服务器名]`前缀，便于识别

## 常见MCP服务器

### 文件系统工具
```json
{
  "name": "filesystem",
  "type": "stdio", 
  "stdio": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
  }
}
```

### Git工具
```json
{
  "name": "git",
  "type": "stdio",
  "stdio": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-git", "--repository", "${workspaceFolder}"]
  }
}
```

### GitHub工具
```json
{
  "name": "github", 
  "type": "stdio",
  "stdio": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-github"]
  }
}
```

## 故障排除

1. **MCP服务器未显示**：
   - 检查MCP服务器配置是否正确
   - 查看输出面板的MCP Server消息
   - 确保相关npm包已安装

2. **工具调用失败**：
   - 确保选择了正确的MCP服务器
   - 检查服务器是否正常运行
   - 查看错误消息获取详细信息

3. **权限问题**：
   - 确保MCP服务器有访问相关资源的权限
   - 检查工作区路径是否正确

## 高级用法

你可以组合多个MCP服务器，AI将能够：
- 使用filesystem工具读取和写入文件
- 使用git工具管理版本控制
- 使用github工具与GitHub交互
- 使用brave-search进行网络搜索
- 使用sqlite操作数据库

所有工具都会自动集成到AI的对话流程中，无需额外配置。