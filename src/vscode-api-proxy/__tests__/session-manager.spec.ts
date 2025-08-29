import { describe, it, beforeEach, afterEach, vi, expect } from "vitest"
import { sessionStore, withUser, getCurrentUserId, getCurrentUserRootPath } from "../session-manager"

describe("SessionManager", () => {
	const testUserId = "test-user-id"

	beforeEach(() => {
		// 清理 sessionStore
		sessionStore.enterWith("")
	})

	afterEach(() => {
		// 清理 sessionStore
		sessionStore.enterWith("")
	})

	describe("withUser", () => {
		it("should run function with user context", () => {
			let userIdInContext: string | undefined

			withUser(testUserId, () => {
				userIdInContext = getCurrentUserId()
			})

			expect(userIdInContext).toBe(testUserId)
		})
	})

	describe("getCurrentUserId", () => {
		it("should return current user ID when in context", () => {
			let userId: string | undefined

			withUser(testUserId, () => {
				userId = getCurrentUserId()
			})

			expect(userId).toBe(testUserId)
		})

		it("should throw error when not in context", () => {
			expect(() => {
				getCurrentUserId()
			}).toThrow("No user context available")
		})
	})

	describe("getCurrentUserRootPath", () => {
		it("should return user root path when in context", () => {
			let userRootPath: string | undefined

			withUser(testUserId, () => {
				userRootPath = getCurrentUserRootPath()
			})

			expect(userRootPath).toBe(`/users/${testUserId}`)
		})

		it("should throw error when not in context", () => {
			expect(() => {
				getCurrentUserRootPath()
			}).toThrow("No user context available")
		})
	})
})
