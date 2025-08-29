import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
	SessionContext,
	sessionStore,
	sessionContexts,
	withUser,
	getCurrentUserId,
	getCurrentUserContext,
	createSessionContext,
	destroySessionContext,
	validateUserAccess,
} from "../SessionManager"
import { Uri } from "vscode"

describe("SessionManager", () => {
	beforeEach(() => {
		// 清理会话上下文
		sessionContexts.clear()
	})

	afterEach(() => {
		// 清理会话上下文
		sessionContexts.clear()
	})

	describe("SessionContext", () => {
		it("should create a new session context with correct properties", () => {
			const userId = "user123"
			const rootUri = Uri.file("/users/user123")
			const context = new SessionContext(userId, rootUri)

			expect(context.userId).toBe(userId)
			expect(context.rootUri).toBe(rootUri)
		})

		it("should manage state correctly", () => {
			const userId = "user123"
			const rootUri = Uri.file("/users/user123")
			const context = new SessionContext(userId, rootUri)

			// 测试状态管理
			context.setState("key1", "value1")
			expect(context.getState("key1")).toBe("value1")

			context.setWorkspaceState("key2", "value2")
			expect(context.getWorkspaceState("key2")).toBe("value2")

			context.setGlobalState("key3", "value3")
			expect(context.getGlobalState("key3")).toBe("value3")
		})
	})

	describe("withUser", () => {
		it("should execute function in user context", () => {
			const userId = "user123"
			let currentUserId: string | undefined = undefined

			withUser(userId, () => {
				currentUserId = sessionStore.getStore()
			})

			expect(currentUserId).toBe(userId)
		})

		it("should return the result of the function", () => {
			const userId = "user123"
			const result = withUser(userId, () => {
				return "test-result"
			})

			expect(result).toBe("test-result")
		})
	})

	describe("getCurrentUserId", () => {
		it("should return current user ID when in context", () => {
			const userId = "user123"

			withUser(userId, () => {
				expect(getCurrentUserId()).toBe(userId)
			})
		})

		it("should throw error when not in context", () => {
			expect(() => {
				getCurrentUserId()
			}).toThrow("No user context available")
		})
	})

	describe("getCurrentUserContext", () => {
		it("should return current user context when in context", () => {
			const userId = "user123"
			const rootUri = Uri.file("/users/user123")
			const context = createSessionContext(userId, rootUri)

			withUser(userId, () => {
				const currentContext = getCurrentUserContext()
				expect(currentContext).toBe(context)
				expect(currentContext.userId).toBe(userId)
			})
		})

		it("should throw error when not in context", () => {
			expect(() => {
				getCurrentUserContext()
			}).toThrow("No user context available")
		})

		it("should throw error when context not found", () => {
			const userId = "user123"

			withUser(userId, () => {
				// 清理上下文以模拟找不到的情况
				sessionContexts.clear()
				expect(() => {
					getCurrentUserContext()
				}).toThrow(`No session context found for user ${userId}`)
			})
		})
	})

	describe("createSessionContext", () => {
		it("should create and store a new session context", () => {
			const userId = "user123"
			const rootUri = Uri.file("/users/user123")
			const context = createSessionContext(userId, rootUri)

			expect(context).toBeInstanceOf(SessionContext)
			expect(context.userId).toBe(userId)
			expect(context.rootUri).toBe(rootUri)
			expect(sessionContexts.get(userId)).toBe(context)
		})
	})

	describe("destroySessionContext", () => {
		it("should remove session context", () => {
			const userId = "user123"
			const rootUri = Uri.file("/users/user123")
			createSessionContext(userId, rootUri)

			expect(sessionContexts.has(userId)).toBe(true)

			destroySessionContext(userId)
			expect(sessionContexts.has(userId)).toBe(false)
		})
	})

	describe("validateUserAccess", () => {
		it("should validate user access to their own resources", () => {
			const userId = "user123"
			const resourcePath = "/users/user123/some-file.txt"

			expect(validateUserAccess(userId, resourcePath)).toBe(true)
		})

		it("should reject user access to other users resources", () => {
			const userId = "user123"
			const resourcePath = "/users/user456/some-file.txt"

			expect(validateUserAccess(userId, resourcePath)).toBe(false)
		})

		it("should handle edge cases", () => {
			const userId = "user123"

			// 测试空路径
			expect(validateUserAccess(userId, "")).toBe(false)

			// 测试不以 /users/ 开头的路径
			expect(validateUserAccess(userId, "/some-other-path")).toBe(false)
		})
	})
})
