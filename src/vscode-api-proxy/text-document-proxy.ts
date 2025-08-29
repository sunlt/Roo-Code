import { Uri, TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent } from "vscode"
import { getCurrentUserId } from "./session-manager"

/**
 * 为 URI 添加用户查询参数
 * @param uri 原始 URI
 * @returns 添加了用户查询参数的 URI
 */
export function addUserQueryToUri(uri: Uri): Uri {
	const uid = getCurrentUserId()
	const existingQuery = uri.query
	const userQuery = `uid=${uid}`
	const newQuery = existingQuery ? `${existingQuery}&${userQuery}` : userQuery
	return uri.with({ query: newQuery })
}

/**
 * 从 URI 中提取用户 ID
 * @param uri URI
 * @returns 用户 ID 或 undefined
 */
export function getUserIdFromUri(uri: Uri): string | undefined {
	const query = uri.query
	if (!query) return undefined

	const params = new URLSearchParams(query)
	return params.get("uid") || undefined
}

/**
 * 检查 URI 是否属于当前用户
 * @param uri URI
 * @returns 是否属于当前用户
 */
export function isUriOwnedByCurrentUser(uri: Uri): boolean {
	const userId = getUserIdFromUri(uri)
	if (!userId) return false

	const currentUserId = getCurrentUserId()
	return userId === currentUserId
}

/**
 * 过滤 TextDocumentChangeEvent，只处理当前用户的事件
 * @param event TextDocumentChangeEvent
 * @returns 是否属于当前用户
 */
export function isTextDocumentEventForCurrentUser(event: TextDocumentChangeEvent): boolean {
	return isUriOwnedByCurrentUser(event.document.uri)
}

/**
 * TextDocument 事件处理器
 */
export class TextDocumentProxy {
	private static listeners: Array<(event: TextDocumentChangeEvent) => void> = []

	/**
	 * 注册 TextDocument 变更事件监听器
	 * @param listener 事件监听器
	 */
	static onDidChangeTextDocument(listener: (event: TextDocumentChangeEvent) => void): void {
		this.listeners.push(listener)
	}

	/**
	 * 触发 TextDocument 变更事件
	 * @param event TextDocumentChangeEvent
	 */
	static emitDidChangeTextDocument(event: TextDocumentChangeEvent): void {
		// 只处理当前用户的事件
		if (isTextDocumentEventForCurrentUser(event)) {
			// 为文档 URI 添加用户查询参数
			const userUri = addUserQueryToUri(event.document.uri)
			const userDocument = {
				...event.document,
				uri: userUri,
			}

			const userEvent = {
				...event,
				document: userDocument,
			}

			// 通知所有监听器
			this.listeners.forEach((listener) => {
				try {
					listener(userEvent)
				} catch (error) {
					console.error("Error in text document event listener:", error)
				}
			})
		}
	}
}
