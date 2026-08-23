import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface AdvanceSession {
	readonly business: { readonly id: string };
}

interface AdvanceHandlerDependencies {
	readonly session: (token: string) => Promise<AdvanceSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
}

export interface AdvanceHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for staff advances. */
export function createAdvanceHandlers(
	dependencies: AdvanceHandlerDependencies,
): AdvanceHandlers {
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
