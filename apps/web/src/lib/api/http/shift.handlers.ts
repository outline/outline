import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface ShiftSession {
	readonly business: { readonly id: string };
}

interface ShiftHandlerDependencies {
	readonly session: (token: string) => Promise<ShiftSession | null>;
	readonly clockIn: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
	readonly clockOut: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface ShiftHandlers {
	readonly clockIn: (request: Request, requestId: string) => Promise<Response>;
	readonly clockOut: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for staff attendance. */
export function createShiftHandlers(
	dependencies: ShiftHandlerDependencies,
): ShiftHandlers {
	return {
		clockIn: (request, requestId) =>
			handle(request, requestId, dependencies.session, dependencies.clockIn),
		clockOut: (request, requestId) =>
			handle(request, requestId, dependencies.session, dependencies.clockOut),
	};
}

async function handle(
	request: Request,
	requestId: string,
	sessionLookup: (token: string) => Promise<ShiftSession | null>,
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
	if (
		!body ||
		typeof body.staffId !== "string" ||
		typeof body.date !== "string"
	) {
		return jsonError(
			new ApiHttpError(422, "validation_error", "Staff and date are required"),
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
