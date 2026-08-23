import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface WhatsAppSession {
	readonly business: { readonly id: string };
}

interface WhatsAppHandlerDependencies {
	readonly session: (token: string) => Promise<WhatsAppSession | null>;
	readonly templates: (businessId: string) => Promise<readonly unknown[]>;
	readonly messages: (businessId: string) => Promise<readonly unknown[]>;
	readonly send: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface WhatsAppHandlers {
	readonly templates: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly messages: (request: Request, requestId: string) => Promise<Response>;
	readonly send: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for WhatsApp templates. */
export function createWhatsAppHandlers(
	dependencies: WhatsAppHandlerDependencies,
): WhatsAppHandlers {
	return {
		templates: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.templates(session.business.id),
				requestId,
			);
		},
		messages: async (request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.messages(session.business.id),
				requestId,
			);
		},
		send: (request, requestId) =>
			handleSend(request, requestId, dependencies.session, dependencies.send),
	};
}

async function handleSend(
	request: Request,
	requestId: string,
	sessionLookup: (token: string) => Promise<WhatsAppSession | null>,
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
	if (!body) {
		return jsonError(
			new ApiHttpError(422, "validation_error", "Request body is required"),
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
