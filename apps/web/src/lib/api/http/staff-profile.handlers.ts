import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface StaffProfileSession {
	readonly business: { readonly id: string };
}

interface StaffProfileHandlerDependencies {
	readonly session: (token: string) => Promise<StaffProfileSession | null>;
	readonly update: (
		businessId: string,
		userId: string,
		input: { readonly fullName: string; readonly email: string },
	) => Promise<boolean>;
}

export interface StaffProfileHandlers {
	readonly update: (
		request: Request,
		requestId: string,
		userId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for staff profile updates. */
export function createStaffProfileHandlers(
	dependencies: StaffProfileHandlerDependencies,
): StaffProfileHandlers {
	return {
		update: async (request, requestId, userId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (
				typeof body?.fullName !== "string" ||
				typeof body.email !== "string"
			) {
				return jsonError(
					new ApiHttpError(
						422,
						"validation_error",
						"fullName and email are required",
					),
					requestId,
				);
			}
			return jsonSuccess(
				{
					updated: await dependencies.update(session.business.id, userId, {
						fullName: body.fullName,
						email: body.email,
					}),
				},
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
