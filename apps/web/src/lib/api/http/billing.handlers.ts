import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface BillingSession {
	readonly business: { readonly id: string };
}

interface BillingHandlerDependencies {
	readonly session: (token: string) => Promise<BillingSession | null>;
	readonly get: (businessId: string) => Promise<unknown>;
}

export interface BillingHandlers {
	readonly get: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for billing summaries. */
export function createBillingHandlers(
	dependencies: BillingHandlerDependencies,
): BillingHandlers {
	return {
		get: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.get(session.business.id),
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
