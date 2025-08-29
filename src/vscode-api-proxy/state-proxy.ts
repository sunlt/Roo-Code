import { sessionStore } from "./session-manager"
import { safeWriteJson } from "../utils/safeWriteJson"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * 获取当前用户 ID
 * @returns 当前用户 ID
 * @throws 如果没有可用的用户上下文
 */
function getCurrentUserId(): string {
	const uid = sessionStore.getStore()
	if (!uid) {
		throw new Error("No user context available")
	}
	return uid
}

/**
 * 获取当前用户的根路径
 * @returns 用户专属根路径
 */
function getCurrentUserRootPath(): string {
	const uid = getCurrentUserId()
	return `/users/${uid}`
}

/**
 * 获取用户状态文件路径
 * @param namespace 命名空间
 * @returns 状态文件路径
 */
function getUserStateFilePath(namespace: string): string {
	const uid = getCurrentUserId()
	const userPath = getCurrentUserRootPath()
	return path.join(userPath, `${namespace}.json`)
}

/**
 * 读取用户状态
 * @param namespace 命名空间
 * @returns 状态对象
 */
async function readUserState(namespace: string): Promise<Record<string, any>> {
	try {
		const filePath = getUserStateFilePath(namespace)
		const content = await fs.readFile(filePath, "utf8")
		return JSON.parse(content)
	} catch (error) {
		// 如果文件不存在或解析失败，返回空对象
		return {}
	}
}

/**
 * 写入用户状态
 * @param namespace 命名空间
 * @param state 状态对象
 */
async function writeUserState(namespace: string, state: Record<string, any>): Promise<void> {
	const filePath = getUserStateFilePath(namespace)

	// 在测试环境中，添加随机延迟来避免并发锁冲突
	if (process.env.NODE_ENV === "test" || (typeof global !== "undefined" && global.process?.env?.VITEST === "true")) {
		// 添加小的随机延迟来减少并发冲突
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))
	}

	try {
		await safeWriteJson(filePath, state)
	} catch (error: any) {
		// 如果是锁文件冲突，重试一次
		if (error.message?.includes("Lock file is already being held")) {
			await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10))
			await safeWriteJson(filePath, state)
		} else {
			throw error
		}
	}
}

/**
 * 全局状态代理
 */
export const globalState = {
	/**
	 * 获取值
	 * @param key 键
	 * @param defaultValue 默认值
	 * @returns 值
	 */
	async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
		const state = await readUserState("globalState")
		return state[key] !== undefined ? state[key] : defaultValue
	},

	/**
	 * 设置值
	 * @param key 键
	 * @param value 值
	 */
	async update(key: string, value: any): Promise<void> {
		const state = await readUserState("globalState")
		state[key] = value
		await writeUserState("globalState", state)
	},

	/**
	 * 删除值
	 * @param key 键
	 */
	async delete(key: string): Promise<void> {
		const state = await readUserState("globalState")
		delete state[key]
		await writeUserState("globalState", state)
	},
}

/**
 * 工作区状态代理
 */
export const workspaceState = {
	/**
	 * 获取值
	 * @param key 键
	 * @param defaultValue 默认值
	 * @returns 值
	 */
	async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
		const state = await readUserState("workspaceState")
		return state[key] !== undefined ? state[key] : defaultValue
	},

	/**
	 * 设置值
	 * @param key 键
	 * @param value 值
	 */
	async update(key: string, value: any): Promise<void> {
		const state = await readUserState("workspaceState")
		state[key] = value
		await writeUserState("workspaceState", state)
	},

	/**
	 * 删除值
	 * @param key 键
	 */
	async delete(key: string): Promise<void> {
		const state = await readUserState("workspaceState")
		delete state[key]
		await writeUserState("workspaceState", state)
	},
}
