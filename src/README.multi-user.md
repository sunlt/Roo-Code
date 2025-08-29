# Roo Code 多用户模式指南

## 概述

Roo Code 默认启用多用户模式，允许多个用户通过 WebSocket 连接共享同一个扩展实例。

## 启动多用户服务器

### 环境变量配置

多用户模式是默认启用的，可以通过设置环境变量来配置相关参数：

```bash
# 可选：指定服务器端口（默认为3000）
PORT=3000
```

### 启动命令

```bash
# 构建项目
pnpm build

# 启动多用户服务器（默认启用多用户模式）
node dist/standalone.js
```

## WebSocket 连接

### 连接URL格式

客户端需要通过 WebSocket 连接到服务器，并在 URL 中包含 `uid` 参数：

```
ws://localhost:3000/?uid={用户ID}
```

### 连接示例

```javascript
// JavaScript 客户端示例
const userId = "user123"
const ws = new WebSocket(`ws://localhost:3000/?uid=${userId}`)

ws.onopen = () => {
	console.log("Connected to Roo Code Multi-User Server")
}

ws.onmessage = (event) => {
	const message = JSON.parse(event.data)
	console.log("Received message:", message)
}

ws.onclose = () => {
	console.log("Disconnected from server")
}
```

## 消息格式

### 客户端发送消息

客户端发送的消息应遵循以下格式：

```json
{
	"command": "命令名称",
	"data": {
		/* 命令相关数据 */
	}
}
```

### 服务器响应消息

服务器发送的响应消息格式：

```json
{
	"type": "消息类型",
	"uid": "用户ID",
	"command": "命令名称",
	"data": {
		/* 响应数据 */
	},
	"message": "消息内容",
	"timestamp": 1234567890,
	"error": "错误信息"
}
```

### 支持的命令

1. **ping** - 心跳检测

    ```json
    {
    	"command": "ping"
    }
    ```

2. **execute** - 执行命令（示例）
    ```json
    {
    	"command": "execute",
    	"data": {
    		/* 执行相关数据 */
    	}
    }
    ```

## 用户会话管理

### 会话创建

当用户首次连接时，系统会自动为其创建会话上下文：

1. 解析连接 URL 中的 `uid` 参数
2. 如果该用户尚不存在会话上下文，则创建新的 SessionContext
3. 在用户上下文中激活扩展

### 会话隔离

每个用户的会话是完全隔离的：

- 每个用户拥有独立的 SessionContext
- 用户状态、工作区状态和全局状态相互隔离
- 文件系统访问通过用户ID进行隔离

## 单用户模式兼容性

Roo Code 现在默认启用多用户模式，不再支持单用户模式。

## 开发和测试

### 运行测试

```bash
# 运行多用户模式相关测试
cd src
npx vitest run __tests__/standalone.test.ts
```

### 测试覆盖

测试包括：

1. 多用户模式启动验证
2. 单用户模式兼容性验证
3. WebSocket 连接处理
4. 消息路由和处理
5. 用户会话管理

## 故障排除

### 常见问题

1. **连接失败**

    - 检查服务器是否已启动
    - 确认端口配置正确
    - 验证 `uid` 参数是否正确传递

2. **消息处理错误**
    - 检查消息格式是否正确
    - 查看服务器日志获取详细错误信息

### 日志查看

服务器会输出详细的日志信息，可通过以下方式查看：

```bash
# 启动时查看实时日志
MULTI_USER=1 node dist/standalone.js
```

## 架构说明

### 核心组件

1. **WebSocket 服务器** - 处理客户端连接
2. **SessionManager** - 管理用户会话
3. **消息路由器** - 将消息路由到正确的用户上下文

### 数据流

```
客户端 -> WebSocket服务器 -> 消息解析 -> 用户上下文路由 -> 命令执行 -> 响应返回
```

### 安全性

- 用户访问权限验证
- 路径遍历防护
- 资源配额管理
