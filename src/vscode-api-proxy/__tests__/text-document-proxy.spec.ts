import { describe, it, beforeEach, vi, expect, afterEach } from "vitest"
import {
	addUserQueryToUri,
	getUserIdFromUri,
	isUriOwnedByCurrentUser,
	isTextDocumentEventForCurrentUser,
	TextDocumentProxy,
} from "../text-document-proxy"
import { withUser } from "../session-manager"

describe("text-document-proxy", () => {
	const testUserId = "test-user-id"
	const otherUserId = "other-user-id"

	beforeEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	describe("addUserQueryToUri", () => {
		it("should add user query to URI without existing query", () => {
			const uri = { query: "" } as any
			let result: any
			withUser(testUserId, () => {
				result = addUserQueryToUri(uri)
			})

			expect(result.query).toBe(`uid=${testUserId}`)
		})

		it("should add user query to URI with existing query", () => {
			const uri = { query: "existing=query" } as any
			let result: any
			withUser(testUserId, () => {
				result = addUserQueryToUri(uri)
			})

			expect(result.query).toBe(`existing=query&uid=${testUserId}`)
		})
	})

	describe("getUserIdFromUri", () => {
		it("should extract user ID from URI with user query", () => {
			const uri = { query: `uid=${testUserId}` } as any
			const result = getUserIdFromUri(uri)
			expect(result).toBe(testUserId)
		})

		it("should extract user ID from URI with multiple queries", () => {
			const uri = { query: `existing=query&uid=${testUserId}&another=param` } as any
			const result = getUserIdFromUri(uri)
			expect(result).toBe(testUserId)
		})

		it("should return undefined when no user ID in URI", () => {
			const uri = { query: "existing=query" } as any
			const result = getUserIdFromUri(uri)
			expect(result).toBeUndefined()
		})

		it("should return undefined when no query in URI", () => {
			const uri = { query: "" } as any
			const result = getUserIdFromUri(uri)
			expect(result).toBeUndefined()
		})
	})

	describe("isUriOwnedByCurrentUser", () => {
		it("should return true when URI is owned by current user", () => {
			const uri = { query: `uid=${testUserId}` } as any
			let result: boolean | undefined
			withUser(testUserId, () => {
				result = isUriOwnedByCurrentUser(uri)
			})

			expect(result).toBe(true)
		})

		it("should return false when URI is owned by other user", () => {
			const uri = { query: `uid=${otherUserId}` } as any
			let result: boolean | undefined
			withUser(testUserId, () => {
				result = isUriOwnedByCurrentUser(uri)
			})

			expect(result).toBe(false)
		})

		it("should return false when no user ID in URI", () => {
			const uri = { query: "existing=query" } as any
			let result: boolean | undefined
			withUser(testUserId, () => {
				result = isUriOwnedByCurrentUser(uri)
			})

			expect(result).toBe(false)
		})
	})

	describe("isTextDocumentEventForCurrentUser", () => {
		it("should return true when event is for current user", () => {
			const event = {
				document: {
					uri: { query: `uid=${testUserId}` },
				},
			} as any

			let result: boolean | undefined
			withUser(testUserId, () => {
				result = isTextDocumentEventForCurrentUser(event)
			})

			expect(result).toBe(true)
		})

		it("should return false when event is for other user", () => {
			const event = {
				document: {
					uri: { query: `uid=${otherUserId}` },
				},
			} as any

			let result: boolean | undefined
			withUser(testUserId, () => {
				result = isTextDocumentEventForCurrentUser(event)
			})

			expect(result).toBe(false)
		})
	})

	describe("TextDocumentProxy", () => {
		it("should register and emit text document change events for current user", () => {
			const mockListener = vi.fn()
			const event = {
				document: {
					uri: { query: `uid=${testUserId}`, with: vi.fn().mockReturnThis() },
				},
			} as any

			TextDocumentProxy.onDidChangeTextDocument(mockListener)

			withUser(testUserId, () => {
				TextDocumentProxy.emitDidChangeTextDocument(event)
			})

			expect(mockListener).toHaveBeenCalledWith(event)
		})

		it("should not emit text document change events for other users", () => {
			const mockListener = vi.fn()
			const event = {
				document: {
					uri: { query: `uid=${otherUserId}` },
				},
			} as any

			TextDocumentProxy.onDidChangeTextDocument(mockListener)

			withUser(testUserId, () => {
				TextDocumentProxy.emitDidChangeTextDocument(event)
			})

			expect(mockListener).not.toHaveBeenCalled()
		})

		it("should handle errors in event listeners", () => {
			const mockListener = vi.fn().mockImplementation(() => {
				throw new Error("Test error")
			})
			const event = {
				document: {
					uri: { query: `uid=${testUserId}`, with: vi.fn().mockReturnThis() },
				},
			} as any

			TextDocumentProxy.onDidChangeTextDocument(mockListener)

			withUser(testUserId, () => {
				expect(() => {
					TextDocumentProxy.emitDidChangeTextDocument(event)
				}).not.toThrow()
			})

			expect(mockListener).toHaveBeenCalledWith(event)
		})
	})
})
