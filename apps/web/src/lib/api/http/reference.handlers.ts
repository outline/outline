import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface ReferenceSession {
	readonly business: { readonly id: string };
}

interface ReferenceHandlerDependencies {
	readonly session: (token: string) => Promise<ReferenceSession | null>;
	readonly suppliers: (
		businessId: string,
	) => Promise<readonly Record<string, unknown>[]>;
	readonly warehouses: (
		businessId: string,
	) => Promise<readonly Record<string, unknown>[]>;
	readonly mutate: (
		resource: "suppliers" | "warehouses",
		businessId: string,
		id: string | undefined,
		input: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
}

export interface ReferenceHandlers {
	readonly list: (
		resource: "suppliers" | "warehouses",
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly mutate: (
		resource: "suppliers" | "warehouses",
		request: Request,
		requestId: string,
		id?: string,
	) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for supplier and warehouse references.
 *
 * @param dependencies session and reference list operations.
 * @returns reference REST handlers.
 */
export function createReferenceHandlers(
	dependencies: ReferenceHandlerDependencies,
): ReferenceHandlers {
	return {
		list: async (resource, request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const data =
				resource === "suppliers"
					? await dependencies.suppliers(session.business.id)
					: await dependencies.warehouses(session.business.id);
			return jsonSuccess(data, requestId);
		},
		mutate: async (resource, request, requestId, id) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			const body = (await readBody(request)) ?? {};
			const data = await dependencies.mutate(
				resource,
				session.business.id,
				id,
				body,
			);
			return jsonSuccess(
				data,
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
