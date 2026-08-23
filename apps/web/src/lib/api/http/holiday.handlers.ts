import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface HolidaySession {
	readonly business: { readonly id: string };
}

interface HolidayHandlerDependencies {
	readonly session: (token: string) => Promise<HolidaySession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly create: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
	readonly delete: (businessId: string, id: string) => Promise<void>;
}

export interface HolidayHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
	readonly delete: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for branch holiday closures. */
export function createHolidayHandlers(
	dependencies: HolidayHandlerDependencies,
): HolidayHandlers {
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
					new ApiHttpError(422, "validation_error", "Holiday data is required"),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.create(session.business.id, body),
				requestId,
				201,
			);
		},
		delete: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			await dependencies.delete(session.business.id, id);
			return jsonSuccess({ deleted: true }, requestId);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<HolidaySession | null>,
): Promise<HolidaySession | null> {
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
