import { getCurrentUserId, getCurrentUserRootPath } from "./session-manager"
import { Terminal as VSCodeTerminal, TerminalOptions } from "vscode"

/**
 * 伪 Terminal 对象接口
 */
interface PseudoTerminal {
	/**
	 * 终端名称
	 */
	name: string

	/**
	 * 终端进程
	 */
	process: string

	/**
	 * 终端是否已关闭
	 */
	isClosed: boolean

	/**
	 * 发送文本到终端
	 * @param text 要发送的文本
	 */
	sendText(text: string): void

	/**
	 * 显示终端
	 * @param preserveFocus 是否保持焦点
	 */
	show(preserveFocus?: boolean): void

	/**
	 * 隐藏终端
	 */
	hide(): void

	/**
	 * 关闭终端
	 */
	dispose(): void
}

/**
 * 创建伪 Terminal 对象
 * @param options 终端选项
 * @returns 伪 Terminal 对象
 */
export function createTerminal(options?: TerminalOptions): PseudoTerminal {
	const uid = getCurrentUserId()
	const userPath = getCurrentUserRootPath()

	// 创建伪 Terminal 对象
	const pseudoTerminal: PseudoTerminal = {
		name: options?.name || "User Terminal",
		process: "shell",
		isClosed: false,

		/**
		 * 发送文本到终端
		 * @param text 要发送的文本
		 */
		sendText(text: string): void {
			if (this.isClosed) {
				throw new Error("Terminal is closed")
			}
			// 在实际实现中，这里会将文本发送到 node-pty 进程
			console.log(`[Terminal] Sending text: ${text}`)
		},

		/**
		 * 显示终端
		 * @param preserveFocus 是否保持焦点
		 */
		show(preserveFocus?: boolean): void {
			if (this.isClosed) {
				throw new Error("Terminal is closed")
			}
			// 在实际实现中，这里会显示终端面板
			console.log(`Showing terminal: ${this.name}`)
		},

		/**
		 * 隐藏终端
		 */
		hide(): void {
			if (this.isClosed) {
				throw new Error("Terminal is closed")
			}
			// 在实际实现中，这里会隐藏终端面板
			console.log(`Hiding terminal: ${this.name}`)
		},

		/**
		 * 关闭终端
		 */
		dispose(): void {
			if (this.isClosed) {
				return
			}
			this.isClosed = true
			// 在实际实现中，这里会关闭 node-pty 进程
			console.log(`Disposing terminal: ${this.name}`)
		},
	}

	return pseudoTerminal
}

/**
 * VS Code window API 代理
 */
export const window = {
	/**
	 * 创建终端
	 * @param options 终端选项
	 * @returns 伪 Terminal 对象
	 */
	createTerminal(options?: TerminalOptions): PseudoTerminal {
		return createTerminal(options)
	},
}
