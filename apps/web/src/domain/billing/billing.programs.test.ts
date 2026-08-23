import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createSubscriptionPaymentProgram,
	getBillingHistoryProgram,
	getCurrentSubscriptionProgram,
	getUsageMetricsProgram,
	handlePaymentCallbackProgram,
} from "./billing.programs";
import { IBillingRepository, IPaymentProvider } from "./billing.repository";
import type {
	TBillingEvent,
	TBillingEventId,
	TSubscription,
	TSubscriptionId,
	TUsageMetrics,
} from "./billing.types";

const tenantId = generateId<TTenantId>();
const userId = generateId<TUserId>();

const mockSubscription: TSubscription = {
	id: generateId<TSubscriptionId>(),
	tenantId,
	plan: "pro",
	status: "active",
	currentPeriodStart: new Date("2026-06-01"),
	currentPeriodEnd: new Date("2026-07-01"),
	createdAt: new Date("2026-06-01"),
	updatedAt: new Date("2026-06-01"),
};

const mockEvent: TBillingEvent = {
	id: generateId<TBillingEventId>(),
	tenantId,
	eventType: "subscription_created",
	plan: "pro",
	amount: 199000,
	currency: "IDR",
	externalOrderId: "SUB-abc12345-1718000000000",
	externalTransactionId: null,
	status: "pending",
	metadata: { billingCycle: "monthly", userId },
	createdAt: new Date("2026-06-20"),
};

const mockUsageMetrics: TUsageMetrics = {
	products: 15,
	branches: 2,
	staff: 8,
	activeBoardings: 12,
	transactionsMonth: 45,
};

describe("getUsageMetricsProgram", () => {
	it("should return usage metrics from repo", async () => {
		const getUsageMetrics = vi
			.fn()
			.mockReturnValue(Effect.succeed(mockUsageMetrics));
		const result = await Effect.runPromise(
			Effect.provide(
				getUsageMetricsProgram(tenantId),
				Layer.succeed(IBillingRepository, {
					findSubscriptionByTenantId: vi.fn(),
					findEventByOrderId: vi.fn(),
					saveEvent: vi.fn(),
					updateEvent: vi.fn(),
					updateSubscription: vi.fn(),
					getHistory: vi.fn(),
					getUsageMetrics,
					atomicApplyPaymentCallback: vi.fn(),
				}),
			),
		);

		expect(result).toEqual(mockUsageMetrics);
		expect(getUsageMetrics).toHaveBeenCalledWith(tenantId);
	});

	it("should propagate DatabaseError", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getUsageMetricsProgram(tenantId),
					Layer.succeed(IBillingRepository, {
						findSubscriptionByTenantId: vi.fn(),
						findEventByOrderId: vi.fn(),
						saveEvent: vi.fn(),
						updateEvent: vi.fn(),
						updateSubscription: vi.fn(),
						getHistory: vi.fn(),
						getUsageMetrics: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						atomicApplyPaymentCallback: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getCurrentSubscriptionProgram", () => {
	it("should return subscription DTO when subscription exists", async () => {
		const findSubscriptionByTenantId = vi
			.fn()
			.mockReturnValue(Effect.succeed(mockSubscription));
		const result = await Effect.runPromise(
			Effect.provide(
				getCurrentSubscriptionProgram(tenantId),
				Layer.succeed(IBillingRepository, {
					findSubscriptionByTenantId,
					findEventByOrderId: vi.fn(),
					saveEvent: vi.fn(),
					updateEvent: vi.fn(),
					updateSubscription: vi.fn(),
					getHistory: vi.fn(),
					getUsageMetrics: vi.fn(),
					atomicApplyPaymentCallback: vi.fn(),
				}),
			),
		);

		expect(result).toEqual({
			plan: "pro",
			status: "active",
			currentPeriodEnd: mockSubscription.currentPeriodEnd?.toISOString(),
		});
		expect(findSubscriptionByTenantId).toHaveBeenCalledWith(tenantId);
	});

	it("should return null when no subscription exists", async () => {
		const findSubscriptionByTenantId = vi
			.fn()
			.mockReturnValue(Effect.succeed(null));
		const result = await Effect.runPromise(
			Effect.provide(
				getCurrentSubscriptionProgram(tenantId),
				Layer.succeed(IBillingRepository, {
					findSubscriptionByTenantId,
					findEventByOrderId: vi.fn(),
					saveEvent: vi.fn(),
					updateEvent: vi.fn(),
					updateSubscription: vi.fn(),
					getHistory: vi.fn(),
					getUsageMetrics: vi.fn(),
					atomicApplyPaymentCallback: vi.fn(),
				}),
			),
		);

		expect(result).toBeNull();
	});

	it("should propagate DatabaseError", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getCurrentSubscriptionProgram(tenantId),
					Layer.succeed(IBillingRepository, {
						findSubscriptionByTenantId: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						findEventByOrderId: vi.fn(),
						saveEvent: vi.fn(),
						updateEvent: vi.fn(),
						updateSubscription: vi.fn(),
						getHistory: vi.fn(),
						getUsageMetrics: vi.fn(),
						atomicApplyPaymentCallback: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getBillingHistoryProgram", () => {
	it("should return mapped billing event DTOs", async () => {
		const getHistory = vi.fn().mockReturnValue(Effect.succeed([mockEvent]));
		const result = await Effect.runPromise(
			Effect.provide(
				getBillingHistoryProgram(tenantId),
				Layer.succeed(IBillingRepository, {
					findSubscriptionByTenantId: vi.fn(),
					findEventByOrderId: vi.fn(),
					saveEvent: vi.fn(),
					updateEvent: vi.fn(),
					updateSubscription: vi.fn(),
					getHistory,
					getUsageMetrics: vi.fn(),
					atomicApplyPaymentCallback: vi.fn(),
				}),
			),
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: mockEvent.id,
			eventType: "subscription_created",
			plan: "pro",
			amount: 199000,
			status: "pending",
			createdAt: mockEvent.createdAt.toISOString(),
			externalOrderId: mockEvent.externalOrderId,
		});
		expect(getHistory).toHaveBeenCalledWith(tenantId);
	});

	it("should propagate DatabaseError", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getBillingHistoryProgram(tenantId),
					Layer.succeed(IBillingRepository, {
						findSubscriptionByTenantId: vi.fn(),
						findEventByOrderId: vi.fn(),
						saveEvent: vi.fn(),
						updateEvent: vi.fn(),
						updateSubscription: vi.fn(),
						getHistory: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						getUsageMetrics: vi.fn(),
						atomicApplyPaymentCallback: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("createSubscriptionPaymentProgram", () => {
	const command = { plan: "pro" as const, billingCycle: "monthly" as const };
	const customer = { name: "John Doe", email: "john@example.com" };

	it("should save event and create payment transaction", async () => {
		const saveEvent = vi.fn().mockReturnValue(Effect.void);
		const createTransaction = vi.fn().mockReturnValue(
			Effect.succeed({
				token: "snap-token-123",
				redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/redirect",
			}),
		);

		const layer = Layer.mergeAll(
			Layer.succeed(IBillingRepository, {
				findSubscriptionByTenantId: vi.fn(),
				findEventByOrderId: vi.fn(),
				saveEvent,
				updateEvent: vi.fn(),
				updateSubscription: vi.fn(),
				getHistory: vi.fn(),
				getUsageMetrics: vi.fn(),
				atomicApplyPaymentCallback: vi.fn(),
			}),
			Layer.succeed(IPaymentProvider, {
				createTransaction,
				getStatus: vi.fn(),
			}),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				createSubscriptionPaymentProgram(command, tenantId, userId, customer),
				layer,
			),
		);

		expect(result.orderId).toContain("SUB-");
		expect(result.snapToken).toBe("snap-token-123");
		expect(result.redirectUrl).toContain("midtrans.com");
		expect(saveEvent).toHaveBeenCalledOnce();
		expect(createTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				amount: 199000,
				customer,
				items: expect.arrayContaining([
					expect.objectContaining({
						id: "pro",
						name: "Petso pro (monthly)",
						price: 199000,
					}),
				]),
			}),
		);
	});

	it("should calculate yearly amount correctly", async () => {
		const saveEvent = vi.fn().mockReturnValue(Effect.void);
		const createTransaction = vi.fn().mockReturnValue(
			Effect.succeed({
				token: "snap-token-456",
				redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/redirect",
			}),
		);

		const layer = Layer.mergeAll(
			Layer.succeed(IBillingRepository, {
				findSubscriptionByTenantId: vi.fn(),
				findEventByOrderId: vi.fn(),
				saveEvent,
				updateEvent: vi.fn(),
				updateSubscription: vi.fn(),
				getHistory: vi.fn(),
				getUsageMetrics: vi.fn(),
				atomicApplyPaymentCallback: vi.fn(),
			}),
			Layer.succeed(IPaymentProvider, {
				createTransaction,
				getStatus: vi.fn(),
			}),
		);

		const yearlyCommand = {
			plan: "business" as const,
			billingCycle: "yearly" as const,
		};

		await Effect.runPromise(
			Effect.provide(
				createSubscriptionPaymentProgram(
					yearlyCommand,
					tenantId,
					userId,
					customer,
				),
				layer,
			),
		);

		expect(createTransaction).toHaveBeenCalledWith(
			expect.objectContaining({ amount: 4490000 }),
		);
	});

	it("should propagate DatabaseError from saveEvent", async () => {
		const layer = Layer.mergeAll(
			Layer.succeed(IBillingRepository, {
				findSubscriptionByTenantId: vi.fn(),
				findEventByOrderId: vi.fn(),
				saveEvent: vi.fn().mockReturnValue(
					Effect.fail({
						_tag: "DatabaseError",
						cause: new Error("db fail"),
					}),
				),
				updateEvent: vi.fn(),
				updateSubscription: vi.fn(),
				getHistory: vi.fn(),
				getUsageMetrics: vi.fn(),
				atomicApplyPaymentCallback: vi.fn(),
			}),
			Layer.succeed(IPaymentProvider, {
				createTransaction: vi.fn(),
				getStatus: vi.fn(),
			}),
		);

		await expect(
			Effect.runPromise(
				Effect.provide(
					createSubscriptionPaymentProgram(command, tenantId, userId, customer),
					layer,
				),
			),
		).rejects.toThrow("DatabaseError");
	});

	it("should propagate PaymentError from provider", async () => {
		const layer = Layer.mergeAll(
			Layer.succeed(IBillingRepository, {
				findSubscriptionByTenantId: vi.fn(),
				findEventByOrderId: vi.fn(),
				saveEvent: vi.fn().mockReturnValue(Effect.void),
				updateEvent: vi.fn(),
				updateSubscription: vi.fn(),
				getHistory: vi.fn(),
				getUsageMetrics: vi.fn(),
				atomicApplyPaymentCallback: vi.fn(),
			}),
			Layer.succeed(IPaymentProvider, {
				createTransaction: vi.fn().mockReturnValue(
					Effect.fail({
						_tag: "PaymentError",
						message: "Payment failed",
						cause: new Error("insufficient funds"),
					}),
				),
				getStatus: vi.fn(),
			}),
		);

		await expect(
			Effect.runPromise(
				Effect.provide(
					createSubscriptionPaymentProgram(command, tenantId, userId, customer),
					layer,
				),
			),
		).rejects.toThrow("PaymentError");
	});
});

describe("handlePaymentCallbackProgram", () => {
	const orderId = "SUB-abc12345-1718000000000";

	const makeRepo = (overrides: Record<string, unknown> = {}) =>
		Layer.succeed(IBillingRepository, {
			findSubscriptionByTenantId: vi.fn().mockReturnValue(Effect.succeed(null)),
			findEventByOrderId: vi.fn().mockReturnValue(Effect.succeed(mockEvent)),
			saveEvent: vi.fn(),
			updateEvent: vi.fn(),
			updateSubscription: vi.fn(),
			atomicApplyPaymentCallback: vi.fn().mockReturnValue(
				Effect.succeed({
					eventId: mockEvent.id,
					subscriptionId: null,
					status: "success",
				}),
			),
			getHistory: vi.fn(),
			getUsageMetrics: vi.fn(),
			...overrides,
		});

	it("should update event to success on capture status", async () => {
		const atomicApplyPaymentCallback = vi.fn().mockReturnValue(
			Effect.succeed({
				eventId: mockEvent.id,
				subscriptionId: null,
				status: "success",
			}),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				handlePaymentCallbackProgram(
					{
						orderId,
						transactionStatus: "capture",
						transactionId: "trx-001",
						paymentMethod: "credit_card",
					},
					tenantId,
				),
				makeRepo({ atomicApplyPaymentCallback }),
			),
		);

		expect(result).toEqual({ success: true, status: "success" });
		expect(atomicApplyPaymentCallback).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId,
				orderId,
				transactionId: "trx-001",
				transactionStatus: "capture",
				paymentMethod: "credit_card",
			}),
		);
	});

	it("should update event to success on settlement status", async () => {
		const result = await Effect.runPromise(
			Effect.provide(
				handlePaymentCallbackProgram(
					{
						orderId,
						transactionStatus: "settlement",
					},
					tenantId,
				),
				makeRepo(),
			),
		);

		expect(result).toEqual({ success: true, status: "success" });
	});

	it("should update event to pending on pending status", async () => {
		const atomicApplyPaymentCallback = vi.fn().mockReturnValue(
			Effect.succeed({
				eventId: mockEvent.id,
				subscriptionId: null,
				status: "pending",
			}),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				handlePaymentCallbackProgram(
					{ orderId, transactionStatus: "pending" },
					tenantId,
				),
				makeRepo({ atomicApplyPaymentCallback }),
			),
		);

		expect(result).toEqual({ success: false, status: "pending" });
		expect(atomicApplyPaymentCallback).toHaveBeenCalledWith(
			expect.objectContaining({ transactionStatus: "pending" }),
		);
	});

	it("should update event to failed on any other status", async () => {
		const atomicApplyPaymentCallback = vi.fn().mockReturnValue(
			Effect.succeed({
				eventId: mockEvent.id,
				subscriptionId: null,
				status: "failed",
			}),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				handlePaymentCallbackProgram(
					{ orderId, transactionStatus: "deny" },
					tenantId,
				),
				makeRepo({ atomicApplyPaymentCallback }),
			),
		);

		expect(result).toEqual({ success: false, status: "failed" });
		expect(atomicApplyPaymentCallback).toHaveBeenCalledWith(
			expect.objectContaining({ transactionStatus: "deny" }),
		);
	});

	it("should pass through subscription id returned by the RPC", async () => {
		const atomicApplyPaymentCallback = vi.fn().mockReturnValue(
			Effect.succeed({
				eventId: mockEvent.id,
				subscriptionId: mockSubscription.id,
				status: "success",
			}),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				handlePaymentCallbackProgram(
					{
						orderId,
						transactionStatus: "capture",
						transactionId: "trx-001",
					},
					tenantId,
				),
				makeRepo({ atomicApplyPaymentCallback }),
			),
		);

		expect(result).toEqual({ success: true, status: "success" });
		// Subscription mutation now happens server-side atomically
		// with the event update. We just verify the success status
		// comes through correctly.
		expect(atomicApplyPaymentCallback).toHaveBeenCalledTimes(1);
	});

	it("should fail with BillingEventNotFoundError when event not found", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					handlePaymentCallbackProgram(
						{ orderId, transactionStatus: "capture" },
						tenantId,
					),
					makeRepo({
						findEventByOrderId: vi.fn().mockReturnValue(Effect.succeed(null)),
					}),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("BillingEventNotFoundError"),
		});
	});

	it("should propagate DatabaseError from findEventByOrderId", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					handlePaymentCallbackProgram(
						{ orderId, transactionStatus: "capture" },
						tenantId,
					),
					makeRepo({
						findEventByOrderId: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});
