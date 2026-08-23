import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface AccountingSession {
	readonly business: { readonly id: string };
}

interface AccountingHandlerDependencies {
	readonly session: (token: string) => Promise<AccountingSession | null>;
	readonly dashboardMetrics: (businessId: string) => Promise<unknown>;
}

export interface AccountingHandlers {
	readonly dashboardMetrics: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for accounting aggregates. */
export function createAccountingHandlers(
	dependencies: AccountingHandlerDependencies,
): AccountingHandlers {
	return {
		dashboardMetrics: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.dashboardMetrics(session.business.id),
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
