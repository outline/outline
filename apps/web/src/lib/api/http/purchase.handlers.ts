import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface PurchaseSession {
	readonly business: { readonly id: string };
}

interface PurchaseHandlerDependencies {
	readonly session: (token: string) => Promise<PurchaseSession | null>;
	readonly list: (
		businessId: string,
	) => Promise<readonly Record<string, unknown>[]>;
}

export interface PurchaseHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for purchase orders.
 *
 * @param dependencies session and purchase-order operations.
 * @returns purchase-order REST handlers.
 */
export function createPurchaseHandlers(
	dependencies: PurchaseHandlerDependencies,
): PurchaseHandlers {
	return {
		list: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.list(session.business.id),
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
