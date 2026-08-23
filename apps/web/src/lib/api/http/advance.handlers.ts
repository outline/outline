import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface AdvanceSession {
	readonly business: { readonly id: string };
}

interface AdvanceHandlerDependencies {
	readonly session: (token: string) => Promise<AdvanceSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly create: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
	readonly repay: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface AdvanceHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
	readonly repay: (request: Request, requestId: string) => Promise<Response>;
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
		create: (request, requestId) =>
			handleMutation(
				request,
				requestId,
				dependencies.session,
				dependencies.create,
			),
		repay: (request, requestId) =>
			handleMutation(
				request,
				requestId,
				dependencies.session,
				dependencies.repay,
			),
	};
}

async function handleMutation(
	request: Request,
	requestId: string,
	sessionLookup: (token: string) => Promise<AdvanceSession | null>,
	operation: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>,
): Promise<Response> {
	const token = readSessionToken(request);
	if (!token) return unauthorized(requestId);
	const session = await sessionLookup(token);
	if (!session) return unauthorized(requestId);
	const body = await readBody(request);
	if (!body) {
		return jsonError(
			new ApiHttpError(422, "validation_error", "Request body is required"),
			requestId,
		);
	}
	return jsonSuccess(await operation(session.business.id, body), requestId);
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
