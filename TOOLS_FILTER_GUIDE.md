# 内置工具启用配置说明

## 新增配置项

在 VSCode 设置中新增了 `aiChat.enabledTools` 配置项，允许用户精确控制哪些**内置工具**可以被 AI 使用。

### 配置格式

```json
{
  "aiChat.enabledTools": ["工具名1", "工具名2", "工具名3"]
}
```

### 配置说明

- **类型**: 字符串数组（JSON格式）
- **默认值**: `[]` (空数组，表示启用所有内置工具)
- **作用域**: 应用级别
- **范围**: 仅对内置工具（tools.ts中的工具）生效，MCP工具不受此配置影响

### 可用工具列表

#### 内置工具
- `getProjectPath` - 获取当前工作区路径
- `getCurrentFilePath` - 获取当前文件路径
- `getAllOpenFiles` - 获取所有打开的文件列表
- `getCurrentSelection` - 获取当前选中的文本
- `getCurrentLineContent` - 获取当前行内容
- `getCursorInfo` - 获取光标位置信息
- `openFileToEdit` - 打开文件进行编辑
- `fsReadFile` - 读取文件内容
- `fsWriteFile` - 写入文件内容
- `fsDelete` - 删除文件或目录
- `fsRename` - 重命名文件或目录
- `fsCreateDirectory` - 创建目录
- `fsReadDirectory` - 读取目录内容
- `fsStat` - 获取文件状态信息
- `fsCopy` - 复制文件或目录
- `fsEditFile` - 高级文件编辑
- `fsSearchFiles` - 搜索文件

### MCP工具说明

**注意**: MCP工具（通过MCP服务器提供的工具）不受此配置影响，所有配置的MCP工具都会被启用。MCP工具的名称格式通常为 `服务器名_工具名`。

### 配置示例

#### 1. 只启用文件读取相关工具
```json
{
  "aiChat.enabledTools": [
    "getProjectPath",
    "getCurrentFilePath", 
    "fsReadFile",
    "fsReadDirectory",
    "fsStat"
  ]
}
```

#### 2. 启用基础文件操作工具
```json
{
  "aiChat.enabledTools": [
    "getProjectPath",
    "getCurrentFilePath",
    "fsReadFile",
    "fsWriteFile",
    "fsEditFile"
  ]
}
```

#### 3. 启用所有内置工具（默认行为）
```json
{
  "aiChat.enabledTools": []
}
```

### 注意事项

1. **工具依赖关系**: 某些工具可能依赖其他工具，请根据需要合理配置
2. **安全性**: 建议只启用必要的工具，特别是文件写入和删除类工具
3. **MCP工具**: MCP工具不受此配置影响，只要配置了MCP服务器，相关工具都会启用
4. **配置更新**: 修改配置后需要重新打开AI对话界面或重启VSCode才能生效

### 如何使用

1. 打开VSCode设置（`Ctrl+,` 或 `Cmd+,`）
2. 搜索 "aiChat"
3. 找到 "AI Assistant: Enabled Tools" 配置项
4. 输入JSON格式的工具名称数组
5. 保存配置

### 与其他配置的关系

- `aiChat.enableTools`: 全局开关，控制是否启用工具功能
- `aiChat.enabledTools`: 精确控制哪些内置工具可用，不影响MCP工具
- 只有当 `enableTools` 为 `true` 时，`enabledTools` 配置才会生效