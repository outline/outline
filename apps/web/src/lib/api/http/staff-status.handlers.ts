import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface StaffStatusSession {
	readonly business: { readonly id: string };
}

interface StaffStatusHandlerDependencies {
	readonly session: (token: string) => Promise<StaffStatusSession | null>;
	readonly setStatus: (
		businessId: string,
		userId: string,
		isActive: boolean,
	) => Promise<boolean>;
}

export interface StaffStatusHandlers {
	readonly setStatus: (
		request: Request,
		requestId: string,
		userId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for staff activation status. */
export function createStaffStatusHandlers(
	dependencies: StaffStatusHandlerDependencies,
): StaffStatusHandlers {
	return {
		setStatus: async (request, requestId, userId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (typeof body?.isActive !== "boolean") {
				return jsonError(
					new ApiHttpError(422, "validation_error", "isActive is required"),
					requestId,
				);
			}
			return jsonSuccess(
				{
					updated: await dependencies.setStatus(
						session.business.id,
						userId,
						body.isActive,
					),
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
