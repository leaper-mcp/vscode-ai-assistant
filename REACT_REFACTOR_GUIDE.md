# React 重构说明

## 概述

已将 VSCode 扩展的 webview 从大型 HTML 字符串重构为基于 React 的组件化架构。

## 目录结构

```
src/
├── webview/
│   ├── components/          # React 组件
│   │   ├── App.tsx          # 主应用组件
│   │   ├── ChatContainer.tsx # 聊天容器组件
│   │   ├── ChatMessage.tsx  # 聊天消息组件
│   │   ├── InputArea.tsx    # 输入区域组件
│   │   └── Toolbar.tsx      # 工具栏组件
│   ├── index.tsx           # React 应用入口
│   ├── styles.css          # 样式文件
│   └── types.ts            # TypeScript 类型定义
└── aiChatProvider.ts       # 更新后的 webview 提供者
```

## 主要改进

### 1. 组件化架构
- **ChatMessage**: 处理单个消息的渲染，支持 Markdown 和用户消息的不同显示
- **ChatContainer**: 管理消息列表和自动滚动
- **Toolbar**: 独立的工具栏组件，包含 Agent 模式开关
- **InputArea**: 输入区域组件，处理用户输入和键盘事件
- **App**: 主应用组件，管理状态和与 VSCode 的通信

### 2. 类型安全
- 完整的 TypeScript 类型定义
- 强类型的消息传递接口
- 组件 Props 类型安全

### 3. 更好的可维护性
- 关注点分离：每个组件负责特定功能
- 样式独立管理
- 状态管理集中化

### 4. 构建优化
- 独立的 webview TypeScript 配置
- 自动化的构建流程
- 资源文件自动复制

## 构建命令

```bash
# 编译主扩展
npm run compile

# 编译 webview React 组件
npm run compile:webview

# 复制资源文件
npm run copy:assets

# 完整构建
npm run build
```

## 配置文件

### tsconfig.webview.json
专门为 webview React 组件配置的 TypeScript 编译选项：
- 支持 JSX (React)
- 输出到 `out/webview` 目录
- 优化的模块解析

## 注意事项

1. **CSP 策略**: 已更新 Content Security Policy 以支持 React 运行时
2. **资源 URI**: 所有资源都使用 VSCode 的 webview URI 方式引用
3. **依赖管理**: React 和 React-DOM 从 CDN (UMD) 加载以简化部署
4. **样式隔离**: 样式文件独立管理，使用 VSCode 主题变量

## 开发工作流

1. 修改 React 组件
2. 运行 `npm run compile:webview` 编译
3. 运行 `npm run copy:assets` 复制样式
4. 重新加载扩展进行测试

## 性能优化

- 组件使用 React Hooks 进行状态管理
- 自动滚动优化使用 useRef
- 事件处理使用 useCallback (如需要可添加)
- 消息渲染使用 key 进行优化