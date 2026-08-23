import { createAuthHandlers, type AuthHandlers } from "./auth.handlers";
import { createAuthProgramDependencies } from "./auth.runtime";
import { getRequestId } from "./request-context";
import { jsonSuccess } from "./response";

/**
 * Creates the direct REST request dispatcher.
 *
 * @param authHandlers handlers for the authentication routes.
 * @returns a dispatcher for migrated REST routes.
 */
export function createRestRequestHandler(
	authHandlers: AuthHandlers,
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
		if (url.pathname === "/api/v1/health" && request.method === "GET") {
			return jsonSuccess({ status: "ok" }, requestId);
		}

		return undefined;
	};
}

const defaultRestRequestHandler = createRestRequestHandler(
	createAuthHandlers(createAuthProgramDependencies()),
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
