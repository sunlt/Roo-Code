import { describe, it, beforeEach, vi, expect, afterEach, Mock } from "vitest"
import * as nodefs from "fs/promises"
import { fs } from "../workspace-fs-proxy"
import { withUser } from "../session-manager"

// Mock fs/promises
vi.mock("fs/promises", () => {
	return {
		default: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			stat: vi.fn(),
			readdir: vi.fn(),
			mkdir: vi.fn(),
			rm: vi.fn(),
			unlink: vi.fn(),
			rename: vi.fn(),
			realpath: vi.fn(),
		},
	}
})

describe("workspace-fs-proxy", () => {
	const testUserId = "test-user-id"
	const testFilePath = "/test/file.txt"
	const testUserFilePath = `/users/${testUserId}${testFilePath}`

	beforeEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	describe("readFile", () => {
		it("should read file with user prefix", async () => {
			const testData = new Uint8Array([1, 2, 3])
			;(nodefs.readFile as Mock).mockResolvedValue(testData)

			let result: Uint8Array | undefined
			await withUser(testUserId, async () => {
				result = await fs.readFile({ path: testFilePath } as any)
			})

			expect(nodefs.readFile).toHaveBeenCalledWith(testUserFilePath)
			expect(result).toEqual(testData)
		})
	})

	describe("writeFile", () => {
		it("should write file with user prefix", async () => {
			const testData = new Uint8Array([1, 2, 3])
			;(nodefs.writeFile as Mock).mockResolvedValue(undefined)
			;(nodefs.mkdir as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await fs.writeFile({ path: testFilePath } as any, testData)
			})

			expect(nodefs.mkdir).toHaveBeenCalledWith(`/users/${testUserId}/test`, { recursive: true })
			expect(nodefs.writeFile).toHaveBeenCalledWith(testUserFilePath, testData)
		})
	})

	describe("stat", () => {
		it("should stat file with user prefix", async () => {
			const testStat = { isFile: () => true, isDirectory: () => false }
			;(nodefs.stat as Mock).mockResolvedValue(testStat)

			let result: any
			await withUser(testUserId, async () => {
				result = await fs.stat({ path: testFilePath } as any)
			})

			expect(nodefs.stat).toHaveBeenCalledWith(testUserFilePath)
			expect(result).toEqual(testStat)
		})
	})

	describe("readDirectory", () => {
		it("should read directory with user prefix", async () => {
			const testEntries = [
				{ name: "file1.txt", isDirectory: () => false },
				{ name: "dir1", isDirectory: () => true },
			]
			;(nodefs.readdir as Mock).mockResolvedValue(testEntries)

			let result: [string, any][] | undefined
			await withUser(testUserId, async () => {
				result = await fs.readDirectory({ path: testFilePath } as any)
			})

			expect(nodefs.readdir).toHaveBeenCalledWith(testUserFilePath, { withFileTypes: true })
			expect(result).toEqual([
				["file1.txt", 1],
				["dir1", 2],
			])
		})
	})

	describe("createDirectory", () => {
		it("should create directory with user prefix", async () => {
			;(nodefs.mkdir as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await fs.createDirectory({ path: testFilePath } as any)
			})

			expect(nodefs.mkdir).toHaveBeenCalledWith(testUserFilePath, { recursive: true })
		})
	})

	describe("delete", () => {
		it("should delete file with user prefix", async () => {
			;(nodefs.unlink as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await fs.delete({ path: testFilePath } as any)
			})

			expect(nodefs.unlink).toHaveBeenCalledWith(testUserFilePath)
		})

		it("should delete directory recursively with user prefix", async () => {
			;(nodefs.rm as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await fs.delete({ path: testFilePath } as any, { recursive: true })
			})

			expect(nodefs.rm).toHaveBeenCalledWith(testUserFilePath, { recursive: true, force: true })
		})
	})

	describe("rename", () => {
		it("should rename file with user prefix", async () => {
			const newPath = "/test/new-file.txt"
			const testUserNewFilePath = `/users/${testUserId}${newPath}`
			;(nodefs.rename as Mock).mockResolvedValue(undefined)
			;(nodefs.mkdir as Mock).mockResolvedValue(undefined)

			await withUser(testUserId, async () => {
				await fs.rename({ path: testFilePath } as any, { path: newPath } as any)
			})

			expect(nodefs.mkdir).toHaveBeenCalledWith(`/users/${testUserId}/test`, { recursive: true })
			expect(nodefs.rename).toHaveBeenCalledWith(testUserFilePath, testUserNewFilePath)
		})
	})
})
