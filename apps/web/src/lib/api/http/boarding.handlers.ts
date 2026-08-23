import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface BoardingSession {
	readonly business: { readonly id: string };
	readonly user: { readonly id: string };
}

interface BoardingHandlerDependencies {
	readonly session: (token: string) => Promise<BoardingSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly updateStatus: (
		businessId: string,
		id: string,
		status: string,
	) => Promise<void>;
	readonly create: (
		businessId: string,
		userId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface BoardingHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
	readonly updateStatus: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for boarding operations. */
export function createBoardingHandlers(
	dependencies: BoardingHandlerDependencies,
): BoardingHandlers {
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
					new ApiHttpError(
						422,
						"validation_error",
						"Boarding data is required",
					),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.create(session.business.id, session.user.id, body),
				requestId,
				201,
			);
		},
		updateStatus: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (typeof body?.status !== "string") {
				return jsonError(
					new ApiHttpError(
						422,
						"validation_error",
						"Boarding status is required",
					),
					requestId,
				);
			}
			await dependencies.updateStatus(session.business.id, id, body.status);
			return jsonSuccess({ updated: true }, requestId);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<BoardingSession | null>,
): Promise<BoardingSession | null> {
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
