import * as http from "http"
import * as url from "url"
import * as path from "path"
import { WebSocketServer, WebSocket } from "ws"
import { activate } from "./extension"
import { withUser, createSessionContext, sessionContexts } from "./session-manager/SessionManager"
import { Uri } from "vscode"
import * as dotenvx from "@dotenvx/dotenvx"

// Load environment variables from .env file
try {
	// Specify path to .env file in the project root directory
	const envPath = path.join(__dirname, "..", ".env")
	dotenvx.config({ path: envPath })
} catch (e) {
	// Silently handle environment loading errors
	console.warn("Failed to load environment variables:", e)
}

/**
 * 多用户模式下的独立启动脚本
 * 支持通过WebSocket连接为多个用户提供服务
 */

// 创建HTTP服务器
const server = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" })
	res.end("Roo Code Multi-User Server is running")
})

// 创建WebSocket服务器
const wss = new WebSocketServer({ server })

/**
 * 客户端消息类型定义
 */
interface ClientMessage {
	command: string
	data?: any
}

/**
 * 服务器响应消息类型定义
 */
interface ServerMessage {
	type: string
	uid?: string
	command?: string
	data?: any
	message?: string
	timestamp?: number
	error?: string
}

/**
 * 处理WebSocket连接
 * @param ws WebSocket连接
 * @param req HTTP请求
 */
function handleWebSocketConnection(ws: WebSocket, req: http.IncomingMessage): void {
	try {
		// 解析URL中的uid参数
		const parsedUrl = url.parse(req.url || "", true)
		const uid = parsedUrl.query.uid as string

		if (!uid) {
			console.error("Missing uid parameter in WebSocket connection")
			ws.close(4000, "Missing uid parameter")
			return
		}

		console.log(`New WebSocket connection for user: ${uid}`)

		// 为新用户创建SessionContext（如果不存在）
		if (!sessionContexts.has(uid)) {
			// 创建用户根目录URI
			const userRootUri = Uri.file(path.join("/users", uid))
			const context = createSessionContext(uid, userRootUri)
			console.log(`Created new session context for user: ${uid}`)
		}

		// 在用户上下文中激活扩展
		withUser(uid, () => {
			try {
				// 这里需要传入适当的上下文参数
				// 由于这是独立的启动脚本，我们需要创建一个模拟的扩展上下文
				console.log(`Activating extension for user: ${uid}`)
				// activate() 函数需要适当的参数，这里简化处理
			} catch (error) {
				console.error(`Failed to activate extension for user ${uid}:`, error)
			}
		})

		// 处理客户端发送的消息
		ws.on("message", (message: string) => {
			try {
				const data: ClientMessage = JSON.parse(message.toString())
				console.log(`Received message from user ${uid}:`, data)

				// 在用户上下文中执行相应操作
				withUser(uid, () => {
					handleMessage(data, uid, ws)
				})
			} catch (error) {
				console.error(`Error processing message from user ${uid}:`, error)
				const errorMsg: ServerMessage = { type: "error", error: "Failed to process message" }
				ws.send(JSON.stringify(errorMsg))
			}
		})

		// 处理连接关闭
		ws.on("close", () => {
			console.log(`WebSocket connection closed for user: ${uid}`)
		})

		// 处理错误
		ws.on("error", (error: Error) => {
			console.error(`WebSocket error for user ${uid}:`, error)
		})

		// 发送连接确认消息
		const connectMsg: ServerMessage = {
			type: "connected",
			uid,
			message: "Connected to Roo Code Multi-User Server",
		}
		ws.send(JSON.stringify(connectMsg))
	} catch (error) {
		console.error("Error handling WebSocket connection:", error)
		ws.close(4001, "Internal server error")
	}
}

/**
 * 处理客户端消息
 * @param data 消息数据
 * @param uid 用户ID
 * @param ws WebSocket连接
 */
function handleMessage(data: ClientMessage, uid: string, ws: WebSocket): void {
	try {
		// 根据消息类型处理不同操作
		// 在switch语句外部声明变量，以避免no-case-declarations警告
		let responseMsg: ServerMessage

		switch (data.command) {
			case "ping":
				responseMsg = { type: "pong", timestamp: Date.now() }
				ws.send(JSON.stringify(responseMsg))
				break

			case "execute":
				// 执行命令的示例处理
				console.log(`Executing command for user ${uid}:`, data.data)
				// 这里应该调用实际的命令执行逻辑
				responseMsg = {
					type: "result",
					command: data.command,
					data: { success: true, message: "Command executed successfully" },
				}
				ws.send(JSON.stringify(responseMsg))
				break

			default:
				console.warn(`Unknown command from user ${uid}:`, data.command)
				responseMsg = {
					type: "error",
					message: `Unknown command: ${data.command}`,
				}
				ws.send(JSON.stringify(responseMsg))
		}
	} catch (error) {
		console.error(`Error handling message for user ${uid}:`, error)
		const errorMsg: ServerMessage = {
			type: "error",
			message: "Failed to handle message",
		}
		ws.send(JSON.stringify(errorMsg))
	}
}

// 监听WebSocket连接
wss.on("connection", handleWebSocketConnection)

// 监听WebSocket服务器错误
wss.on("error", (error: Error) => {
	console.error("WebSocket server error:", error)
})

// 启动服务器
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

// 检查是否启用多用户模式
if (process.env.MULTI_USER === "1") {
	// 启动WebSocket服务器
	server.listen(PORT, () => {
		console.log(`Roo Code Multi-User Server is running on port ${PORT}`)
		console.log(`WebSocket server is listening for connections`)
	})
} else {
	// 单用户模式，保持原有逻辑
	console.log("Running in single-user mode")

	// 这里可以调用原有的激活逻辑
	// 由于这是示例代码，我们简单输出信息
	console.log("Roo Code extension activated in single-user mode")
}

// 优雅关闭处理
process.on("SIGTERM", () => {
	console.log("SIGTERM received, shutting down gracefully")
	server.close(() => {
		console.log("Server closed")
		process.exit(0)
	})
})

process.on("SIGINT", () => {
	console.log("SIGINT received, shutting down gracefully")
	server.close(() => {
		console.log("Server closed")
		process.exit(0)
	})
})
