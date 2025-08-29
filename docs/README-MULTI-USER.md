# Roo Code 多用户模式使用指南

Roo Code 的多用户模式允许在单个实例中为多个用户隔离运行环境，确保每个用户的数据、状态和资源完全独立。本文档将详细介绍如何配置、使用和管理多用户模式。

## 目录

- [启动多用户模式](#启动多用户模式)
- [WebSocket 连接方式](#websocket-连接方式)
- [API 使用方法](#api-使用方法)
- [资源隔离机制](#资源隔离机制)
- [性能优化和资源管理](#性能优化和资源管理)
- [故障排除](#故障排除)
- [示例配置](#示例配置)

## 启动多用户模式

### 环境变量设置

要启用多用户模式，需要设置以下环境变量：

```bash
# 启用多用户模式
MULTI_USER=1

# 可选：设置用户数据存储路径
USER_DATA_PATH=/path/to/user/data

# 可选：设置状态文件存储路径
STATE_STORAGE_PATH=/path/to/state/storage
```

### 启动命令

```bash
# 设置环境变量并启动
export MULTI_USER=1
npm start

# 或者使用一次性命令
MULTI_USER=1 npm start
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制文件
COPY . .

# 安装依赖
RUN npm install

# 设置环境变量
ENV MULTI_USER=1

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

```bash
# docker-compose.yml
version: '3.8'
services:
  roo-code:
    build: .
    environment:
      - MULTI_USER=1
      - USER_DATA_PATH=/data/users
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
```

## WebSocket 连接方式

### 连接地址格式

多用户模式下的 WebSocket 连接需要包含用户标识：

```
ws://localhost:3000/ws?userId={userId}
wss://your-domain.com/ws?userId={userId}
```

### 客户端连接示例

```javascript
// JavaScript 客户端连接示例
const userId = "user123"
const ws = new WebSocket(`ws://localhost:3000/ws?userId=${userId}`)

ws.onopen = () => {
	console.log("Connected to Roo Code multi-user server")
}

ws.onmessage = (event) => {
	const data = JSON.parse(event.data)
	console.log("Received:", data)
}

ws.onclose = () => {
	console.log("Disconnected from server")
}
```

```python
# Python 客户端连接示例
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")

def on_open(ws):
    print("Connected to Roo Code multi-user server")

userId = 'user123'
ws = websocket.WebSocketApp(
    f"ws://localhost:3000/ws?userId={userId}",
    on_open=on_open,
    on_message=on_message
)

ws.run_forever()
```

## API 使用方法

### 用户上下文管理

在多用户模式下，所有操作都在用户上下文中执行：

```javascript
// 获取当前用户ID
const userId = getUserId()

// 在指定用户上下文中执行代码
const result = withUserContext(userId, () => {
	// 用户特定的操作
	return performUserOperation()
})
```

### 状态管理 API

```javascript
// 全局状态管理（用户隔离）
await state.globalState.update("user-setting", "value")
const setting = await state.globalState.get("user-setting")

// 工作区状态管理（用户隔离）
await state.workspaceState.update("workspace-data", { key: "value" })
const workspaceData = await state.workspaceState.get("workspace-data")
```

### 文件系统 API

```javascript
// 文件操作（用户隔离的文件系统）
const fileUri = Uri.file("/project/main.js")
const content = new TextEncoder().encode('console.log("Hello World");')
await workspace.fs.writeFile(fileUri, content)

const fileContent = await workspace.fs.readFile(fileUri)
const decodedContent = new TextDecoder().decode(fileContent)
```

### 终端 API

```javascript
// 创建用户专属终端
const terminal = terminal.createTerminal({
	name: "User Terminal",
	shellPath: "/bin/bash",
})

terminal.sendText("ls -la")
terminal.show()
```

### 命令 API

```javascript
// 注册用户专属命令
const disposable = commands.registerCommand("user.customCommand", (args) => {
	console.log("User command executed:", args)
})

// 执行命令
await commands.executeCommand("user.customCommand", { data: "example" })
```

## 资源隔离机制

### 用户数据隔离

多用户模式通过以下方式实现资源隔离：

1. **文件系统隔离**：每个用户的文件操作被限制在其专属目录中
2. **状态隔离**：用户状态存储在独立的命名空间中
3. **命令隔离**：用户注册的命令带有用户前缀，防止冲突
4. **终端隔离**：每个用户拥有独立的终端实例

### 目录结构

```
/users/
├── user1/
│   ├── globalState.json
│   ├── workspaceState.json
│   └── project/
│       ├── file1.js
│       └── file2.js
├── user2/
│   ├── globalState.json
│   ├── workspaceState.json
│   └── project/
│       ├── main.py
│       └── utils.py
└── user3/
    ├── globalState.json
    ├── workspaceState.json
    └── workspace/
        └── app.ts
```

### 访问控制

```javascript
// 用户只能访问自己的目录
// 用户 user1 只能访问 /users/user1/ 路径下的文件
const user1File = Uri.file("/project/document.txt") // 实际路径: /users/user1/project/document.txt
await workspace.fs.readFile(user1File)

// 尝试访问其他用户目录会被阻止
const otherUserFile = Uri.file("/users/user2/document.txt") // 会被重定向到用户自己的路径
```

## 性能优化和资源管理

### 内存管理

```javascript
// 合理使用用户上下文
const userId = getUserId()

// 避免长时间持有用户上下文引用
const userData = await withUserContext(userId, async () => {
	return await state.globalState.get("large-data")
})

// 及时清理不需要的资源
commands.registerCommand("cleanup", () => {
	// 清理用户特定的资源
})
```

### 并发处理

```javascript
// 处理多个用户的并发操作
const userIds = ["user1", "user2", "user3"]

// 并发执行用户操作
const promises = userIds.map(async (userId) => {
	return withUserContext(userId, async () => {
		// 执行用户特定操作
		await performUserTask()
		return getUserId()
	})
})

const results = await Promise.all(promises)
```

### 资源限制

```javascript
// 设置用户资源限制
const config = {
	maxFileSize: 10 * 1024 * 1024, // 10MB
	maxConcurrentOperations: 5,
	storageQuota: 100 * 1024 * 1024, // 100MB
}
```

## 故障排除

### 常见问题

#### 1. 用户上下文丢失

**问题**：`No user context available` 错误

**解决方案**：

```javascript
// 确保在用户上下文中执行操作
const userId = "user123"
const result = await withUserContext(userId, async () => {
	return await state.globalState.get("key")
})
```

#### 2. 文件访问权限问题

**问题**：无法访问文件或目录

**解决方案**：

```javascript
// 检查用户访问权限
const userId = getUserId()
const resourcePath = "/project/file.txt"

// 确保文件路径在用户目录内
const userPath = `/users/${userId}${resourcePath}`
```

#### 3. 命令执行失败

**问题**：命令未找到或执行失败

**解决方案**：

```javascript
// 确保在正确的用户上下文中注册和执行命令
const userId = getUserId()
const result = await withUserContext(userId, async () => {
	return await commands.executeCommand("user.command")
})
```

### 日志和监控

```javascript
// 启用详细日志
process.env.DEBUG = "roo-code:*"

// 监控用户活动
const userActivity = {
	userId: getUserId(),
	timestamp: new Date().toISOString(),
	action: "file_operation",
	details: {
		operation: "writeFile",
		path: "/project/file.txt",
	},
}

console.log("User Activity:", userActivity)
```

## 示例配置

### 开发环境配置

```bash
# .env 文件
MULTI_USER=1
USER_DATA_PATH=./data/users
STATE_STORAGE_PATH=./data/states
DEBUG=roo-code:*
```

### 生产环境配置

```bash
# 生产环境环境变量
MULTI_USER=1
USER_DATA_PATH=/var/lib/roo-code/users
STATE_STORAGE_PATH=/var/lib/roo-code/states
LOG_LEVEL=info
MAX_CONCURRENT_USERS=100
```

### 客户端集成示例

```javascript
// 完整的客户端集成示例
class RooCodeMultiUserClient {
	constructor(baseUrl, userId) {
		this.baseUrl = baseUrl
		this.userId = userId
		this.ws = null
	}

	async connect() {
		return new Promise((resolve, reject) => {
			this.ws = new WebSocket(`${this.baseUrl}/ws?userId=${this.userId}`)

			this.ws.onopen = () => {
				console.log(`Connected as user: ${this.userId}`)
				resolve()
			}

			this.ws.onerror = (error) => {
				reject(error)
			}

			this.ws.onmessage = (event) => {
				const data = JSON.parse(event.data)
				this.handleMessage(data)
			}
		})
	}

	sendMessage(message) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message))
		}
	}

	handleMessage(data) {
		console.log("Received message:", data)
		// 处理接收到的消息
	}

	disconnect() {
		if (this.ws) {
			this.ws.close()
		}
	}
}

// 使用示例
const client = new RooCodeMultiUserClient("ws://localhost:3000", "user123")
await client.connect()

// 发送消息
client.sendMessage({
	type: "execute",
	command: "create-file",
	params: {
		path: "/project/new-file.js",
		content: 'console.log("Hello World!");',
	},
})
```

### 用户管理脚本

```javascript
// 用户管理工具
const userManagement = {
	// 创建用户上下文
	async createUser(userId, rootPath) {
		return createUserContext(userId, Uri.file(rootPath))
	},

	// 获取用户信息
	async getUserInfo(userId) {
		return withUserContext(userId, () => {
			return {
				userId: getUserId(),
				state: state.globalState.get("user-info"),
			}
		})
	},

	// 删除用户数据
	async deleteUser(userId) {
		// 实现用户数据清理逻辑
		console.log(`Deleting user: ${userId}`)
	},
}
```

## 最佳实践

1. **始终在用户上下文中执行操作**
2. **及时清理不需要的资源**
3. **合理设置资源限制**
4. **启用适当的日志记录**
5. **定期备份用户数据**
6. **监控系统性能**

通过遵循本文档中的指南，您可以成功配置和使用 Roo Code 的多用户模式，为多个用户提供隔离且高效的开发环境。
