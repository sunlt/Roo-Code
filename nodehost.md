目标澄清

- **独立运行时**：Roo Code Extension Host 已经脱离 VS Code，以「单进程」 Node 服务启动。
- **多用户并发** **禁止** 再开多进程 / 多容器，即**一个进程**必须**同时**服务 N 个用户，且**工作区、状态、扩展上下文**互相隔离。

这就需要把「多用户」能力**下沉到 Extension Host 内部**，而不是靠外部再启进程。下面给出可行方案。

---

## 1 核心思路

把「用户」抽象成一个**会话上下文（Session Context）**，所有 VS Code API 的调用都隐式携带当前用户 ID，单进程内实现**软隔离**。

```
┌──────────────────────────────┐
│ Roo Code Single Process      │
│  ├─ SessionManager          │  ← 路由/鉴权
│  │   ├── user-1 Context    │
│  │   ├── user-2 Context    │
│  │   └── …                 │
│  └─ Shared Services         │
│      (LLM pool, file cache) │
└──────────────────────────────┘
```

---

## 2 最小改动清单

2.1 运行时入口

- 不再调用 `activate(context)` 一次，而是 **每用户一次**，把 `context` 换成 **SessionContext**。
- 用 `Map<userId, SessionContext>` 缓存。

    2.2 VS Code API 代理

    > 关键：所有 API 都在内部做一次 **userId 路由**。

| VS Code API                    | 单进程改造要点                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `workspace.rootPath`           | 返回 `sessions.get(uid).rootUri.fsPath`                                          |
| `workspace.fs.readFile(uri)`   | 在 uri 前拼 `/users/{uid}` 前缀做虚拟隔离                                        |
| `window.createTerminal`        | 返回 **伪 Terminal** 对象，内部用 node-pty 开 shell 并把 cwd 指向 `/users/{uid}` |
| `globalState / workspaceState` | 换成 `keyv` + SQLite：表名 `kv_${uid}`                                           |
| `TextDocument` 事件            | 在 URI 上加 `?uid=xxx` 查询串，事件分发时过滤                                    |
| `commands.registerCommand`     | 命令 ID 自动加前缀 `__uid__` 防止冲突                                            |

2.3 通信协议

- 前端(WebSocket)每条消息都带 `uid`。
- Extension Host 侧用 **AsyncLocalStorage** 或 **cls-hooked** 隐式传递当前用户 ID，避免层层传参。

---

## 3 代码示例

3.1 SessionManager.ts

```ts
import { AsyncLocalStorage } from "async_hooks"
export const sessionStore = new AsyncLocalStorage<string>()

export function withUser<T>(uid: string, fn: () => T): T {
	return sessionStore.run(uid, fn)
}
```

3.2 代理 workspace.fs

```ts
import * as nodefs from "fs/promises"
import { sessionStore } from "./SessionManager"

export const fs = {
	async readFile(uri: Uri): Promise<Uint8Array> {
		const uid = sessionStore.getStore()!
		const realPath = `/users/${uid}${uri.path}`
		return nodefs.readFile(realPath)
	},
	// writeFile, stat, etc. 同理
}
```

3.3 启动脚本

```ts
import express from "express"
import { WebSocket } from "ws"
import { activate } from "./src/extension"
import { withUser } from "./SessionManager"

const app = express()
const wss = new WebSocket.Server({ port: 3000 })

const sessions = new Map<string, any>()

wss.on("connection", (ws, req) => {
	const uid = new URL(req.url!, "http://dummy").searchParams.get("uid")!
	if (!sessions.has(uid)) {
		sessions.set(uid, createSessionContext(uid))
		withUser(uid, () => activate(sessions.get(uid)!))
	}

	ws.on("message", (msg) => {
		const data = JSON.parse(msg.toString())
		withUser(uid, () => handleMessage(data))
	})
})
```

---

## 4 资源隔离 & 性能

| 维度     | 实现                                          | 备注                              |
| -------- | --------------------------------------------- | --------------------------------- |
| 文件系统 | 统一根目录下 `/users/{uid}`；内部 URI rewrite | 无需 chroot，简单可靠             |
| 内存     | 每个 SessionContext 存独立变量                | 共用 LLM 连接池，节省显存         |
| CPU      | Node 事件循环天然并发                         | 如要硬隔离可用 Node Worker Thread |
| 持久化   | 每个用户独立 SQLite 文件                      | `users/{uid}/state.db`            |

---

## 5 与旧代码的兼容性

- 仍保留 `src/` 不动，所有替换逻辑放在 `shim/multi-user-vscode.ts`。
- 通过 **环境变量** `MULTI_USER=1` 决定是否启用 SessionManager；  
  不设置时退化为单用户模式，完全兼容原测试用例。

---

## 6 一键启动

```bash
# 单进程 + 多用户
MULTI_USER=1 node dist/standalone.js
```

---

结论  
在 **单进程** 内为每个用户维护独立的 SessionContext，并把全部 VS Code API 做 **用户级路由 / URI rewrite / 数据分表**，即可实现 **无多进程** 的多用户并发 Roo Code。
