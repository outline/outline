import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface LoyaltySession {
	readonly business: { readonly id: string };
}

interface LoyaltyHandlerDependencies {
	readonly session: (token: string) => Promise<LoyaltySession | null>;
	readonly config: (businessId: string) => Promise<unknown>;
	readonly updateConfig: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<void>;
	readonly redeem: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface LoyaltyHandlers {
	readonly config: (request: Request, requestId: string) => Promise<Response>;
	readonly updateConfig: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly redeem: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for loyalty configuration and redemption. */
export function createLoyaltyHandlers(
	dependencies: LoyaltyHandlerDependencies,
): LoyaltyHandlers {
	const authenticate = async (request: Request) => {
		const token = readSessionToken(request);
		return token ? dependencies.session(token) : null;
	};
	return {
		config: async (request, requestId) => {
			const session = await authenticate(request);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.config(session.business.id),
				requestId,
			);
		},
		updateConfig: async (request, requestId) => {
			const session = await authenticate(request);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) return validationError(requestId);
			await dependencies.updateConfig(session.business.id, body);
			return jsonSuccess({ updated: true }, requestId);
		},
		redeem: async (request, requestId) => {
			const session = await authenticate(request);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) return validationError(requestId);
			return jsonSuccess(
				await dependencies.redeem(session.business.id, body),
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

function validationError(requestId: string): Response {
	return jsonError(
		new ApiHttpError(422, "validation_error", "Loyalty data is required"),
		requestId,
	);
}
