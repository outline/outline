import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface ReturnSession {
	readonly business: { readonly id: string };
	readonly user: { readonly id: string };
}

interface ReturnHandlerDependencies {
	readonly session: (token: string) => Promise<ReturnSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly create: (
		businessId: string,
		userId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface ReturnHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for returns. */
export function createReturnHandlers(
	dependencies: ReturnHandlerDependencies,
): ReturnHandlers {
	return {
		list: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.list(session.business.id),
				requestId,
			);
		},
		create: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "Return data is required"),
					requestId,
				);
			}
			const id = await dependencies.create(
				session.business.id,
				session.user.id,
				body,
			);
			return jsonSuccess({ created: true, id }, requestId, 201);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<ReturnSession | null>,
): Promise<ReturnSession | null> {
	const token = readSessionToken(request);
	return token ? session(token) : null;
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
