import { describe, it, beforeEach, vi, expect, afterEach, Mock } from "vitest"
import * as fs from "fs/promises"
import { safeWriteJson } from "../../utils/safeWriteJson"
import { globalState, workspaceState } from "../state-proxy"
import { withUser } from "../session-manager"

// Mock fs/promises
vi.mock("fs/promises", () => {
	return {
		default: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
		},
	}
})

// Mock safeWriteJson
vi.mock("../../utils/safeWriteJson", () => {
	return {
		safeWriteJson: vi.fn(),
	}
})

describe("state-proxy", () => {
	const testUserId = "test-user-id"
	const testUserPath = `/users/${testUserId}`

	beforeEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	describe("globalState", () => {
		it("should get value from global state", async () => {
			const testData = JSON.stringify({ key1: "value1", key2: "value2" })
			;(fs.readFile as Mock).mockResolvedValue(testData)

			let result: any
			await withUser(testUserId, async () => {
				result = await globalState.get("key1")
			})

			expect(fs.readFile).toHaveBeenCalledWith(`${testUserPath}/globalState.json`, "utf8")
			expect(result).toBe("value1")
		})

		it("should return default value when key not found", async () => {
			const testData = JSON.stringify({ key1: "value1" })
			;(fs.readFile as Mock).mockResolvedValue(testData)

			let result: any
			await withUser(testUserId, async () => {
				result = await globalState.get("key2", "default")
			})

			expect(result).toBe("default")
		})

		it("should return undefined when key not found and no default", async () => {
			const testData = JSON.stringify({ key1: "value1" })
			;(fs.readFile as Mock).mockResolvedValue(testData)

			let result: any
			await withUser(testUserId, async () => {
				result = await globalState.get("key2")
			})

			expect(result).toBeUndefined()
		})

		it("should update value in global state", async () => {
			const testData = JSON.stringify({ key1: "value1" })
			;(fs.readFile as Mock).mockResolvedValue(testData)
			;(safeWriteJson as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await globalState.update("key2", "value2")
			})

			expect(safeWriteJson).toHaveBeenCalledWith(`${testUserPath}/globalState.json`, {
				key1: "value1",
				key2: "value2",
			})
		})

		it("should delete value from global state", async () => {
			const testData = JSON.stringify({ key1: "value1", key2: "value2" })
			;(fs.readFile as Mock).mockResolvedValue(testData)
			;(safeWriteJson as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await globalState.delete("key1")
			})

			expect(safeWriteJson).toHaveBeenCalledWith(`${testUserPath}/globalState.json`, { key2: "value2" })
		})
	})

	describe("workspaceState", () => {
		it("should get value from workspace state", async () => {
			const testData = JSON.stringify({ key1: "value1", key2: "value2" })
			;(fs.readFile as Mock).mockResolvedValue(testData)

			let result: any
			await withUser(testUserId, async () => {
				result = await workspaceState.get("key1")
			})

			expect(fs.readFile).toHaveBeenCalledWith(`${testUserPath}/workspaceState.json`, "utf8")
			expect(result).toBe("value1")
		})

		it("should return default value when key not found", async () => {
			const testData = JSON.stringify({ key1: "value1" })
			;(fs.readFile as Mock).mockResolvedValue(testData)

			let result: any
			await withUser(testUserId, async () => {
				result = await workspaceState.get("key2", "default")
			})

			expect(result).toBe("default")
		})

		it("should update value in workspace state", async () => {
			const testData = JSON.stringify({ key1: "value1" })
			;(fs.readFile as Mock).mockResolvedValue(testData)
			;(safeWriteJson as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await workspaceState.update("key2", "value2")
			})

			expect(safeWriteJson).toHaveBeenCalledWith(`${testUserPath}/workspaceState.json`, {
				key1: "value1",
				key2: "value2",
			})
		})

		it("should delete value from workspace state", async () => {
			const testData = JSON.stringify({ key1: "value1", key2: "value2" })
			;(fs.readFile as Mock).mockResolvedValue(testData)
			;(safeWriteJson as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await workspaceState.delete("key1")
			})

			expect(safeWriteJson).toHaveBeenCalledWith(`${testUserPath}/workspaceState.json`, { key2: "value2" })
		})
	})
})
