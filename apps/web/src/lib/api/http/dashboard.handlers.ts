import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface DashboardSession {
	readonly business: { readonly id: string };
}

interface DashboardHandlerDependencies {
	readonly session: (token: string) => Promise<DashboardSession | null>;
	readonly topSellers: (businessId: string) => Promise<readonly unknown[]>;
}

export interface DashboardHandlers {
	readonly topSellers: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for dashboard aggregates. */
export function createDashboardHandlers(
	dependencies: DashboardHandlerDependencies,
): DashboardHandlers {
	return {
		topSellers: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.topSellers(session.business.id),
				requestId,
			);
		},
	};
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
