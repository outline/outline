import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface GroomingSession {
	readonly business: { readonly id: string };
}

type GroomingStatus =
	| "pending"
	| "confirmed"
	| "in_progress"
	| "completed"
	| "cancelled";

interface GroomingHandlerDependencies {
	readonly session: (token: string) => Promise<GroomingSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly updateStatus: (
		businessId: string,
		id: string,
		status: GroomingStatus,
	) => Promise<unknown>;
}

export interface GroomingHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly updateStatus: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for grooming appointments. */
export function createGroomingHandlers(
	dependencies: GroomingHandlerDependencies,
): GroomingHandlers {
	return {
		list: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.list(session.business.id),
				requestId,
			);
		},
		updateStatus: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!isGroomingStatus(body?.status)) {
				return jsonError(
					new ApiHttpError(
						422,
						"validation_error",
						"Grooming status is required",
					),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.updateStatus(session.business.id, id, body.status),
				requestId,
			);
		},
	};
}

function isGroomingStatus(value: unknown): value is GroomingStatus {
	return (
		value === "pending" ||
		value === "confirmed" ||
		value === "in_progress" ||
		value === "completed" ||
		value === "cancelled"
	);
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<GroomingSession | null>,
): Promise<GroomingSession | null> {
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
