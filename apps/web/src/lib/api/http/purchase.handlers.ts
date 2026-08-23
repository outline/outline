import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface PurchaseSession {
	readonly business: { readonly id: string };
	readonly userId: string;
}

interface PurchaseHandlerDependencies {
	readonly session: (token: string) => Promise<PurchaseSession | null>;
	readonly list: (
		businessId: string,
	) => Promise<readonly Record<string, unknown>[]>;
	readonly create: (
		businessId: string,
		userId: string,
		input: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
	readonly updateStatus: (
		businessId: string,
		id: string,
		status: string,
	) => Promise<void>;
	readonly receive: (
		businessId: string,
		userId: string,
		input: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
}

export interface PurchaseHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
	readonly updateStatus: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
	readonly receive: (request: Request, requestId: string) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for purchase orders.
 *
 * @param dependencies session and purchase-order operations.
 * @returns purchase-order REST handlers.
 */
export function createPurchaseHandlers(
	dependencies: PurchaseHandlerDependencies,
): PurchaseHandlers {
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
				return validationError(requestId, "Purchase order data is required");
			}
			return jsonSuccess(
				await dependencies.create(session.business.id, session.userId, body),
				requestId,
				201,
			);
		},
		updateStatus: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (typeof body?.status !== "string") {
				return validationError(requestId, "Purchase order status is required");
			}
			await dependencies.updateStatus(session.business.id, id, body.status);
			return jsonSuccess({ updated: true }, requestId);
		},
		receive: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body)
				return validationError(requestId, "Receiving data is required");
			return jsonSuccess(
				await dependencies.receive(session.business.id, session.userId, body),
				requestId,
			);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<PurchaseSession | null>,
): Promise<PurchaseSession | null> {
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

function validationError(requestId: string, message: string): Response {
	return jsonError(
		new ApiHttpError(422, "validation_error", message),
		requestId,
	);
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
