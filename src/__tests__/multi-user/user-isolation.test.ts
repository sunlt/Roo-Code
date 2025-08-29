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

describe("user-isolation", () => {
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

	it("should isolate users with different contexts", () => {
		// 创建两个用户
		const user1Id = "user1"
		const user2Id = "user2"

		// 为用户1设置上下文
		const user1Context = createUserContext(user1Id, Uri.file("/users/user1"))

		// 为用户2设置上下文
		const user2Context = createUserContext(user2Id, Uri.file("/users/user2"))

		// 验证用户1的上下文
		const user1Result = withUserContext(user1Id, () => {
			const userId = getUserId()
			const context = getUserContext()
			context.setGlobalState("test-key", "user1-value")
			context.setWorkspaceState("test-key", "user1-workspace-value")
			const globalValue = context.getGlobalState("test-key")
			const workspaceValue = context.getWorkspaceState("test-key")
			return { userId, globalValue, workspaceValue }
		})

		expect(user1Result.userId).toBe(user1Id)
		expect(user1Result.globalValue).toBe("user1-value")
		expect(user1Result.workspaceValue).toBe("user1-workspace-value")

		// 验证用户2的上下文
		const user2Result = withUserContext(user2Id, () => {
			const userId = getUserId()
			const context = getUserContext()
			context.setGlobalState("test-key", "user2-value")
			context.setWorkspaceState("test-key", "user2-workspace-value")
			const globalValue = context.getGlobalState("test-key")
			const workspaceValue = context.getWorkspaceState("test-key")
			return { userId, globalValue, workspaceValue }
		})

		expect(user2Result.userId).toBe(user2Id)
		expect(user2Result.globalValue).toBe("user2-value")
		expect(user2Result.workspaceValue).toBe("user2-workspace-value")
	})
})
