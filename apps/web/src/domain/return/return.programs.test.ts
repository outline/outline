// @vitest-environment node
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TOrderId, TOrderItemId } from "@/domain/order";
import { IOrderRepository } from "@/domain/order";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { getReturnsProgram, processReturnProgram } from "./return.programs";
import { IReturnRepository } from "./return.repository";
import type { TReturnId } from "./return.types";

const tenantId = generateId() as TTenantId;
const userId = generateId() as TUserId;
const orderId = generateId() as TOrderId;
const orderItemId = generateId() as TOrderItemId;
const returnId = generateId() as TReturnId;

const mockOrder = {
	id: orderId,
	tenantId,
	branchId: generateId(),
	customerId: null,
	totalAmount: 100000,
	paymentMethod: "cash" as const,
	status: "completed" as const,
	discountType: null,
	discountValue: 0,
	discountAmount: 0,
	voidedAt: null,
	voidedBy: null,
	voidedReason: null,
	createdBy: userId,
	createdAt: new Date(),
	items: [
		{
			id: orderItemId,
			orderId,
			productId: generateId(),
			variantId: generateId(),
			quantity: 5,
			priceAtTime: 20000,
			discountType: null as string | null,
			discountValue: 0,
			discountAmount: 0,
		},
	],
};

describe("getReturnsProgram", () => {
	it("calls repo.findAll and returns results", async () => {
		const mockReturns = [
			{
				id: "ret-1" as TReturnId,
				tenantId,
				orderId,
				status: "completed" as const,
				refundAmount: 50000,
				reason: null,
				refundMethod: null,
				createdBy: userId,
				createdAt: new Date(),
				updatedAt: new Date(),
				items: [],
			},
		];

		const findAll = vi.fn().mockReturnValue(Effect.succeed(mockReturns));
		const processReturn = vi.fn().mockReturnValue(Effect.succeed(returnId));

		const TestLayer = Layer.succeed(IReturnRepository, {
			findAll,
			processReturn,
		});

		const result = await Effect.runPromise(
			Effect.provide(getReturnsProgram(tenantId), TestLayer),
		);

		expect(result).toHaveLength(1);
		expect(findAll).toHaveBeenCalledWith(tenantId);
	});

	it("propagates DatabaseError", async () => {
		const TestLayer = Layer.succeed(IReturnRepository, {
			findAll: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
			processReturn: vi.fn().mockReturnValue(Effect.succeed(returnId)),
		});

		await expect(
			Effect.runPromise(Effect.provide(getReturnsProgram(tenantId), TestLayer)),
		).rejects.toThrow("DatabaseError");
	});
});

describe("processReturnProgram", () => {
	const validInput = {
		orderId,
		refundAmount: 50000,
		items: [{ orderItemId, qty: 2, isDamaged: false }],
	};

	it("processes a valid return via atomic RPC", async () => {
		const processReturn = vi.fn().mockReturnValue(Effect.succeed(returnId));
		const findById = vi.fn().mockReturnValue(Effect.succeed(mockOrder));

		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn,
			}),
			Layer.succeed(IOrderRepository, {
				findById,
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				processReturnProgram(validInput, tenantId, userId),
				TestLayer,
			),
		);

		expect(findById).toHaveBeenCalledWith(orderId, tenantId);
		expect(processReturn).toHaveBeenCalled();
		expect(result).toBe(returnId);
	});

	it("does not restock damaged items (delegated to RPC)", async () => {
		const damagedInput = {
			orderId,
			refundAmount: 50000,
			items: [{ orderItemId, qty: 2, isDamaged: true }],
		};

		const processReturn = vi.fn().mockReturnValue(Effect.succeed(returnId));

		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn,
			}),
			Layer.succeed(IOrderRepository, {
				findById: vi.fn().mockReturnValue(Effect.succeed(mockOrder)),
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		await Effect.runPromise(
			Effect.provide(
				processReturnProgram(damagedInput, tenantId, userId),
				TestLayer,
			),
		);

		expect(processReturn).toHaveBeenCalled();
	});

	it("handles items without variantId (delegated to RPC)", async () => {
		const noVariantOrderItemId = generateId() as TOrderItemId;
		const noVariantOrder = {
			...mockOrder,
			items: [
				{
					id: noVariantOrderItemId,
					orderId,
					productId: generateId(),
					variantId: null,
					quantity: 5,
					priceAtTime: 20000,
					discountType: null as string | null,
					discountValue: 0,
					discountAmount: 0,
				},
			],
		};
		const input = {
			orderId,
			refundAmount: 50000,
			items: [{ orderItemId: noVariantOrderItemId, qty: 2, isDamaged: false }],
		};

		const processReturn = vi.fn().mockReturnValue(Effect.succeed(returnId));

		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn,
			}),
			Layer.succeed(IOrderRepository, {
				findById: vi.fn().mockReturnValue(Effect.succeed(noVariantOrder)),
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		await Effect.runPromise(
			Effect.provide(processReturnProgram(input, tenantId, userId), TestLayer),
		);

		expect(processReturn).toHaveBeenCalled();
	});

	it("fails when order is not found", async () => {
		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn: vi.fn().mockReturnValue(Effect.succeed(returnId)),
			}),
			Layer.succeed(IOrderRepository, {
				findById: vi.fn().mockReturnValue(Effect.succeed(null)),
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		await expect(
			Effect.runPromise(
				Effect.provide(
					processReturnProgram(validInput, tenantId, userId),
					TestLayer,
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("OrderNotFoundError"),
		});
	});

	it("fails when return quantity exceeds ordered quantity", async () => {
		const invalidInput = {
			orderId,
			refundAmount: 50000,
			items: [{ orderItemId, qty: 10, isDamaged: false }],
		};

		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn: vi.fn().mockReturnValue(Effect.succeed(returnId)),
			}),
			Layer.succeed(IOrderRepository, {
				findById: vi.fn().mockReturnValue(Effect.succeed(mockOrder)),
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		await expect(
			Effect.runPromise(
				Effect.provide(
					processReturnProgram(invalidInput, tenantId, userId),
					TestLayer,
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("InvalidReturnQuantityError"),
		});
	});

	it("propagates DatabaseError from order repo", async () => {
		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn: vi.fn().mockReturnValue(Effect.succeed(returnId)),
			}),
			Layer.succeed(IOrderRepository, {
				findById: vi.fn().mockReturnValue(
					Effect.fail({
						_tag: "DatabaseError",
						cause: new Error("db error"),
					}),
				),
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		await expect(
			Effect.runPromise(
				Effect.provide(
					processReturnProgram(validInput, tenantId, userId),
					TestLayer,
				),
			),
		).rejects.toThrow("DatabaseError");
	});

	it("propagates DatabaseError from processReturn RPC", async () => {
		const TestLayer = Layer.mergeAll(
			Layer.succeed(IReturnRepository, {
				findAll: vi.fn().mockReturnValue(Effect.succeed([])),
				processReturn: vi.fn().mockReturnValue(
					Effect.fail({
						_tag: "DatabaseError",
						cause: new Error("rpc error"),
					}),
				),
			}),
			Layer.succeed(IOrderRepository, {
				findById: vi.fn().mockReturnValue(Effect.succeed(mockOrder)),
				findAll: vi.fn(),
				findDrafts: vi.fn(),
				saveFull: vi.fn(),
				updateStatus: vi.fn(),
				findByCustomerId: vi.fn(),
				voidOrder: vi.fn(),
				getProductFrequency: vi.fn(),
			}),
		);

		await expect(
			Effect.runPromise(
				Effect.provide(
					processReturnProgram(validInput, tenantId, userId),
					TestLayer,
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});
