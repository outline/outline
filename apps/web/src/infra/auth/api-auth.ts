import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { businessApiKeys, idempotencyKeys } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

export type TApiKeyScope =
	| "products:read"
	| "categories:read"
	| "featured:read"
	| "orders:read"
	| "orders:write"
	| "vouchers:read"
	| "webhooks:read"
	| "webhooks:write"
	| "dashboard:read"
	| "customers:read"
	| "inventory:read"
	| "branches:read"
	| "services:read";

export type TApiKeyValidation = {
	readonly businessId: TTenantId;
	readonly keyId: string;
	readonly scopes: readonly TApiKeyScope[];
};

export const timingSafeEqual = (a: string, b: string): boolean => {
	if (a.length !== b.length) return false;
	const aBuf = new TextEncoder().encode(a);
	const bBuf = new TextEncoder().encode(b);
	if (aBuf.length === 0 && bBuf.length === 0) return true;
	let result = 0;
	for (let i = 0; i < aBuf.length; i++) {
		result |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
	}
	return result === 0;
};

export const hashToken = async (token: string): Promise<string> => {
	const msgBuffer = new TextEncoder().encode(token);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const withRateLimitHeaders = (
	response: Response,
	limit = 100,
	remaining = 99,
): Response => {
	const headers = new Headers(response.headers);
	headers.set("X-RateLimit-Limit", String(limit));
	headers.set("X-RateLimit-Remaining", String(remaining));
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

export const validateApiKey = async (
	authHeader: string | null | undefined,
): Promise<TApiKeyValidation | null> => {
	if (!authHeader?.startsWith("Bearer ")) return null;

	const token = authHeader.substring(7).trim();
	if (!token) return null;

	return runApp(
		Effect.gen(function* () {
			const keyHash = yield* Effect.promise(() => hashToken(token));
			const db = yield* IDrizzleClient;

			const rows = yield* Effect.tryPromise({
				try: () =>
					db
						.select()
						.from(businessApiKeys)
						.where(eq(businessApiKeys.keyHash, keyHash))
						.limit(1),
				catch: (err) => err,
			}).pipe(
				Effect.catchAll((err) => {
					console.error("[validateApiKey] DB select failed:", err);
					return Effect.succeed([]);
				})
			);

			const row = rows[0];

			if (!row?.isActive) return null;

			if (row.expiresAt) {
				const expiry = new Date(row.expiresAt).getTime();
				if (expiry < Date.now()) return null;
			}

			yield* Effect.tryPromise({
				try: () =>
					db
						.update(businessApiKeys)
						.set({ lastUsedAt: sql`now()` })
						.where(eq(businessApiKeys.id, row.id)),
				catch: () => undefined,
			});

			return {
				businessId: row.businessId as TTenantId,
				keyId: row.id,
				scopes: (row.scopes ?? [
					"products:read",
					"categories:read",
				]) as readonly TApiKeyScope[],
			};
		}),
	);
};

export const checkScope = (
	validation: TApiKeyValidation,
	requiredScope: TApiKeyScope,
): boolean => {
	return validation.scopes.includes(requiredScope);
};

const hashRequest = async (body: string): Promise<string> => {
	const msgBuffer = new TextEncoder().encode(body);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const getIdempotentResponse = async (
	_businessId: string,
	idempotencyKey: string,
	_requestBody: string,
): Promise<Response | null> => {
	return runApp(
		Effect.gen(function* () {
			const db = yield* IDrizzleClient;
			const requestHash = yield* Effect.promise(() =>
				hashRequest(_requestBody),
			);

			const [row] = yield* Effect.tryPromise({
				try: () =>
					db
						.select()
						.from(idempotencyKeys)
						.where(
							and(
								eq(idempotencyKeys.businessId, _businessId),
								eq(idempotencyKeys.idempotencyKey, idempotencyKey),
							),
						)
						.limit(1),
				catch: (e) => e as Error,
			});

			if (!row) return null;

			if (row.requestHash !== requestHash) {
				return new Response(
					JSON.stringify({
						success: false,
						error:
							"Conflict: Idempotency key already used with a different request body",
					}),
					{
						status: 409,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return new Response(JSON.stringify(row.responseBody), {
				status: row.responseStatus,
				headers: { "Content-Type": "application/json" },
			});
		}),
	);
};

export const saveIdempotentResponse = async (
	businessId: string,
	idempotencyKey: string,
	requestBody: string,
	responseBody: unknown,
	responseStatus: number,
): Promise<void> => {
	await runApp(
		Effect.gen(function* () {
			const db = yield* IDrizzleClient;
			const requestHash = yield* Effect.promise(() => hashRequest(requestBody));

			yield* Effect.tryPromise({
				try: () =>
					db.insert(idempotencyKeys).values({
						businessId,
						idempotencyKey,
						requestHash,
						responseBody: responseBody as Record<string, unknown>,
						responseStatus,
					}),
				catch: (e) => e as Error,
			});
		}),
	);
};
