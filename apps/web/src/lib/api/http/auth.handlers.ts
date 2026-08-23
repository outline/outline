import type {
	TLoginInput,
	TSignupInput,
} from "@/domain/identity/auth/auth.programs.drizzle";
import type { TSessionDto } from "@treonstudio/petso-lib";
import {
	EmailAlreadyExistsError,
} from "@/domain/identity/auth/auth-repository.errors";
import {
	InvalidCredentialsError,
	RateLimitedError,
} from "@/domain/identity/auth/auth.errors";
import {
	createExpiredSessionCookie,
	createSessionCookie,
	readSessionToken,
} from "@/infra/auth/http-session-cookie";
import { getRequestId } from "./request-context";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

export interface AuthProgramDependencies {
	readonly login: (
		input: TLoginInput,
	) => Promise<{ readonly userId: string; readonly token: string }>;
	readonly signup: (
		input: TSignupInput,
	) => Promise<{
		readonly userId: string;
		readonly businessId: string;
		readonly token: string;
	}>;
	readonly logout: (token: string) => Promise<void>;
	readonly session: (token: string) => Promise<TSessionDto | null>;
}

export interface AuthHandlers {
	readonly login: (request: Request, requestId?: string) => Promise<Response>;
	readonly signup: (request: Request, requestId?: string) => Promise<Response>;
	readonly logout: (request: Request, requestId?: string) => Promise<Response>;
	readonly session: (request: Request, requestId?: string) => Promise<Response>;
}

/**
 * Creates HTTP handlers for the Drizzle authentication programs.
 *
 * @param dependencies domain programs used by the handlers.
 * @returns handlers that validate input and serialize auth responses.
 */
export function createAuthHandlers(
	dependencies: AuthProgramDependencies,
): AuthHandlers {
	return {
		login: async (request, requestId = getRequestId(request)) => {
			const input = await parseLoginInput(request);
			if (!input) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "Email and password are required"),
					requestId,
				);
			}

			try {
				const session = await dependencies.login(input);
				const response = jsonSuccess({ userId: session.userId }, requestId);
				response.headers.append(
					"Set-Cookie",
					createSessionCookie(request, session.token),
				);
				return response;
			} catch (error) {
				return jsonError(toAuthHttpError(error), requestId);
			}
		},

		signup: async (request, requestId = getRequestId(request)) => {
			const input = await parseSignupInput(request);
			if (!input) {
				return jsonError(
					new ApiHttpError(
						422,
						"validation_error",
						"Email, password, full name, and business name are required",
					),
					requestId,
				);
			}

			try {
				const account = await dependencies.signup(input);
				const response = jsonSuccess(
					{ userId: account.userId, businessId: account.businessId },
					requestId,
					201,
				);
				response.headers.append(
					"Set-Cookie",
					createSessionCookie(request, account.token),
				);
				return response;
			} catch (error) {
				return jsonError(toAuthHttpError(error), requestId);
			}
		},

		logout: async (request, requestId = getRequestId(request)) => {
			const token = readSessionToken(request);
			if (token) {
				await dependencies.logout(token);
			}
			const response = jsonSuccess({ loggedOut: true }, requestId);
			response.headers.append(
				"Set-Cookie",
				createExpiredSessionCookie(request),
			);
			return response;
		},

		session: async (request, requestId = getRequestId(request)) => {
			const token = readSessionToken(request);
			if (!token) {
				return jsonError(
					new ApiHttpError(401, "unauthorized", "Authentication required"),
					requestId,
				);
			}

			try {
				const session = await dependencies.session(token);
				if (!session) {
					return jsonError(
						new ApiHttpError(401, "unauthorized", "Authentication required"),
						requestId,
					);
				}
				return jsonSuccess(session, requestId);
			} catch (error) {
				return jsonError(toAuthHttpError(error), requestId);
			}
		},
	};
}

async function parseLoginInput(request: Request): Promise<TLoginInput | undefined> {
	const body = await readBody(request);
	if (!body) return undefined;
	const email = stringValue(body.email);
	const password = stringValue(body.password);
	if (!email || !password) return undefined;
	return { email, password };
}

async function parseSignupInput(
	request: Request,
): Promise<TSignupInput | undefined> {
	const body = await readBody(request);
	if (!body) return undefined;
	const email = stringValue(body.email);
	const password = stringValue(body.password);
	const fullName = stringValue(body.fullName);
	const businessName = stringValue(body.businessName);
	if (!email || !password || !fullName || !businessName) return undefined;
	return { email, password, fullName, businessName };
}

async function readBody(
	request: Request,
): Promise<Record<string, unknown> | undefined> {
	try {
		const value: unknown = await request.json();
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return undefined;
		}
		return value as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

function stringValue(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function toAuthHttpError(error: unknown): ApiHttpError {
	if (error instanceof InvalidCredentialsError) {
		return new ApiHttpError(401, "invalid_credentials", "Invalid email or password");
	}
	if (error instanceof RateLimitedError) {
		return new ApiHttpError(429, "rate_limited", "Too many login attempts");
	}
	if (error instanceof EmailAlreadyExistsError) {
		return new ApiHttpError(409, "email_exists", "An account already exists for this email");
	}
	return new ApiHttpError(500, "internal_error", "Unable to process authentication request");
}
