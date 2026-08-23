import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface WhatsAppSession {
	readonly business: { readonly id: string };
}

interface WhatsAppHandlerDependencies {
	readonly session: (token: string) => Promise<WhatsAppSession | null>;
	readonly templates: (businessId: string) => Promise<readonly unknown[]>;
	readonly messages: (businessId: string) => Promise<readonly unknown[]>;
}

export interface WhatsAppHandlers {
	readonly templates: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly messages: (request: Request, requestId: string) => Promise<Response>;
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
	};
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
