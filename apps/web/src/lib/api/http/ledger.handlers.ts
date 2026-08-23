import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface LedgerSession {
	readonly business: { readonly id: string };
}

interface LedgerHandlerDependencies {
	readonly session: (token: string) => Promise<LedgerSession | null>;
	readonly accounts: (businessId: string) => Promise<readonly unknown[]>;
	readonly journal: (businessId: string) => Promise<readonly unknown[]>;
}

export interface LedgerHandlers {
	readonly accounts: (request: Request, requestId: string) => Promise<Response>;
	readonly journal: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for the accounting ledger. */
export function createLedgerHandlers(
	dependencies: LedgerHandlerDependencies,
): LedgerHandlers {
	const authenticate = async (request: Request) => {
		const token = readSessionToken(request);
		if (!token) return null;
		return dependencies.session(token);
	};
	return {
		accounts: async (request, requestId) => {
			const session = await authenticate(request);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.accounts(session.business.id),
				requestId,
			);
		},
		journal: async (request, requestId) => {
			const session = await authenticate(request);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.journal(session.business.id),
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
