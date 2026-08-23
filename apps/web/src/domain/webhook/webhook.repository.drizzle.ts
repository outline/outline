import { and, eq, isNull, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { webhookEndpoints } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IWebhookRepository } from "./webhook.repository";
import type {
	TWebhookEndpoint,
	TWebhookEndpointId,
	TWebhookEvent,
} from "./webhook.types";

type TWebhookRow = typeof webhookEndpoints.$inferSelect;

const mapEndpoint = (row: TWebhookRow): TWebhookEndpoint => ({
	id: row.id as TWebhookEndpointId,
	tenantId: row.businessId as TTenantId,
	url: row.url,
	secret: row.secret,
	events: (row.events ?? []) as readonly TWebhookEvent[],
	isActive: row.isActive,
	description: row.description,
	lastTriggeredAt: row.lastTriggeredAt ? new Date(row.lastTriggeredAt) : null,
	lastTriggerStatus: row.lastTriggerStatus,
	createdAt: new Date(row.createdAt),
	revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
});

export const WebhookRepositoryDrizzle = Layer.effect(
	IWebhookRepository,
	Effect.map(IDrizzleClient, (db) =>
		IWebhookRepository.of({
			findActiveByBusinessAndEvent: (tenantId: TTenantId, event: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(webhookEndpoints)
								.where(
									and(
										eq(webhookEndpoints.businessId, tenantId),
										eq(webhookEndpoints.isActive, true),
										isNull(webhookEndpoints.revokedAt),
										sql`${event} = ANY(${webhookEndpoints.events})`,
									),
								);
							return rows.map(mapEndpoint);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findAllByBusiness: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(webhookEndpoints)
								.where(
									and(
										eq(webhookEndpoints.businessId, tenantId),
										isNull(webhookEndpoints.revokedAt),
									),
								);
							return rows.map(mapEndpoint);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findById: (id: TWebhookEndpointId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(webhookEndpoints)
								.where(
									and(
										eq(webhookEndpoints.id, id),
										eq(webhookEndpoints.businessId, tenantId),
									),
								)
								.limit(1);
							return rows[0] ? mapEndpoint(rows[0]) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			save: (endpoint: TWebhookEndpoint) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(webhookEndpoints).values({
								id: endpoint.id,
								businessId: endpoint.tenantId,
								url: endpoint.url,
								secret: endpoint.secret,
								events: endpoint.events as string[],
								isActive: endpoint.isActive,
								description: endpoint.description,
								createdAt: endpoint.createdAt.toISOString(),
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			revoke: (id: TWebhookEndpointId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(webhookEndpoints)
								.set({
									revokedAt: sql`now()`,
									isActive: false,
								})
								.where(
									and(
										eq(webhookEndpoints.id, id),
										eq(webhookEndpoints.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			recordDelivery: (id: TWebhookEndpointId, status: number) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(webhookEndpoints)
								.set({
									lastTriggeredAt: sql`now()`,
									lastTriggerStatus: status,
								})
								.where(eq(webhookEndpoints.id, id));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
