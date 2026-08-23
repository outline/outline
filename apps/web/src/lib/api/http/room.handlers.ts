import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface RoomSession {
	readonly business: { readonly id: string };
}

interface RoomHandlerDependencies {
	readonly session: (token: string) => Promise<RoomSession | null>;
	readonly list: (
		businessId: string,
		branchId: string | undefined,
	) => Promise<readonly Record<string, unknown>[]>;
	readonly mutate: (
		businessId: string,
		id: string | undefined,
		input: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
}

export interface RoomHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly mutate: (
		request: Request,
		requestId: string,
		id?: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for room master data. */
export function createRoomHandlers(
	dependencies: RoomHandlerDependencies,
): RoomHandlers {
	return {
		list: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const branchId =
				new URL(request.url).searchParams.get("branchId") ?? undefined;
			return jsonSuccess(
				await dependencies.list(session.business.id, branchId),
				requestId,
			);
		},
		mutate: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (request.method !== "DELETE" && !body) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "Room data is required"),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.mutate(session.business.id, id, body ?? {}),
				requestId,
				request.method === "POST" ? 201 : 200,
			);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<RoomSession | null>,
): Promise<RoomSession | null> {
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
