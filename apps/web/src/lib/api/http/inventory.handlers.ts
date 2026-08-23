import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface InventorySession {
	readonly business: { readonly id: string };
}

export interface InventorySnapshot {
	readonly batches: readonly Record<string, unknown>[];
	readonly movements: readonly Record<string, unknown>[];
}

interface InventoryHandlerDependencies {
	readonly session: (token: string) => Promise<InventorySession | null>;
	readonly snapshot: (businessId: string) => Promise<InventorySnapshot>;
	readonly adjust: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<void>;
}

export interface InventoryHandlers {
	readonly snapshot: (request: Request, requestId: string) => Promise<Response>;
	readonly adjust: (request: Request, requestId: string) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for inventory snapshots and adjustments.
 *
 * @param dependencies session and inventory domain operations.
 * @returns inventory REST handlers.
 */
export function createInventoryHandlers(
	dependencies: InventoryHandlerDependencies,
): InventoryHandlers {
	return {
		snapshot: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.snapshot(session.business.id),
				requestId,
			);
		},
		adjust: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body || typeof body.variantId !== "string") {
				return jsonError(
					new ApiHttpError(422, "validation_error", "variantId is required"),
					requestId,
				);
			}
			await dependencies.adjust(session.business.id, body);
			return jsonSuccess({ adjusted: true }, requestId);
		},
	};
}

async function getSession<
	T extends { readonly business: { readonly id: string } },
>(
	request: Request,
	session: (token: string) => Promise<T | null>,
): Promise<T | null> {
	const token = readSessionToken(request);
	return token ? session(token) : null;
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
