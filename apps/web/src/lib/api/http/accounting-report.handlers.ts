import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface ReportSession {
	readonly business: { readonly id: string };
}

interface ReportHandlerDependencies {
	readonly session: (token: string) => Promise<ReportSession | null>;
	readonly cashFlow: (businessId: string) => Promise<unknown>;
	readonly commissions: (businessId: string) => Promise<readonly unknown[]>;
}

export interface AccountingReportHandlers {
	readonly cashFlow: (request: Request, requestId: string) => Promise<Response>;
	readonly commissions: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for accounting reports. */
export function createAccountingReportHandlers(
	dependencies: ReportHandlerDependencies,
): AccountingReportHandlers {
	const sessionFor = async (request: Request) => {
		const token = readSessionToken(request);
		return token ? dependencies.session(token) : null;
	};
	return {
		cashFlow: async (request, requestId) => {
			const session = await sessionFor(request);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.cashFlow(session.business.id),
				requestId,
			);
		},
		commissions: async (request, requestId) => {
			const session = await sessionFor(request);
			if (!session) return unauthorized(requestId);
			return jsonSuccess(
				await dependencies.commissions(session.business.id),
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
