import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface PortalSession {
	readonly business: { readonly id: string };
}

interface PortalHandlerDependencies {
	readonly session: (token: string) => Promise<PortalSession | null>;
	readonly get: (businessId: string) => Promise<unknown>;
	readonly createService: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
	readonly updateServiceStatus: (
		businessId: string,
		id: string,
		isActive: boolean,
	) => Promise<void>;
	readonly deleteService: (businessId: string, id: string) => Promise<void>;
	readonly updateConfig: (
		businessId: string,
		input: Record<string, unknown>,
	) => Promise<void>;
}

export interface PortalHandlers {
	readonly get: (request: Request, requestId: string) => Promise<Response>;
	readonly createService: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly updateServiceStatus: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
	readonly deleteService: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
	readonly updateConfig: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for the public portal admin surface. */
export function createPortalHandlers(
	dependencies: PortalHandlerDependencies,
): PortalHandlers {
	return {
		get: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.get(session.business.id),
				requestId,
			);
		},
		createService: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) return validationError(requestId);
			return jsonSuccess(
				await dependencies.createService(session.business.id, body),
				requestId,
				201,
			);
		},
		updateServiceStatus: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (typeof body?.isActive !== "boolean")
				return validationError(requestId);
			await dependencies.updateServiceStatus(
				session.business.id,
				id,
				body.isActive,
			);
			return jsonSuccess({ updated: true }, requestId);
		},
		deleteService: async (request, requestId, id) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			await dependencies.deleteService(session.business.id, id);
			return jsonSuccess({ deleted: true }, requestId);
		},
		updateConfig: async (request, requestId) => {
			const session = await getSession(request, dependencies.session);
			if (!session) return unauthorized(requestId);
			const body = await readBody(request);
			if (!body) return validationError(requestId);
			await dependencies.updateConfig(session.business.id, body);
			return jsonSuccess({ updated: true }, requestId);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<PortalSession | null>,
): Promise<PortalSession | null> {
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

function validationError(requestId: string): Response {
	return jsonError(
		new ApiHttpError(422, "validation_error", "Portal data is required"),
		requestId,
	);
}
