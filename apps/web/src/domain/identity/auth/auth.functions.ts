import type { TSessionInfo } from "@/shared/types/session.types";

export type UserRole =
	| "owner"
	| "manager"
	| "kasir"
	| "staff_daycare"
	| "admin"
	| "staff";

export type SessionInfo = TSessionInfo;

export {
	checkAuth,
	getSessionInfoV2 as getSessionInfo,
	loginV2 as login,
	logoutV2 as logout,
	signupV2 as signup,
	updateLanguage,
} from "./auth.functions.drizzle";

// Role-based access control helper for route guards
export const ROLE_HIERARCHY: Record<UserRole, number> = {
	owner: 4,
	manager: 3,
	admin: 3,
	kasir: 2,
	staff_daycare: 1,
	staff: 1,
};

export const MIN_ROLE_FOR_ROUTE: Record<string, UserRole> = {
	"/products": "manager",
	"/branches": "manager",
	"/staff": "manager",
	"/accounting": "manager",
	"/settings": "manager",
	"/invoices": "manager",
	"/loyalty": "manager",
	"/whatsapp": "manager",
	"/portal": "manager",
	"/purchase-orders": "manager",
	"/rooms": "manager",
	"/suppliers": "manager",
	"/pos": "kasir",
	"/orders": "kasir",
	"/boardings": "staff_daycare",
	"/occupancy": "staff_daycare",
	"/customers": "staff_daycare",
	"/dashboard": "staff_daycare",
	"/profile": "staff_daycare",
};

export function hasRequiredRole(
	userRole: string,
	requiredRole: UserRole,
): boolean {
	return ROLE_HIERARCHY[userRole as UserRole] >= ROLE_HIERARCHY[requiredRole];
}
