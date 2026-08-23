import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface ReferenceSession {
	readonly business: { readonly id: string };
}

interface ReferenceHandlerDependencies {
	readonly session: (token: string) => Promise<ReferenceSession | null>;
	readonly suppliers: (
		businessId: string,
	) => Promise<readonly Record<string, unknown>[]>;
	readonly warehouses: (
		businessId: string,
	) => Promise<readonly Record<string, unknown>[]>;
}

export interface ReferenceHandlers {
	readonly list: (
		resource: "suppliers" | "warehouses",
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for supplier and warehouse references.
 *
 * @param dependencies session and reference list operations.
 * @returns reference REST handlers.
 */
export function createReferenceHandlers(
	dependencies: ReferenceHandlerDependencies,
): ReferenceHandlers {
	return {
		list: async (resource, request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const data =
				resource === "suppliers"
					? await dependencies.suppliers(session.business.id)
					: await dependencies.warehouses(session.business.id);
			return jsonSuccess(data, requestId);
		},
	};
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
