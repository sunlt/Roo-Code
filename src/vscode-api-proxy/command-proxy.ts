import { getCurrentUserId } from "./session-manager"

// 模拟的命令注册表，用于测试环境
const mockCommandRegistry = new Map<string, (...args: any[]) => any>()

/**
 * 模拟的 Disposable 接口
 */
interface MockDisposable {
	dispose(): void
}

/**
 * 为命令 ID 添加用户前缀
 * @param commandId 原始命令 ID
 * @returns 添加了用户前缀的命令 ID
 */
export function addUserPrefixToCommandId(commandId: string): string {
	try {
		const uid = getCurrentUserId()
		return `__${uid}__${commandId}`
	} catch (error) {
		return commandId
	}
}

/**
 * 从命令 ID 中移除用户前缀
 * @param commandId 带前缀的命令 ID
 * @returns 原始命令 ID
 */
export function removeUserPrefixFromCommandId(commandId: string): string {
	const uid = getCurrentUserId()
	const prefix = `__${uid}__`
	if (commandId.startsWith(prefix)) {
		return commandId.substring(prefix.length)
	}
	return commandId
}

/**
 * 检查是否在测试环境中
 */
function isTestEnvironment(): boolean {
	return process.env.NODE_ENV === "test" || (typeof global !== "undefined" && global.process?.env?.VITEST === "true")
}

/**
 * 命令代理
 */
export const commandProxy = {
	/**
	 * 注册命令
	 * @param command 命令 ID
	 * @param callback 命令回调函数
	 * @param thisArg 回调函数的 this 上下文
	 * @returns Disposable 对象
	 */
	registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): MockDisposable {
		const userCommandId = addUserPrefixToCommandId(command)

		if (isTestEnvironment()) {
			// 在测试环境中使用模拟注册表
			mockCommandRegistry.set(userCommandId, callback)
			return {
				dispose(): void {
					mockCommandRegistry.delete(userCommandId)
				},
			}
		} else {
			// 在生产环境中使用真实的 VSCode API
			try {
				const { commands } = require("vscode")
				return commands.registerCommand(userCommandId, callback, thisArg)
			} catch (error) {
				// 如果 VSCode API 不可用，使用模拟实现
				mockCommandRegistry.set(userCommandId, callback)
				return {
					dispose(): void {
						mockCommandRegistry.delete(userCommandId)
					},
				}
			}
		}
	},

	/**
	 * 执行命令
	 * @param command 命令 ID
	 * @param rest 参数
	 * @returns Promise
	 */
	async executeCommand<T>(command: string, ...rest: any[]): Promise<T> {
		const userCommandId = addUserPrefixToCommandId(command)

		if (isTestEnvironment()) {
			// 在测试环境中使用模拟注册表
			const callback = mockCommandRegistry.get(userCommandId)
			if (callback) {
				return callback(...rest)
			} else {
				throw new Error(`Command '${userCommandId}' not found`)
			}
		} else {
			// 在生产环境中使用真实的 VSCode API
			try {
				const { commands } = require("vscode")
				return commands.executeCommand(userCommandId, ...rest)
			} catch (error) {
				// 如果 VSCode API 不可用，使用模拟实现
				const callback = mockCommandRegistry.get(userCommandId)
				if (callback) {
					return callback(...rest)
				} else {
					throw new Error(`Command '${userCommandId}' not found`)
				}
			}
		}
	},

	/**
	 * 获取命令列表
	 * @returns 命令列表
	 */
	getCommands(): Thenable<string[]> {
		if (isTestEnvironment()) {
			// 在测试环境中使用模拟注册表
			const uid = getCurrentUserId()
			const prefix = `__${uid}__`
			const userCommands = Array.from(mockCommandRegistry.keys())
				.filter((id) => id.startsWith(prefix))
				.map((id) => id.substring(prefix.length))
			return Promise.resolve(userCommands)
		} else {
			// 在生产环境中使用真实的 VSCode API
			try {
				const { commands } = require("vscode")
				return commands.getCommands().then((commandIds: string[]) => {
					const uid = getCurrentUserId()
					const prefix = `__${uid}__`
					// 只返回当前用户的命令
					return commandIds.filter((id) => id.startsWith(prefix)).map((id) => id.substring(prefix.length))
				})
			} catch (error) {
				// 如果 VSCode API 不可用，使用模拟实现
				const uid = getCurrentUserId()
				const prefix = `__${uid}__`
				const userCommands = Array.from(mockCommandRegistry.keys())
					.filter((id) => id.startsWith(prefix))
					.map((id) => id.substring(prefix.length))
				return Promise.resolve(userCommands)
			}
		}
	},
}
