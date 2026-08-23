import { createMiddleware } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { validateSessionProgram } from "@/domain/identity/auth/auth.programs.drizzle";
import { AuthRepositoryDrizzle } from "@/domain/identity/auth/auth.repository.drizzle";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { profiles, userRoles } from "@/infra/db/drizzle/schema";
import { AppConfigLive } from "@/shared/env/app.config";
import type {
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import { getSessionCookieValue } from "./cookie";
import type { TSecurityContext } from "./security-context";

const generateRequestId = (): string =>
	crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);

const resolveRoleAndTenant = (
	userId: TUserId,
): Effect.Effect<
	{ tenantId: TTenantId; role: TUserRole } | null,
	Error,
	IDrizzleClient
> =>
	Effect.gen(function* () {
		const db = yield* IDrizzleClient;

		const [profileRow] = yield* Effect.tryPromise({
			try: () =>
				db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
			catch: (e) => e as Error,
		});

		if (!profileRow?.businessId) return null;

		const [roleRow] = yield* Effect.tryPromise({
			try: () =>
				db
					.select()
					.from(userRoles)
					.where(eq(userRoles.userId, userId))
					.limit(1),
			catch: (e) => e as Error,
		});

		if (!roleRow?.role) return null;

		return {
			tenantId: profileRow.businessId as TTenantId,
			role: roleRow.role as TUserRole,
		};
	});

const drizzleLayer = Layer.provide(
	Layer.mergeAll(AuthRepositoryDrizzle),
	Layer.mergeAll(DrizzleClientLive, AppConfigLive),
);

/**
 * Auth middleware that validates the session and attaches a full
 * TSecurityContext (userId, tenantId, role, requestId) to the next handler.
 */
export const requireDrizzleAuth = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const token = getSessionCookieValue();
		if (!token) {
			throw new Error("Unauthorized: no session cookie");
		}

		const session = await Effect.runPromise(
			Effect.provide(validateSessionProgram(token), drizzleLayer),
		);

		if (!session) {
			throw new Error("Unauthorized: invalid or expired session");
		}

		const userId = session.userId as TUserId;

		const tenantAndRole = await Effect.runPromise(
			Effect.provide(resolveRoleAndTenant(userId), DrizzleClientLive),
		);

		if (!tenantAndRole) {
			throw new Error("Unauthorized: user profile not found");
		}

		const securityContext: TSecurityContext = {
			userId,
			tenantId: tenantAndRole.tenantId,
			role: tenantAndRole.role,
			requestId: generateRequestId(),
		};

		return next({
			context: securityContext,
		});
	},
);
