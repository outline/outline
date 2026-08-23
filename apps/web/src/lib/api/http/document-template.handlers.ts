import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface TemplateSession {
	readonly business: { readonly id: string };
}

interface TemplateHandlerDependencies {
	readonly session: (token: string) => Promise<TemplateSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly save: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface DocumentTemplateHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly save: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for printable document templates. */
export function createDocumentTemplateHandlers(
	dependencies: TemplateHandlerDependencies,
): DocumentTemplateHandlers {
	return {
		list: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.list(session.business.id),
				requestId,
			);
		},
		save: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (
				!body ||
				typeof body.type !== "string" ||
				typeof body.name !== "string"
			) {
				return jsonError(
					new ApiHttpError(
						422,
						"validation_error",
						"Template type, name, and content are required",
					),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.save(session.business.id, body),
				requestId,
				201,
			);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<TemplateSession | null>,
): Promise<TemplateSession | null> {
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

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
