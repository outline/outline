import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface BillingSession {
	readonly business: { readonly id: string };
	readonly user: {
		readonly id: string;
		readonly name: string;
		readonly email: string;
	};
}

interface BillingHandlerDependencies {
	readonly session: (token: string) => Promise<BillingSession | null>;
	readonly get: (businessId: string) => Promise<unknown>;
	readonly changePlan: (
		session: BillingSession,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface BillingHandlers {
	readonly get: (request: Request, requestId: string) => Promise<Response>;
	readonly changePlan: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for billing summaries. */
export function createBillingHandlers(
	dependencies: BillingHandlerDependencies,
): BillingHandlers {
	return {
		get: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) {
				return unauthorized(requestId);
			}
			const session = await dependencies.session(token);
			if (!session) {
				return unauthorized(requestId);
			}
			return jsonSuccess(
				await dependencies.get(session.business.id),
				requestId,
			);
		},
		changePlan: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) {
				return unauthorized(requestId);
			}
			const session = await dependencies.session(token);
			if (!session) {
				return unauthorized(requestId);
			}
			const body = await readBody(request);
			if (!body) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "Request body is required"),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.changePlan(session, body),
				requestId,
			);
		},
	};
}

async function readBody(
	request: Request,
): Promise<Record<string, unknown> | undefined> {
	try {
		const value: unknown = await request.json();
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
