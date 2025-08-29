import { AsyncLocalStorage } from "async_hooks"
import type { Uri } from "vscode"

/**
 * 用户会话上下文类
 * 存储用户特定的状态和配置
 */
export class SessionContext {
	public readonly userId: string
	public readonly rootUri: Uri
	private readonly state: Map<string, any>
	private readonly workspaceState: Map<string, any>
	private readonly globalState: Map<string, any>

	constructor(userId: string, rootUri: Uri) {
		this.userId = userId
		this.rootUri = rootUri
		this.state = new Map()
		this.workspaceState = new Map()
		this.globalState = new Map()
	}

	/**
	 * 设置用户状态
	 * @param key 状态键
	 * @param value 状态值
	 */
	setState(key: string, value: any): void {
		this.state.set(key, value)
	}

	/**
	 * 获取用户状态
	 * @param key 状态键
	 * @returns 状态值
	 */
	getState(key: string): any {
		return this.state.get(key)
	}

	/**
	 * 设置工作区状态
	 * @param key 状态键
	 * @param value 状态值
	 */
	setWorkspaceState(key: string, value: any): void {
		this.workspaceState.set(key, value)
	}

	/**
	 * 获取工作区状态
	 * @param key 状态键
	 * @returns 状态值
	 */
	getWorkspaceState(key: string): any {
		return this.workspaceState.get(key)
	}

	/**
	 * 设置全局状态
	 * @param key 状态键
	 * @param value 状态值
	 */
	setGlobalState(key: string, value: any): void {
		this.globalState.set(key, value)
	}

	/**
	 * 获取全局状态
	 * @param key 状态键
	 * @returns 状态值
	 */
	getGlobalState(key: string): any {
		return this.globalState.get(key)
	}
}

/**
 * 会话存储，使用 AsyncLocalStorage 实现用户上下文的隐式传递
 */
export const sessionStore = new AsyncLocalStorage<string>()

/**
 * 会话上下文存储
 * 存储所有用户的 SessionContext 实例
 */
export const sessionContexts = new Map<string, SessionContext>()

/**
 * 在指定用户上下文中执行代码
 * @param userId 用户ID
 * @param fn 要执行的函数
 * @returns 函数执行结果
 */
export function withUser<T>(userId: string, fn: () => T): T {
	return sessionStore.run(userId, fn)
}

/**
 * 获取当前用户ID
 * @returns 当前用户ID
 * @throws 如果没有可用的用户上下文
 */
export function getCurrentUserId(): string {
	const userId = sessionStore.getStore()
	if (!userId) {
		throw new Error("No user context available")
	}
	return userId
}

/**
 * 获取当前用户上下文
 * @returns 当前用户的 SessionContext 实例
 * @throws 如果没有可用的用户上下文
 */
export function getCurrentUserContext(): SessionContext {
	const userId = getCurrentUserId()
	const context = sessionContexts.get(userId)
	if (!context) {
		throw new Error(`No session context found for user ${userId}`)
	}
	return context
}

/**
 * 创建用户会话上下文
 * @param userId 用户ID
 * @param rootUri 用户根目录URI
 * @returns SessionContext 实例
 */
export function createSessionContext(userId: string, rootUri: Uri): SessionContext {
	// 验证用户ID
	if (!userId || userId.trim() === "") {
		throw new Error("User ID cannot be empty or whitespace")
	}

	const context = new SessionContext(userId, rootUri)
	sessionContexts.set(userId, context)
	return context
}

/**
 * 销毁用户会话上下文
 * @param userId 用户ID
 */
export function destroySessionContext(userId: string): void {
	sessionContexts.delete(userId)
}

/**
 * 验证用户是否有权限访问指定资源
 * @param userId 用户ID
 * @param resourcePath 资源路径
 * @returns 是否有权限
 */
export function validateUserAccess(userId: string, resourcePath: string): boolean {
	// 简单实现：确保用户只能访问自己的目录
	// 实际实现中可能需要更复杂的权限检查
	return resourcePath.startsWith(`/users/${userId}/`)
}
