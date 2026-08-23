import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface StaffInviteSession {
	readonly business: { readonly id: string };
}

interface StaffInviteHandlerDependencies {
	readonly session: (token: string) => Promise<StaffInviteSession | null>;
	readonly invite: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface StaffInviteHandlers {
	readonly invite: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for granting staff access. */
export function createStaffInviteHandlers(
	dependencies: StaffInviteHandlerDependencies,
): StaffInviteHandlers {
	return {
		invite: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "Request body is required"),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.invite(session.business.id, body),
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
