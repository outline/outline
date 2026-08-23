import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface ExpenseSession {
	readonly business: { readonly id: string };
	readonly user: { readonly id: string };
}

interface ExpenseHandlerDependencies {
	readonly session: (token: string) => Promise<ExpenseSession | null>;
	readonly list: (businessId: string) => Promise<readonly unknown[]>;
	readonly create: (
		businessId: string,
		userId: string,
		input: Record<string, unknown>,
	) => Promise<unknown>;
}

export interface ExpenseHandlers {
	readonly list: (request: Request, requestId: string) => Promise<Response>;
	readonly create: (request: Request, requestId: string) => Promise<Response>;
}

/** Creates authenticated REST handlers for operating expenses. */
export function createExpenseHandlers(
	dependencies: ExpenseHandlerDependencies,
): ExpenseHandlers {
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
					new ApiHttpError(422, "validation_error", "Expense data is required"),
					requestId,
				);
			}
			return jsonSuccess(
				await dependencies.create(session.business.id, session.user.id, body),
				requestId,
				201,
			);
		},
	};
}

async function getSession(
	request: Request,
	session: (token: string) => Promise<ExpenseSession | null>,
): Promise<ExpenseSession | null> {
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
