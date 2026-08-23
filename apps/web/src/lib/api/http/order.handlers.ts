import type { TOrderDto } from "@/domain/order/order.dto";
import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface OrderSession {
	readonly business: { readonly id: string };
	readonly user: { readonly id: string };
	readonly branchId: string;
}

interface OrderHandlerDependencies {
	readonly session: (token: string) => Promise<OrderSession | null>;
	readonly list: (businessId: string) => Promise<readonly TOrderDto[]>;
	readonly create: (
		businessId: string,
		userId: string,
		input: Record<string, unknown>,
	) => Promise<TOrderDto>;
	readonly void: (
		businessId: string,
		userId: string,
		id: string,
		reason: string,
	) => Promise<void>;
}

export interface OrderHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
	readonly void: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for POS orders.
 *
 * @param dependencies order session and domain operations.
 * @returns order REST handlers.
 */
export function createOrderHandlers(
	dependencies: OrderHandlerDependencies,
): OrderHandlers {
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
				return jsonError(
					new ApiHttpError(422, "validation_error", "Order data is required"),
					requestId,
				);
			}
			const input = { ...body, branchId: body.branchId ?? session.branchId };
			if (typeof input.branchId !== "string" || !input.branchId) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "A branch is required"),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.create(session.business.id, session.user.id, input),
				requestId,
				201,
			);
		},
		void: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			const reason = typeof body?.reason === "string" ? body.reason : "Voided";
			await dependencies.void(session.business.id, session.user.id, id, reason);
			return jsonSuccess({ voided: true }, requestId);
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
