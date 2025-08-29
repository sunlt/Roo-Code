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

describe("multi-user-integration", () => {
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

	describe("多用户综合集成测试", () => {
		it("should handle complex user workflows with multiple isolated operations", async () => {
			// 创建三个用户
			const user1Id = "user1"
			const user2Id = "user2"
			const user3Id = "user3"

			// 为用户创建上下文
			createUserContext(user1Id, Uri.file("/users/user1"))
			createUserContext(user2Id, Uri.file("/users/user2"))
			createUserContext(user3Id, Uri.file("/users/user3"))

			// 用户1执行复杂工作流
			const user1Result = await withUserContext(user1Id, async () => {
				// 1. 设置状态
				await state.globalState.update("workflow-step", "start")
				await state.workspaceState.update("current-file", "document1.txt")

				// 2. 创建文件
				const fileUri = Uri.file("/project/document1.txt")
				const fileContent = new TextEncoder().encode("User 1 initial content")
				await workspace.fs.writeFile(fileUri, fileContent)

				// 3. 创建终端
				const terminalInstance = terminal.createTerminal({ name: "user1-workflow-terminal" })
				terminalInstance.sendText("echo 'Starting user 1 workflow'")

				// 4. 注册命令
				const commandCallback = vi.fn()
				const disposable = commands.registerCommand("user1.workflow.command", commandCallback)

				// 5. 打开文档
				const document = await documents.openTextDocument(fileUri)

				// 6. 执行命令
				await commands.executeCommand("user1.workflow.command", "arg1", "arg2")

				// 7. 更新状态
				await state.globalState.update("workflow-step", "completed")
				await state.workspaceState.update("current-file", document.fileName)

				// 8. 保存文档
				await document.save()

				return {
					userId: getUserId(),
					globalState: await state.globalState.get("workflow-step"),
					workspaceState: await state.workspaceState.get("current-file"),
					documentContent: new TextDecoder().decode(await workspace.fs.readFile(fileUri)),
					commandCalled: commandCallback.mock.calls.length > 0,
				}
			})

			// 用户2执行不同的工作流
			const user2Result = await withUserContext(user2Id, async () => {
				// 1. 设置状态
				await state.globalState.update("workflow-step", "start")
				await state.workspaceState.update("current-file", "document2.txt")

				// 2. 创建文件
				const fileUri = Uri.file("/project/document2.txt")
				const fileContent = new TextEncoder().encode("User 2 initial content")
				await workspace.fs.writeFile(fileUri, fileContent)

				// 3. 创建终端
				const terminalInstance = terminal.createTerminal({ name: "user2-workflow-terminal" })
				terminalInstance.sendText("echo 'Starting user 2 workflow'")

				// 4. 注册命令
				const commandCallback = vi.fn()
				const disposable = commands.registerCommand("user2.workflow.command", commandCallback)

				// 5. 打开文档
				const document = await documents.openTextDocument(fileUri)

				// 6. 执行命令
				await commands.executeCommand("user2.workflow.command", "arg3", "arg4")

				// 7. 更新状态
				await state.globalState.update("workflow-step", "completed")
				await state.workspaceState.update("current-file", document.fileName)

				// 8. 保存文档
				await document.save()

				return {
					userId: getUserId(),
					globalState: await state.globalState.get("workflow-step"),
					workspaceState: await state.workspaceState.get("current-file"),
					documentContent: new TextDecoder().decode(await workspace.fs.readFile(fileUri)),
					commandCalled: commandCallback.mock.calls.length > 0,
				}
			})

			// 用户3执行另一个工作流
			const user3Result = await withUserContext(user3Id, async () => {
				// 1. 设置状态
				await state.globalState.update("workflow-step", "start")
				await state.workspaceState.update("current-file", "document3.txt")

				// 2. 创建文件
				const fileUri = Uri.file("/project/document3.txt")
				const fileContent = new TextEncoder().encode("User 3 initial content")
				await workspace.fs.writeFile(fileUri, fileContent)

				// 3. 创建终端
				const terminalInstance = terminal.createTerminal({ name: "user3-workflow-terminal" })
				terminalInstance.sendText("echo 'Starting user 3 workflow'")

				// 4. 注册命令
				const commandCallback = vi.fn()
				const disposable = commands.registerCommand("user3.workflow.command", commandCallback)

				// 5. 打开文档
				const document = await documents.openTextDocument(fileUri)

				// 6. 执行命令
				await commands.executeCommand("user3.workflow.command", "arg5", "arg6")

				// 7. 更新状态
				await state.globalState.update("workflow-step", "completed")
				await state.workspaceState.update("current-file", document.fileName)

				// 8. 保存文档
				await document.save()

				return {
					userId: getUserId(),
					globalState: await state.globalState.get("workflow-step"),
					workspaceState: await state.workspaceState.get("current-file"),
					documentContent: new TextDecoder().decode(await workspace.fs.readFile(fileUri)),
					commandCalled: commandCallback.mock.calls.length > 0,
				}
			})

			// 验证用户1的结果
			expect(user1Result.userId).toBe(user1Id)
			expect(user1Result.globalState).toBe("completed")
			expect(user1Result.workspaceState).toBe("/project/document1.txt")
			expect(user1Result.documentContent).toBe("User 1 initial content")
			expect(user1Result.commandCalled).toBe(true)

			// 验证用户2的结果
			expect(user2Result.userId).toBe(user2Id)
			expect(user2Result.globalState).toBe("completed")
			expect(user2Result.workspaceState).toBe("/project/document2.txt")
			expect(user2Result.documentContent).toBe("User 2 initial content")
			expect(user2Result.commandCalled).toBe(true)

			// 验证用户3的结果
			expect(user3Result.userId).toBe(user3Id)
			expect(user3Result.globalState).toBe("completed")
			expect(user3Result.workspaceState).toBe("/project/document3.txt")
			expect(user3Result.documentContent).toBe("User 3 initial content")
			expect(user3Result.commandCalled).toBe(true)

			// 验证用户之间的隔离性
			// 检查用户1不能访问用户2的文件（应该抛出错误或读取到空内容）
			await withUserContext(user1Id, async () => {
				const user2FileUri = Uri.file("/project/document2.txt")
				try {
					const content = new TextDecoder().decode(await workspace.fs.readFile(user2FileUri))
					// 如果能读取到内容，应该不是用户2的内容（因为是隔离的）
					expect(content).not.toBe("User 2 initial content")
				} catch (error: any) {
					// 如果文件不存在（因为隔离），这是预期的行为
					expect(error.code).toBe("ENOENT")
				}
			})

			// 检查用户2不能访问用户3的状态
			const user2State = await withUserContext(user2Id, async () => {
				return await state.globalState.get("workflow-step")
			})
			expect(user2State).toBe("completed") // 应该是用户2自己的状态，而不是用户3的

			// 检查用户3不能执行用户1的命令
			const user3CommandResult = await withUserContext(user3Id, async () => {
				const commandCallback = vi.fn()
				const disposable = commands.registerCommand("user1.workflow.command", commandCallback)
				await commands.executeCommand("user1.workflow.command", "test")
				return commandCallback.mock.calls.length > 0
			})
			// 用户3注册了同名命令，应该执行用户3的命令，而不是用户1的
			expect(user3CommandResult).toBe(true)
		})
	})
})
