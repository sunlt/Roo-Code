import { sessionStore, withUser, getCurrentUserId } from "../session-manager/SessionManager"

export { sessionStore, withUser, getCurrentUserId }

/**
 * 获取当前用户的根路径
 * @returns 用户专属根路径
 */
export function getCurrentUserRootPath(): string {
	const uid = getCurrentUserId()
	return `/users/${uid}`
}
