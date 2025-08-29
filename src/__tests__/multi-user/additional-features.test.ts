import { describe, it, beforeEach, afterEach, vi, expect } from "vitest"
import {
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
} from "../../shim/multi-user-vscode"

// 模拟环境变量
const originalEnv = process.env

describe("multi-user-additional-features", () => {
	beforeEach(() => {
		// 重置环境变量
		process.env = { ...originalEnv }
		// 设置为多用户模式
		process.env.MULTI_USER = "1"
	})

	afterEach(() => {
		// 恢复原始环境变量
		process.env = originalEnv
		vi.clearAllMocks()
	})

	describe("窗口消息功能", () => {
		it("should handle information messages", async () => {
			const userId = "test-user"
			createUserContext(userId, Uri.file("/users/test-user"))

			// 模拟 console.log
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			// 在用户上下文中显示信息消息
			const result = await withUserContext(userId, async () => {
				return await window.showInformationMessage("Test information message", "OK", "Cancel")
			})

			// 验证消息被正确记录
			expect(consoleSpy).toHaveBeenCalledWith("[INFO] Test information message")

			// 验证返回值
			expect(result).toBe("OK")

			consoleSpy.mockRestore()
		})

		it("should handle warning messages", async () => {
			const userId = "test-user"
			createUserContext(userId, Uri.file("/users/test-user"))

			// 模拟 console.log
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			// 在用户上下文中显示警告消息
			const result = await withUserContext(userId, async () => {
				return await window.showWarningMessage("Test warning message", "OK", "Cancel")
			})

			// 验证消息被正确记录
			expect(consoleSpy).toHaveBeenCalledWith("[WARN] Test warning message")

			// 验证返回值
			expect(result).toBe("OK")

			consoleSpy.mockRestore()
		})

		it("should handle error messages", async () => {
			const userId = "test-user"
			createUserContext(userId, Uri.file("/users/test-user"))

			// 模拟 console.log
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			// 在用户上下文中显示错误消息
			const result = await withUserContext(userId, async () => {
				return await window.showErrorMessage("Test error message", "OK", "Cancel")
			})

			// 验证消息被正确记录
			expect(consoleSpy).toHaveBeenCalledWith("[ERROR] Test error message")

			// 验证返回值
			expect(result).toBe("OK")

			consoleSpy.mockRestore()
		})
	})

	describe("URI处理功能", () => {
		it("should create file URIs correctly", () => {
			const filePath = "/test/file.txt"
			const uri = Uri.file(filePath)

			expect(uri.scheme).toBe("file")
			expect(uri.path).toBe(filePath)
			expect(uri.fsPath).toBe(filePath)
		})

		it("should parse URIs correctly", () => {
			const uriString = "file:///test/file.txt"
			const uri = Uri.parse(uriString)

			expect(uri.scheme).toBe("file")
			expect(uri.path).toBe("/test/file.txt")
			expect(uri.fsPath).toBe("/test/file.txt")
		})

		it("should handle different URI schemes", () => {
			const uriString = "https://example.com/path"
			const uri = Uri.parse(uriString)

			expect(uri.scheme).toBe("https")
			expect(uri.path).toBe("/path")
			expect(uri.fsPath).toBe("/path")
		})
	})

	describe("多用户环境下的窗口消息隔离", () => {
		it("should isolate window messages between users", async () => {
			const userId1 = "user1"
			const userId2 = "user2"

			createUserContext(userId1, Uri.file("/users/user1"))
			createUserContext(userId2, Uri.file("/users/user2"))

			// 模拟 console.log
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			// 用户1显示消息
			await withUserContext(userId1, async () => {
				await window.showInformationMessage("User 1 message", "OK")
			})

			// 用户2显示消息
			await withUserContext(userId2, async () => {
				await window.showInformationMessage("User 2 message", "OK")
			})

			// 验证消息被正确记录
			expect(consoleSpy).toHaveBeenCalledWith("[INFO] User 1 message")
			expect(consoleSpy).toHaveBeenCalledWith("[INFO] User 2 message")

			consoleSpy.mockRestore()
		})
	})

	describe("多用户环境下的URI处理隔离", () => {
		it("should handle URIs correctly for different users", () => {
			const userId1 = "user1"
			const userId2 = "user2"

			createUserContext(userId1, Uri.file("/users/user1"))
			createUserContext(userId2, Uri.file("/users/user2"))

			// 用户1创建URI
			const user1Uri = withUserContext(userId1, () => {
				return Uri.file("/user1/test.txt")
			})

			// 用户2创建URI
			const user2Uri = withUserContext(userId2, () => {
				return Uri.file("/user2/test.txt")
			})

			// 验证URI正确创建
			expect(user1Uri.path).toBe("/user1/test.txt")
			expect(user2Uri.path).toBe("/user2/test.txt")
		})
	})
})
