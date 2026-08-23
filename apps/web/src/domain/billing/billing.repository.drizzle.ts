import { and, count, eq, inArray } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	billingEvents,
	boardings,
	branches,
	orders,
	products,
	profiles,
	subscriptions,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { devLog } from "@/shared/utils/dev-logger";
import type {
	AtomicPaymentCallbackParams,
	PaymentCallbackResult,
} from "./billing.repository";
import { IBillingRepository } from "./billing.repository";
import type {
	TBillingEvent,
	TBillingEventId,
	TSubscription,
	TSubscriptionId,
	TSubscriptionPlan,
} from "./billing.types";

export const BillingRepositoryDrizzle = Layer.effect(
	IBillingRepository,
	Effect.map(IDrizzleClient, (db) =>
		IBillingRepository.of({
			findSubscriptionByTenantId: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db.query.subscriptions.findFirst({
								where: (subscriptions, { eq }) =>
									eq(subscriptions.businessId, tenantId),
							});

							if (!result) return null;

							// `subscriptions` has no dedicated `id` column in the live
							// schema — `business_id` is the primary key, so it doubles
							// as the subscription id (matches billing.repository.live.ts).
							return {
								id: result.businessId as TSubscriptionId,
								tenantId: result.businessId as TTenantId,
								plan: result.plan as TSubscriptionPlan,
								status: result.status as
									| "active"
									| "past_due"
									| "cancelled"
									| "trialing",
								currentPeriodStart: result.currentPeriodStart
									? new Date(result.currentPeriodStart)
									: new Date(),
								currentPeriodEnd: result.currentPeriodEnd
									? new Date(result.currentPeriodEnd)
									: null,
								createdAt: new Date(result.createdAt),
								updatedAt: new Date(result.updatedAt),
							};
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findEventByOrderId: (orderId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db.query.billingEvents.findFirst({
								where: (billingEvents, { eq }) =>
									eq(billingEvents.midtransOrderId, orderId),
							});

							if (!result) return null;

							return {
								id: result.id as TBillingEventId,
								tenantId: result.businessId as TTenantId,
								eventType: result.eventType,
								plan: result.plan as TSubscriptionPlan,
								amount: Number(result.amount),
								currency: result.currency || "IDR",
								externalOrderId: result.midtransOrderId,
								externalTransactionId: result.midtransTransactionId,
								status: result.status as "pending" | "success" | "failed",
								// `metadata` is a jsonb column — drizzle already returns a
								// parsed object, not a JSON string, so no JSON.parse here.
								metadata:
									(result.metadata as Record<string, unknown> | null) ?? {},
								createdAt: new Date(result.createdAt ?? Date.now()),
							};
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveEvent: (event: TBillingEvent) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(billingEvents).values({
								businessId: event.tenantId,
								eventType: event.eventType,
								plan: event.plan,
								amount: event.amount.toString(),
								currency: event.currency,
								midtransOrderId: event.externalOrderId,
								status: event.status,
								// jsonb column — pass the object directly, do not stringify.
								metadata: event.metadata,
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateEvent: (event: TBillingEvent) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// Idempotency check: if status is already success, do not update again
							const current = await db.query.billingEvents.findFirst({
								where: (billingEvents, { eq }) =>
									eq(billingEvents.id, event.id),
							});

							if (
								current &&
								current.status === "success" &&
								event.status === "success"
							) {
								devLog.info(
									"Billing",
									`Billing event ${event.id} is already marked as success. Skipping update.`,
								);
								return; // Idempotent
							}

							await db
								.update(billingEvents)
								.set({
									status: event.status,
									midtransTransactionId: event.externalTransactionId,
									metadata: event.metadata,
								})
								.where(eq(billingEvents.id, event.id));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateSubscription: (subscription: TSubscription) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(subscriptions)
								.set({
									plan: subscription.plan,
									status: subscription.status,
									currentPeriodStart:
										subscription.currentPeriodStart.toISOString(),
									currentPeriodEnd:
										subscription.currentPeriodEnd?.toISOString() ?? null,
								})
								.where(eq(subscriptions.businessId, subscription.tenantId));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getHistory: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const results = await db.query.billingEvents.findMany({
								where: (billingEvents, { eq }) =>
									eq(billingEvents.businessId, tenantId),
								orderBy: (billingEvents, { desc }) => [
									desc(billingEvents.createdAt),
								],
							});

							return results.map((d) => ({
								id: d.id as TBillingEventId,
								tenantId: d.businessId as TTenantId,
								eventType: d.eventType,
								plan: d.plan as TSubscriptionPlan,
								amount: Number(d.amount),
								currency: d.currency || "IDR",
								externalOrderId: d.midtransOrderId,
								externalTransactionId: d.midtransTransactionId,
								status: d.status as "pending" | "success" | "failed",
								metadata: (d.metadata as Record<string, unknown> | null) ?? {},
								createdAt: new Date(d.createdAt ?? Date.now()),
							}));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getUsageMetrics: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const now = new Date();
							const _firstDayOfMonth = new Date(
								now.getFullYear(),
								now.getMonth(),
								1,
							);

							const [pCount, bCount, sCount, boCount, ordersCount] =
								await Promise.all([
									db
										.select({ value: count() })
										.from(products)
										.where(eq(products.businessId, tenantId)),
									db
										.select({ value: count() })
										.from(branches)
										.where(eq(branches.businessId, tenantId)),
									db
										.select({ value: count() })
										.from(profiles)
										.where(eq(profiles.businessId, tenantId)),
									db
										.select({ value: count() })
										.from(boardings)
										.where(
											and(
												eq(boardings.businessId, tenantId),
												inArray(boardings.status, ["active", "draft"]),
											),
										),
									db
										.select({ value: count() })
										.from(orders)
										.where(
											and(
												eq(orders.businessId, tenantId),
												// To be completely accurate for "this month", we should filter by date
												// but for now we aggregate correctly
											),
										),
								]);

							return {
								products: pCount[0]?.value || 0,
								branches: bCount[0]?.value || 0,
								staff: sCount[0]?.value || 0,
								activeBoardings: boCount[0]?.value || 0,
								transactionsMonth: ordersCount[0]?.value || 0,
							};
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			// Drizzle variant of the atomic callback. Mirrors the
			// atomic_apply_payment_callback SQL function: locks the
			// event row + (if needed) subscription row, updates
			// both, returns the same result shape as the original RPC.
			atomicApplyPaymentCallback: (
				params: AtomicPaymentCallbackParams,
			): Effect.Effect<PaymentCallbackResult, DatabaseError> =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							return await db.transaction(async (tx) => {
								const txEvents = await tx
									.select()
									.from(billingEvents)
									.where(
										and(
											eq(billingEvents.midtransOrderId, params.orderId),
											eq(billingEvents.businessId, params.tenantId),
										),
									)
									.for("update")
									.limit(1);

								const event = txEvents[0];
								if (!event) {
									throw new Error(
										`billing event with order_id ${params.orderId} not found`,
									);
								}

								const newStatus =
									params.transactionStatus === "capture" ||
									params.transactionStatus === "settlement"
										? "success"
										: params.transactionStatus === "pending"
											? "pending"
											: "failed";

								await tx
									.update(billingEvents)
									.set({
										status: newStatus,
										midtransTransactionId:
											params.transactionId ?? event.midtransTransactionId,
										// jsonb column — merge as plain objects, no JSON string
										// round-trip.
										metadata: {
											...((event.metadata as Record<string, unknown> | null) ??
												{}),
											paymentMethod: params.paymentMethod,
										},
									})
									.where(eq(billingEvents.id, event.id));

								let subscriptionId: TSubscriptionId | null = null;
								if (newStatus === "success") {
									const metadata =
										(event.metadata as Record<string, unknown> | null) ?? {};
									const cycle = (metadata.billingCycle as string) || "monthly";
									const now = new Date();
									const periodEnd = new Date(now);
									if (cycle === "yearly") {
										periodEnd.setFullYear(periodEnd.getFullYear() + 1);
									} else {
										periodEnd.setMonth(periodEnd.getMonth() + 1);
									}

									const txSubs = await tx
										.select()
										.from(subscriptions)
										.where(eq(subscriptions.businessId, params.tenantId))
										.for("update")
										.limit(1);

									if (txSubs[0]) {
										await tx
											.update(subscriptions)
											.set({
												plan: event.plan,
												status: "active",
												currentPeriodStart: now.toISOString(),
												currentPeriodEnd: periodEnd.toISOString(),
											})
											.where(
												eq(subscriptions.businessId, txSubs[0].businessId),
											);
										// No dedicated `id` column — `business_id` is the PK.
										subscriptionId = txSubs[0].businessId as TSubscriptionId;
									} else {
										await tx.insert(subscriptions).values({
											businessId: params.tenantId,
											plan: event.plan,
											status: "active",
											currentPeriodStart: now.toISOString(),
											currentPeriodEnd: periodEnd.toISOString(),
										});
										subscriptionId =
											params.tenantId as unknown as TSubscriptionId;
									}
								}

								return {
									eventId: event.id as TBillingEventId,
									subscriptionId,
									status: newStatus,
								} satisfies PaymentCallbackResult;
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
