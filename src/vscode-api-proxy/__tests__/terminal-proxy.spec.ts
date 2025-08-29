import { describe, it, beforeEach, vi, expect, afterEach } from "vitest"
import { createTerminal, window } from "../terminal-proxy"
import { withUser } from "../session-manager"

// Mock console.log
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {})

describe("terminal-proxy", () => {
	const testUserId = "test-user-id"

	beforeEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// 清理所有 mocks
		vi.clearAllMocks()
	})

	describe("createTerminal", () => {
		it("should create a pseudo terminal with default name", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal()
			})

			expect(terminal).toBeDefined()
			expect(terminal.name).toBe("User Terminal")
			expect(terminal.process).toBe("shell")
			expect(terminal.isClosed).toBe(false)
		})

		it("should create a pseudo terminal with custom name", () => {
			const options = { name: "Custom Terminal" }
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal(options)
			})

			expect(terminal).toBeDefined()
			expect(terminal.name).toBe("Custom Terminal")
			expect(terminal.process).toBe("shell")
			expect(terminal.isClosed).toBe(false)
		})

		it("should send text to terminal", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.sendText("Hello World")
			})

			expect(mockConsoleLog).toHaveBeenCalledWith("Sending text to terminal: Hello World")
		})

		it("should throw error when sending text to closed terminal", () => {
			let terminal: any
			let error: Error | undefined
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.dispose()
				try {
					terminal.sendText("Hello World")
				} catch (e) {
					error = e as Error
				}
			})

			expect(error).toBeDefined()
			expect(error?.message).toBe("Terminal is closed")
		})

		it("should show terminal", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.show()
			})

			expect(mockConsoleLog).toHaveBeenCalledWith("Showing terminal: User Terminal")
		})

		it("should throw error when showing closed terminal", () => {
			let terminal: any
			let error: Error | undefined
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.dispose()
				try {
					terminal.show()
				} catch (e) {
					error = e as Error
				}
			})

			expect(error).toBeDefined()
			expect(error?.message).toBe("Terminal is closed")
		})

		it("should hide terminal", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.hide()
			})

			expect(mockConsoleLog).toHaveBeenCalledWith("Hiding terminal: User Terminal")
		})

		it("should throw error when hiding closed terminal", () => {
			let terminal: any
			let error: Error | undefined
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.dispose()
				try {
					terminal.hide()
				} catch (e) {
					error = e as Error
				}
			})

			expect(error).toBeDefined()
			expect(error?.message).toBe("Terminal is closed")
		})

		it("should dispose terminal", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.dispose()
			})

			expect(terminal.isClosed).toBe(true)
			expect(mockConsoleLog).toHaveBeenCalledWith("Disposing terminal: User Terminal")
		})

		it("should not dispose terminal twice", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = createTerminal()
				terminal.dispose()
				terminal.dispose() // Second dispose should not throw error
			})

			expect(terminal.isClosed).toBe(true)
			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
		})
	})

	describe("window.createTerminal", () => {
		it("should create terminal through window proxy", () => {
			let terminal: any
			withUser(testUserId, () => {
				terminal = window.createTerminal()
			})

			expect(terminal).toBeDefined()
			expect(terminal.name).toBe("User Terminal")
		})
	})
})
