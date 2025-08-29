import { describe, it, beforeEach, vi, expect, afterEach } from "vitest"
import * as vscode from "vscode"
import { addUserPrefixToCommandId, removeUserPrefixFromCommandId, commandProxy } from "../command-proxy"
import { withUser } from "../session-manager"

// Mock vscode.commands
vi.mock("vscode", () => {
	return {
		commands: {
			registerCommand: vi.fn(),
			executeCommand: vi.fn(),
			getCommands: vi.fn(),
		},
	}
})

describe("command-proxy", () => {
	const testUserId = "test-user-id"
	const testCommandId = "test.command"
	const testUserCommandId = `__${testUserId}__${testCommandId}`

	beforeEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	describe("addUserPrefixToCommandId", () => {
		it("should add user prefix to command ID", () => {
			let result: string | undefined
			withUser(testUserId, () => {
				result = addUserPrefixToCommandId(testCommandId)
			})

			expect(result).toBe(testUserCommandId)
		})
	})

	describe("removeUserPrefixFromCommandId", () => {
		it("should remove user prefix from command ID", () => {
			let result: string | undefined
			withUser(testUserId, () => {
				result = removeUserPrefixFromCommandId(testUserCommandId)
			})

			expect(result).toBe(testCommandId)
		})

		it("should return original command ID when no prefix", () => {
			let result: string | undefined
			withUser(testUserId, () => {
				result = removeUserPrefixFromCommandId(testCommandId)
			})

			expect(result).toBe(testCommandId)
		})
	})

	describe("commandProxy", () => {
		describe("registerCommand", () => {
			it("should register command with user prefix", () => {
				const mockCallback = vi.fn()
				const mockDisposable = { dispose: vi.fn() }
				;(vscode.commands.registerCommand as any).mockReturnValue(mockDisposable)

				let result: any
				withUser(testUserId, () => {
					result = commandProxy.registerCommand(testCommandId, mockCallback)
				})

				expect(vscode.commands.registerCommand).toHaveBeenCalledWith(testUserCommandId, mockCallback, undefined)
				expect(result).toBe(mockDisposable)
			})
		})

		describe("executeCommand", () => {
			it("should execute command with user prefix", async () => {
				const mockResult = "test-result"
				;(vscode.commands.executeCommand as any).mockResolvedValue(mockResult)

				let result: any
				await withUser(testUserId, async () => {
					result = await commandProxy.executeCommand(testCommandId)
				})

				expect(vscode.commands.executeCommand).toHaveBeenCalledWith(testUserCommandId)
				expect(result).toBe(mockResult)
			})
		})

		describe("getCommands", () => {
			it("should get commands and filter by user prefix", async () => {
				const testCommands = [
					testUserCommandId,
					`__${testUserId}__another.command`,
					"__other-user__other.command",
					"global.command",
				]
				;(vscode.commands.getCommands as any).mockResolvedValue(testCommands)

				let result: any
				await withUser(testUserId, async () => {
					result = await commandProxy.getCommands()
				})

				expect(vscode.commands.getCommands).toHaveBeenCalled()
				expect(result).toEqual(["test.command", "another.command"])
			})
		})
	})
})
