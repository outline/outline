import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface AuditSession {
	readonly business: { readonly id: string };
}

interface AuditHandlerDependencies {
	readonly session: (token: string) => Promise<AuditSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
}

export interface AuditHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for audit logs. */
export function createAuditHandlers(
	dependencies: AuditHandlerDependencies,
): AuditHandlers {
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
