import { createAuthHandlers, type AuthHandlers } from "./auth.handlers";
import { createAuthProgramDependencies } from "./auth.runtime";
import { createBranchHandlers, type BranchHandlers } from "./branch.handlers";
import { getBranchesProgram } from "@/domain/branch/branch.programs";
import { getRequestId } from "./request-context";
import { jsonSuccess } from "./response";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

/**
 * Creates the direct REST request dispatcher.
 *
 * @param authHandlers handlers for the authentication routes.
 * @returns a dispatcher for migrated REST routes.
 */
export function createRestRequestHandler(
	authHandlers: AuthHandlers,
	branchHandlers?: BranchHandlers,
): (request: Request) => Promise<Response | undefined> {
	return async (request) => {
		const url = new URL(request.url);
		const requestId = getRequestId(request);

		if (url.pathname === "/api/v1/auth/login" && request.method === "POST") {
			return authHandlers.login(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/signup" && request.method === "POST") {
			return authHandlers.signup(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/logout" && request.method === "POST") {
			return authHandlers.logout(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/session" && request.method === "GET") {
			return authHandlers.session(request, requestId);
		}
		if (
			branchHandlers &&
			url.pathname === "/api/v1/branches" &&
			request.method === "GET"
		) {
			return branchHandlers.list(request, requestId);
		}
		if (url.pathname === "/api/v1/health" && request.method === "GET") {
			return jsonSuccess({ status: "ok" }, requestId);
		}

		return undefined;
	};
}

const defaultRestRequestHandler = createRestRequestHandler(
	createAuthHandlers(createAuthProgramDependencies()),
	createBranchHandlers({
		session: async (token) => createAuthProgramDependencies().session(token),
		list: async (businessId) =>
			runApp(getBranchesProgram(businessId as TTenantId)),
	}),
);

/**
 * Handles REST routes that have been migrated to the direct Pet Store API.
 *
 * @param request the incoming HTTP request.
 * @returns a response for a migrated route, or undefined for the legacy route dispatcher.
 */
export async function handleRestRequest(
	request: Request,
): Promise<Response | undefined> {
	return defaultRestRequestHandler(request);
}
