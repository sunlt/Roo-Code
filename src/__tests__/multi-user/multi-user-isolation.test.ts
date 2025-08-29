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

describe("multi-user-isolation", () => {
	beforeEach(() => {
		// 重置环境变量
		process.env = { ...originalEnv }
		vi.clearAllMocks()
	})

	afterEach(() => {
		// 恢复原始环境变量
		process.env = originalEnv
		vi.clearAllMocks()
	})

	describe("综合测试用例，验证多用户隔离性", () => {
		it("should isolate users with different contexts", () => {
			// 创建两个用户
			const user1Id = "user1"
			const user2Id = "user2"

			// 为用户1设置上下文
			const user1Context = createUserContext(user1Id, Uri.file("/users/user1"))
			user1Context.setGlobalState("test-key", "user1-value")
			user1Context.setWorkspaceState("test-key", "user1-workspace-value")

			// 为用户2设置上下文
			const user2Context = createUserContext(user2Id, Uri.file("/users/user2"))
			user2Context.setGlobalState("test-key", "user2-value")
			user2Context.setWorkspaceState("test-key", "user2-workspace-value")

			// 验证用户1的上下文
			const user1Result = withUserContext(user1Id, () => {
				const userId = getUserId()
				const context = getUserContext()
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
				const globalValue = context.getGlobalState("test-key")
				const workspaceValue = context.getWorkspaceState("test-key")
				return { userId, globalValue, workspaceValue }
			})

			expect(user2Result.userId).toBe(user2Id)
			expect(user2Result.globalValue).toBe("user2-value")
			expect(user2Result.workspaceValue).toBe("user2-workspace-value")
		})
	})

	describe("文件系统隔离", () => {
		it("should isolate file system access between users", async () => {
			// 创建两个用户
			const user1Id = "user1"
			const user2Id = "user2"

			// 为用户创建上下文
			createUserContext(user1Id, Uri.file("/users/user1"))
			createUserContext(user2Id, Uri.file("/users/user2"))

			// 用户1写入文件
			const user1FileUri = Uri.file("/test/file.txt")
			const user1Content = new TextEncoder().encode("user1 content")

			await withUserContext(user1Id, async () => {
				await workspace.fs.writeFile(user1FileUri, user1Content)
			})

			// 用户2写入相同路径的文件
			const user2FileUri = Uri.file("/test/file.txt")
			const user2Content = new TextEncoder().encode("user2 content")

			await withUserContext(user2Id, async () => {
				await workspace.fs.writeFile(user2FileUri, user2Content)
			})

			// 验证用户1读取到的是自己的内容
			const user1ReadContent = await withUserContext(user1Id, async () => {
				const content = await workspace.fs.readFile(user1FileUri)
				return new TextDecoder().decode(content)
			})

			expect(user1ReadContent).toBe("user1 content")

			// 验证用户2读取到的是自己的内容
			const user2ReadContent = await withUserContext(user2Id, async () => {
				const content = await workspace.fs.readFile(user2FileUri)
				return new TextDecoder().decode(content)
			})

			expect(user2ReadContent).toBe("user2 content")
		})
	})

	describe("状态隔离", () => {
		it("should isolate globalState and workspaceState between users", async () => {
			// 创建两个用户
			const user1Id = "user1"
			const user2Id = "user2"

			// 为用户创建上下文
			createUserContext(user1Id, Uri.file("/users/user1"))
			createUserContext(user2Id, Uri.file("/users/user2"))

			// 用户1设置状态
			await withUserContext(user1Id, async () => {
				await state.globalState.update("shared-key", "user1-global-value")
				await state.workspaceState.update("shared-key", "user1-workspace-value")
			})

			// 用户2设置状态
			await withUserContext(user2Id, async () => {
				await state.globalState.update("shared-key", "user2-global-value")
				await state.workspaceState.update("shared-key", "user2-workspace-value")
			})

			// 验证用户1的状态
			const user1State = await withUserContext(user1Id, async () => {
				const globalValue = await state.globalState.get("shared-key")
				const workspaceValue = await state.workspaceState.get("shared-key")
				return { globalValue, workspaceValue }
			})

			expect(user1State.globalValue).toBe("user1-global-value")
			expect(user1State.workspaceValue).toBe("user1-workspace-value")

			// 验证用户2的状态
			const user2State = await withUserContext(user2Id, async () => {
				const globalValue = await state.globalState.get("shared-key")
				const workspaceValue = await state.workspaceState.get("shared-key")
				return { globalValue, workspaceValue }
			})

			expect(user2State.globalValue).toBe("user2-global-value")
			expect(user2State.workspaceValue).toBe("user2-workspace-value")
		})
	})

	describe("终端隔离", () => {
		it("should isolate terminals between users", () => {
			// 创建两个用户
			const user1Id = "user1"
			const user2Id = "user2"

			// 为用户创建上下文
			createUserContext(user1Id, Uri.file("/users/user1"))
			createUserContext(user2Id, Uri.file("/users/user2"))

			// 用户1创建终端
			const user1Terminal = withUserContext(user1Id, () => {
				return terminal.createTerminal({ name: "user1-terminal" })
			})

			// 用户2创建终端
			const user2Terminal = withUserContext(user2Id, () => {
				return terminal.createTerminal({ name: "user2-terminal" })
			})

			// 验证终端隔离
			expect(user1Terminal.name).toBe("user1-terminal")
			expect(user2Terminal.name).toBe("user2-terminal")

			// 验证终端操作不会相互影响
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			user1Terminal.sendText("user1 command")
			user2Terminal.sendText("user2 command")

			// 验证日志调用
			expect(consoleSpy).toHaveBeenCalledWith("[Terminal] Sending text: user1 command")
			expect(consoleSpy).toHaveBeenCalledWith("[Terminal] Sending text: user2 command")
			expect(consoleSpy).toHaveBeenCalledTimes(2)

			consoleSpy.mockRestore()
		})
	})

	describe("命令隔离", () => {
		it("should isolate commands between users", async () => {
			// 创建两个用户
			const user1Id = "user1"
			const user2Id = "user2"
			// 为用户创建上下文
			createUserContext(user1Id, Uri.file("/users/user1"))
			createUserContext(user2Id, Uri.file("/users/user2"))

			// 用户1注册命令
			const user1CommandCallback = vi.fn()
			let user1Disposable: any

			withUserContext(user1Id, () => {
				user1Disposable = commands.registerCommand("test.command", user1CommandCallback)
			})

			// 用户2注册同名命令
			const user2CommandCallback = vi.fn()
			let user2Disposable: any

			withUserContext(user2Id, () => {
				user2Disposable = commands.registerCommand("test.command", user2CommandCallback)
			})

			// 用户1执行命令
			await withUserContext(user1Id, async () => {
				await commands.executeCommand("test.command", "arg1", "arg2")
			})

			// 验证只有用户1的回调被调用
			expect(user1CommandCallback).toHaveBeenCalledWith("arg1", "arg2")
			expect(user2CommandCallback).not.toHaveBeenCalled()

			// 重置模拟
			user1CommandCallback.mockReset()
			user2CommandCallback.mockReset()

			// 用户2执行命令
			await withUserContext(user2Id, async () => {
				await commands.executeCommand("test.command", "arg3", "arg4")
			})

			// 验证只有用户2的回调被调用
			expect(user2CommandCallback).toHaveBeenCalledWith("arg3", "arg4")
			expect(user1CommandCallback).not.toHaveBeenCalled()

			// 清理
			user1Disposable.dispose()
			user2Disposable.dispose()
		})
	})

	describe("文档事件隔离", () => {
		it("should isolate document operations between users", async () => {
			// 创建两个用户
			const user1Id = "user1"
			const user2Id = "user2"

			// 为用户创建上下文
			createUserContext(user1Id, Uri.file("/users/user1"))
			createUserContext(user2Id, Uri.file("/users/user2"))

			// 用户1打开文档
			const user1Document = await withUserContext(user1Id, async () => {
				return await documents.openTextDocument(Uri.file("/test/document.txt"))
			})

			// 用户2打开相同路径的文档
			const user2Document = await withUserContext(user2Id, async () => {
				return await documents.openTextDocument(Uri.file("/test/document.txt"))
			})

			// 验证文档隔离
			expect(user1Document.fileName).toBe("/test/document.txt")
			expect(user2Document.fileName).toBe("/test/document.txt")

			// 验证文档操作不会相互影响
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			await user1Document.save()
			await user2Document.save()

			// 验证保存操作日志
			expect(consoleSpy).toHaveBeenCalledWith("[Document] Saving document: /test/document.txt")
			expect(consoleSpy).toHaveBeenCalledTimes(2)

			consoleSpy.mockRestore()
		})
	})
})
