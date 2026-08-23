import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface InvoiceSession {
	readonly business: { readonly id: string };
}

interface InvoiceHandlerDependencies {
	readonly session: (token: string) => Promise<InvoiceSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly create: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
	readonly payment: (
		businessId: string,
		invoiceId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface InvoiceHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
	readonly payment: (
		request: Request,
		requestId: string,
		invoiceId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for invoices and payments. */
export function createInvoiceHandlers(
	dependencies: InvoiceHandlerDependencies,
): InvoiceHandlers {
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
			if (!body) return validationError(requestId, "Invoice data is required");
			return jsonSuccess(
				await dependencies.create(session.business.id, body),
				requestId,
				201,
			);
		},
		payment: async (request, requestId, invoiceId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) return validationError(requestId, "Payment data is required");
			return jsonSuccess(
				await dependencies.payment(session.business.id, invoiceId, body),
				requestId,
			);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<InvoiceSession | null>,
): Promise<InvoiceSession | null> {
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
