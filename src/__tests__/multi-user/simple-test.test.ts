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
	Uri,
} from "../../shim/multi-user-vscode"

// 模拟环境变量
const originalEnv = process.env

describe("simple-test", () => {
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

	it("should create user context and get user ID", () => {
		// 创建用户上下文
		const userId = "test-user"
		const context = createUserContext(userId, Uri.file(`/users/${userId}`))
		expect(context.userId).toBe(userId)

		// 验证可以在用户上下文中执行操作
		const result = withUserContext(userId, () => {
			return getUserId()
		})
		expect(result).toBe(userId)
	})
})
