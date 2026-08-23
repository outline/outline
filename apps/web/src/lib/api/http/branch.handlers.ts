import type { TBranchDto } from "@/domain/branch/branch.dto";
import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface BranchSession {
	readonly user: { readonly id: string };
	readonly business: { readonly id: string };
}

interface BranchHandlerDependencies {
	readonly session: (token: string) => Promise<BranchSession | null>;
	readonly list: (businessId: string) => Promise<readonly TBranchDto[]>;
	readonly mutate: (
		businessId: string,
		userId: string,
		id: string | undefined,
		input: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
}

export interface BranchHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly mutate: (
		request: Request,
		requestId: string,
		id?: string,
	) => Promise<Response>;
}

/**
 * Creates REST handlers for branch resources.
 *
 * @param dependencies authenticated session and branch domain operations.
 * @returns branch REST handlers.
 */
export function createBranchHandlers(
	dependencies: BranchHandlerDependencies,
): BranchHandlers {
	return {
		list: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) {
				return jsonError(
					new ApiHttpError(401, "unauthorized", "Authentication required"),
					requestId,
				);
			}

			const session = await dependencies.session(token);
			if (!session) {
				return jsonError(
					new ApiHttpError(401, "unauthorized", "Authentication required"),
					requestId,
				);
			}

			return jsonSuccess(
				await dependencies.list(session.business.id),
				requestId,
			);
		},
		mutate: async (request, requestId, id) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			return jsonSuccess(
				await dependencies.mutate(
					session.business.id,
					session.user.id,
					id,
					body ?? {},
				),
				requestId,
				request.method === "POST" ? 201 : 200,
			);
		},
	};
}

async function readBody(
	request: Request,
): Promise<Record<string, unknown> | undefined> {
	try {
		const value: unknown = await request.json();
		return isRecord(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
