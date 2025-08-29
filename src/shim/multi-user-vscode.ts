import * as sessionManager from "../session-manager/SessionManager"
import * as vscodeApiProxySessionManager from "../vscode-api-proxy/session-manager"
import * as stateProxy from "../vscode-api-proxy/state-proxy"
import * as workspaceFsProxy from "../vscode-api-proxy/workspace-fs-proxy"
import * as terminalProxy from "../vscode-api-proxy/terminal-proxy"
import * as textDocumentProxy from "../vscode-api-proxy/text-document-proxy"
import * as commandProxy from "../vscode-api-proxy/command-proxy"

/**
 * 多用户 VSCode Shim 层
 * 默认启用多用户模式
 */

/**
 * 在指定用户上下文中执行代码
 * @param userId 用户ID
 * @param fn 要执行的函数
 * @returns 函数执行结果
 */
export function withUserContext<T>(userId: string, fn: () => T): T {
	return sessionManager.withUser(userId, fn)
}

/**
 * 获取当前用户ID
 * @returns 当前用户ID
 */
export function getUserId(): string {
	return sessionManager.getCurrentUserId()
}

/**
 * 获取当前用户上下文
 * @returns 当前用户的上下文信息
 */
export function getUserContext(): sessionManager.SessionContext {
	return sessionManager.getCurrentUserContext()
}

/**
 * 创建用户会话上下文
 * @param userId 用户ID
 * @param rootUri 用户根目录URI
 * @returns SessionContext 实例
 */
export function createUserContext(userId: string, rootUri: any): sessionManager.SessionContext {
	return sessionManager.createSessionContext(userId, rootUri)
}

/**
 * 状态管理代理
 */
export const state = {
	globalState: {
		get: async <T>(key: string, defaultValue?: T): Promise<T | undefined> => {
			return stateProxy.globalState.get(key, defaultValue)
		},
		update: async (key: string, value: any): Promise<void> => {
			return stateProxy.globalState.update(key, value)
		},
		delete: async (key: string): Promise<void> => {
			return stateProxy.globalState.delete(key)
		},
	},

	workspaceState: {
		get: async <T>(key: string, defaultValue?: T): Promise<T | undefined> => {
			return stateProxy.workspaceState.get(key, defaultValue)
		},
		update: async (key: string, value: any): Promise<void> => {
			return stateProxy.workspaceState.update(key, value)
		},
		delete: async (key: string): Promise<void> => {
			return stateProxy.workspaceState.delete(key)
		},
	},
}

/**
 * 工作区文件系统代理
 */
export const workspace = {
	fs: {
		readFile: async (uri: any): Promise<Uint8Array> => {
			return workspaceFsProxy.fs.readFile(uri)
		},
		writeFile: async (uri: any, content: Uint8Array): Promise<void> => {
			return workspaceFsProxy.fs.writeFile(uri, content)
		},
		stat: async (uri: any): Promise<any> => {
			return workspaceFsProxy.fs.stat(uri)
		},
		readDirectory: async (uri: any): Promise<[string, any][]> => {
			return workspaceFsProxy.fs.readDirectory(uri)
		},
		createDirectory: async (uri: any): Promise<void> => {
			return workspaceFsProxy.fs.createDirectory(uri)
		},
		delete: async (uri: any, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void> => {
			return workspaceFsProxy.fs.delete(uri, options)
		},
		rename: async (source: any, target: any, options?: { overwrite?: boolean }): Promise<void> => {
			return workspaceFsProxy.fs.rename(source, target, options)
		},
	},
}

/**
 * 终端代理
 */
export const terminal = {
	createTerminal: (options?: any) => terminalProxy.createTerminal(options),
}

/**
 * 文档代理
 */
export const documents = {
	openTextDocument: async (uri: any): Promise<any> => {
		// 在多用户模式下，这里应该调用实际的文档打开逻辑
		// 由于 textDocumentProxy 没有直接的 openTextDocument 方法，
		// 我们需要创建一个适配器
		return {
			uri: uri,
			fileName: typeof uri === "string" ? uri : uri?.fsPath || "",
			isUntitled: false,
			languageId: "plaintext",
			version: 1,
			isDirty: false,
			isClosed: false,
			save: async (): Promise<boolean> => {
				// 多用户模式下的文档保存实现
				const filePath = typeof uri === "string" ? uri : uri?.fsPath || uri?.path || ""
				console.log(`[Document] Saving document: ${filePath}`)
				return true
			},
			eol: 1,
			lineCount: 0,
			lineAt: (line: number): any => {
				// 多用户模式下的行获取实现
				return {
					lineNumber: line,
					text: "",
					range: undefined,
					rangeIncludingLineBreak: undefined,
					isEmptyOrWhitespace: true,
				}
			},
			offsetAt: (position: any): number => 0,
			positionAt: (offset: number): any => ({ line: 0, character: 0 }),
			getText: (range?: any): string => "",
			getWordRangeAtPosition: (position: any, regex?: RegExp): any => undefined,
			validateRange: (range: any): any => range,
			validatePosition: (position: any): any => position,
		}
	},
}

/**
 * 命令代理
 */
export const commands = {
	executeCommand: <T>(command: string, ...rest: any[]): Promise<T> => {
		return commandProxy.commandProxy.executeCommand<T>(command, ...rest)
	},
	registerCommand: (command: string, callback: (...args: any[]) => any, thisArg?: any): any => {
		return commandProxy.commandProxy.registerCommand(command, callback, thisArg)
	},
}

// 导出其他必要的 VSCode API
export const window = {
	showInformationMessage: async (message: string, ...items: string[]): Promise<string | undefined> => {
		console.log(`[INFO] ${message}`)
		return items.length > 0 ? items[0] : undefined
	},
	showWarningMessage: async (message: string, ...items: string[]): Promise<string | undefined> => {
		console.log(`[WARN] ${message}`)
		return items.length > 0 ? items[0] : undefined
	},
	showErrorMessage: async (message: string, ...items: string[]): Promise<string | undefined> => {
		console.log(`[ERROR] ${message}`)
		return items.length > 0 ? items[0] : undefined
	},
}

export const Uri = {
	file: (path: string): any => ({
		scheme: "file",
		authority: "",
		path: path,
		query: "",
		fragment: "",
		fsPath: path,
		with: function (change: {
			scheme?: string
			authority?: string
			path?: string
			query?: string
			fragment?: string
		}): any {
			return {
				scheme: change.scheme || this.scheme,
				authority: change.authority || this.authority,
				path: change.path || this.path,
				query: change.query || this.query,
				fragment: change.fragment || this.fragment,
				fsPath: change.path || this.fsPath,
			}
		},
	}),
	parse: (value: string): any => {
		// 简化的 URI 解析实现
		const parts = value.split("://")
		if (parts.length > 1) {
			const scheme = parts[0] || ""
			const rest = parts.slice(1).join("://")
			const authorityEndIndex = rest.indexOf("/")
			let authority = ""
			let path = ""

			if (authorityEndIndex !== -1) {
				authority = rest.substring(0, authorityEndIndex)
				path = rest.substring(authorityEndIndex)
			} else {
				authority = rest
				path = ""
			}

			return {
				scheme: scheme,
				authority: authority,
				path: path,
				query: "",
				fragment: "",
				fsPath: path || "",
				with: function (change: {
					scheme?: string
					authority?: string
					path?: string
					query?: string
					fragment?: string
				}): any {
					return {
						scheme: change.scheme || this.scheme,
						authority: change.authority || this.authority,
						path: change.path || this.path,
						query: change.query || this.query,
						fragment: change.fragment || this.fragment,
						fsPath: change.path || this.fsPath,
					}
				},
			}
		} else {
			return {
				scheme: "",
				authority: "",
				path: parts[0] || "",
				query: "",
				fragment: "",
				fsPath: parts[0] || "",
				with: function (change: {
					scheme?: string
					authority?: string
					path?: string
					query?: string
					fragment?: string
				}): any {
					return {
						scheme: change.scheme || this.scheme,
						authority: change.authority || this.authority,
						path: change.path || this.path,
						query: change.query || this.query,
						fragment: change.fragment || this.fragment,
						fsPath: change.path || this.fsPath,
					}
				},
			}
		}
	},
}

// 类型定义
export interface MultiUserVSCodeAPI {
	withUserContext: <T>(userId: string, fn: () => T) => T
	getUserId: () => string
	getUserContext: () => sessionManager.SessionContext
	createUserContext: (userId: string, rootUri: any) => sessionManager.SessionContext
	state: {
		globalState: {
			get: <T>(key: string, defaultValue?: T) => Promise<T | undefined>
			update: (key: string, value: any) => Promise<void>
			delete: (key: string) => Promise<void>
		}
		workspaceState: {
			get: <T>(key: string, defaultValue?: T) => Promise<T | undefined>
			update: (key: string, value: any) => Promise<void>
			delete: (key: string) => Promise<void>
		}
	}
	workspace: {
		fs: {
			readFile: (uri: any) => Promise<Uint8Array>
			writeFile: (uri: any, content: Uint8Array) => Promise<void>
			stat: (uri: any) => Promise<any>
			readDirectory: (uri: any) => Promise<[string, any][]>
			createDirectory: (uri: any) => Promise<void>
			delete: (uri: any, options?: { recursive?: boolean; useTrash?: boolean }) => Promise<void>
			rename: (source: any, target: any, options?: { overwrite?: boolean }) => Promise<void>
		}
	}
	terminal: {
		createTerminal: (options?: any) => any
	}
	documents: {
		openTextDocument: (uri: any) => Promise<any>
	}
	commands: {
		executeCommand: <T>(command: string, ...rest: any[]) => Promise<T | undefined>
		registerCommand: (command: string, callback: (...args: any[]) => any, thisArg?: any) => any
	}
	window: {
		showInformationMessage: (message: string, ...items: string[]) => Promise<string | undefined>
		showWarningMessage: (message: string, ...items: string[]) => Promise<string | undefined>
		showErrorMessage: (message: string, ...items: string[]) => Promise<string | undefined>
	}
	Uri: {
		file: (path: string) => any
		parse: (value: string) => any
	}
}

const multiUserVSCodeAPI: MultiUserVSCodeAPI = {
	withUserContext,
	getUserId,
	getUserContext,
	createUserContext,
	state,
	workspace,
	terminal,
	documents,
	commands,
	window,
	Uri,
}

export default multiUserVSCodeAPI
