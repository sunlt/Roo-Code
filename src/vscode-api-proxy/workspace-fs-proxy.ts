import * as nodefs from "fs/promises"
import * as path from "path"
import { Uri } from "vscode"
import { getCurrentUserId, getCurrentUserRootPath } from "./session-manager"

/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
async function ensureDir(dirPath: string): Promise<void> {
	await nodefs.mkdir(dirPath, { recursive: true })
}

/**
 * 为 URI 添加用户前缀
 * @param uri 原始 URI
 * @returns 添加了用户前缀的 URI
 */
function addUserPrefixToUri(uri: Uri): Uri {
	const uid = getCurrentUserId()
	const userRootPath = getCurrentUserRootPath()

	// 处理Windows路径和特殊字符
	let cleanPath = uri.path
	if (cleanPath.startsWith("/")) {
		cleanPath = cleanPath.substring(1)
	}

	// 使用path.join来正确处理路径分隔符
	const userPath = path.join(userRootPath, cleanPath)

	// 确保路径使用正确的分隔符
	const normalizedPath = path.normalize(userPath)

	return uri.with({ path: normalizedPath })
}

/**
 * VS Code workspace.fs API 代理
 */
export const fs = {
	/**
	 * 读取文件内容
	 * @param uri 文件 URI
	 * @returns 文件内容
	 */
	async readFile(uri: Uri): Promise<Uint8Array> {
		const userUri = addUserPrefixToUri(uri)
		return nodefs.readFile(userUri.fsPath)
	},

	/**
	 * 写入文件内容
	 * @param uri 文件 URI
	 * @param content 文件内容
	 */
	async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
		const userUri = addUserPrefixToUri(uri)
		await ensureDir(path.dirname(userUri.fsPath))
		return nodefs.writeFile(userUri.fsPath, content)
	},

	/**
	 * 检查文件或目录是否存在
	 * @param uri 文件或目录 URI
	 * @returns 文件状态信息
	 */
	async stat(uri: Uri): Promise<any> {
		const userUri = addUserPrefixToUri(uri)
		return nodefs.stat(userUri.fsPath)
	},

	/**
	 * 读取目录内容
	 * @param uri 目录 URI
	 * @returns 目录中的文件和子目录
	 */
	async readDirectory(uri: Uri): Promise<[string, any][]> {
		const userUri = addUserPrefixToUri(uri)
		return nodefs.readdir(userUri.fsPath, { withFileTypes: true }).then((entries) =>
			entries.map((entry) => [
				entry.name,
				entry.isDirectory() ? 2 : 1, // 2 for directory, 1 for file
			]),
		)
	},

	/**
	 * 创建目录
	 * @param uri 目录 URI
	 */
	async createDirectory(uri: Uri): Promise<void> {
		const userUri = addUserPrefixToUri(uri)
		return ensureDir(userUri.fsPath)
	},

	/**
	 * 删除文件或目录
	 * @param uri 文件或目录 URI
	 * @param options 删除选项
	 */
	async delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void> {
		const userUri = addUserPrefixToUri(uri)
		if (options?.recursive) {
			return nodefs.rm(userUri.fsPath, { recursive: true, force: true })
		} else {
			return nodefs.unlink(userUri.fsPath)
		}
	},

	/**
	 * 重命名文件或目录
	 * @param oldUri 原始 URI
	 * @param newUri 新 URI
	 * @param options 重命名选项
	 */
	async rename(oldUri: Uri, newUri: Uri, options?: { overwrite?: boolean }): Promise<void> {
		const userOldUri = addUserPrefixToUri(oldUri)
		const userNewUri = addUserPrefixToUri(newUri)
		await ensureDir(path.dirname(userNewUri.fsPath))
		return nodefs.rename(userOldUri.fsPath, userNewUri.fsPath)
	},

	/**
	 * 检查文件或目录是否存在
	 * @param uri 文件或目录 URI
	 * @returns 是否存在
	 */
	async isFile(uri: Uri): Promise<boolean> {
		try {
			const userUri = addUserPrefixToUri(uri)
			const stats = await nodefs.stat(userUri.fsPath)
			return stats.isFile()
		} catch {
			return false
		}
	},

	/**
	 * 检查目录是否存在
	 * @param uri 目录 URI
	 * @returns 是否存在
	 */
	async isDirectory(uri: Uri): Promise<boolean> {
		try {
			const userUri = addUserPrefixToUri(uri)
			const stats = await nodefs.stat(userUri.fsPath)
			return stats.isDirectory()
		} catch {
			return false
		}
	},

	/**
	 * 获取文件或目录的真实路径
	 * @param uri 文件或目录 URI
	 * @returns 真实路径
	 */
	async realPath(uri: Uri): Promise<Uri> {
		const userUri = addUserPrefixToUri(uri)
		const realPath = await nodefs.realpath(userUri.fsPath)
		return Uri.file(realPath)
	},
}
