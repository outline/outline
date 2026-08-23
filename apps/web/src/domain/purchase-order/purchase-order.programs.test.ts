// @vitest-environment node
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createPurchaseOrderProgram,
	getPurchaseOrderByIdProgram,
	getPurchaseOrdersProgram,
	receivePurchaseOrderProgram,
	updatePoStatusProgram,
} from "./purchase-order.programs";
import { IPurchaseOrderRepository } from "./purchase-order.repository";
import type { TCreatePurchaseOrderInput } from "./purchase-order.schemas";
import type {
	TPoItem,
	TPoItemId,
	TPurchaseOrder,
	TPurchaseOrderId,
	TPurchaseOrderWithItems,
} from "./purchase-order.types";

const tenantId = generateId<TTenantId>();
const userId = generateId<TUserId>();

const basePo: TPurchaseOrder = {
	id: generateId<TPurchaseOrderId>(),
	tenantId,
	branchId: null,
	supplierId: generateId(),
	poNumber: "PO-260620-0001",
	status: "sent",
	totalAmount: 100_000,
	notes: null,
	orderDate: new Date(),
	expectedDate: null,
	createdBy: userId,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const basePoItem: TPoItem = {
	id: generateId<TPoItemId>(),
	poId: basePo.id,
	variantId: generateId(),
	qtyOrdered: 10,
	qtyReceived: 0,
	unitCost: 5_000,
	subtotal: 50_000,
};

const basePoWithItems: TPurchaseOrderWithItems = {
	...basePo,
	items: [basePoItem],
};

const receivePoResult = {
	receivingId: generateId(),
	newStatus: "partial",
};

const makeMockPORepo = (overrides?: Record<string, unknown>) => {
	const base = {
		findAll: vi.fn(),
		findById: vi.fn(),
		saveOrderWithItems: vi.fn(() => Effect.void),
		updateOrderStatus: vi.fn(() => Effect.void),
		receivePurchaseOrder: vi.fn(() => Effect.succeed(receivePoResult)),
	};
	return { ...base, ...overrides } as unknown as Parameters<
		typeof IPurchaseOrderRepository.of
	>[0];
};

const provideLayer = (poMock: ReturnType<typeof makeMockPORepo>) =>
	Layer.succeed(IPurchaseOrderRepository, IPurchaseOrderRepository.of(poMock));

describe("PurchaseOrderPrograms", () => {
	describe("getPurchaseOrdersProgram", () => {
		it("should return all purchase orders", async () => {
			const poMock = makeMockPORepo({
				findAll: vi.fn(() => Effect.succeed([basePo])),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					getPurchaseOrdersProgram(tenantId),
					provideLayer(poMock),
				),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.poNumber).toBe("PO-260620-0001");
			expect(poMock.findAll).toHaveBeenCalledWith(tenantId);
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const poMock = makeMockPORepo({
				findAll: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						getPurchaseOrdersProgram(tenantId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("getPurchaseOrderByIdProgram", () => {
		it("should return a PO with items", async () => {
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(basePoWithItems)),
			});

			const result = (await Effect.runPromise(
				Effect.provide(
					getPurchaseOrderByIdProgram(basePo.id, tenantId),
					provideLayer(poMock),
				),
			)) as TPurchaseOrderWithItems;

			expect(result.id).toBe(basePo.id);
			expect(result.items).toHaveLength(1);
		});

		it("should fail with PurchaseOrderNotFoundError when missing", async () => {
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(null)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						getPurchaseOrderByIdProgram(basePo.id, tenantId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("PurchaseOrderNotFoundError"),
			});
		});
	});

	describe("createPurchaseOrderProgram", () => {
		const input: TCreatePurchaseOrderInput = {
			supplierId: generateId(),
			items: [
				{
					variantId: generateId(),
					qtyOrdered: 10,
					unitCost: 5_000,
				},
			],
		};

		it("should create a PO and save it", async () => {
			const poMock = makeMockPORepo({
				saveOrderWithItems: vi.fn(() => Effect.void),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					createPurchaseOrderProgram(input, tenantId, userId),
					provideLayer(poMock),
				),
			);

			expect(result.status).toBe("draft");
			expect(result.items).toHaveLength(1);
			expect(poMock.saveOrderWithItems).toHaveBeenCalledTimes(1);
		});

		it("should propagate DatabaseError on save", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const poMock = makeMockPORepo({
				saveOrderWithItems: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						createPurchaseOrderProgram(input, tenantId, userId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("updatePoStatusProgram", () => {
		it("should update status to partial", async () => {
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(basePoWithItems)),
				updateOrderStatus: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					updatePoStatusProgram(basePo.id, tenantId, "partial"),
					provideLayer(poMock),
				),
			);

			expect(poMock.updateOrderStatus).toHaveBeenCalledWith(
				basePo.id,
				tenantId,
				"partial",
			);
		});

		it("should fail when PO not found", async () => {
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(null)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						updatePoStatusProgram(basePo.id, tenantId, "partial"),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("PurchaseOrderNotFoundError"),
			});
		});

		it("should fail when PO is already received", async () => {
			const receivedPo = {
				...basePoWithItems,
				status: "received" as const,
			};
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(receivedPo)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						updatePoStatusProgram(basePo.id, tenantId, "partial"),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvalidPoStatusError"),
			});
		});

		it("should fail when PO is cancelled", async () => {
			const cancelledPo = {
				...basePoWithItems,
				status: "cancelled" as const,
			};
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(cancelledPo)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						updatePoStatusProgram(basePo.id, tenantId, "draft"),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvalidPoStatusError"),
			});
		});
	});

	describe("receivePurchaseOrderProgram", () => {
		const input = {
			poId: basePo.id,
			notes: "First delivery",
			items: [
				{
					poItemId: basePoItem.id,
					qtyReceived: 5,
					expiryDate: null,
					batchNumber: null,
				},
			],
		};

		it("should call receivePurchaseOrder RPC and return result", async () => {
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(basePoWithItems)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					receivePurchaseOrderProgram(input, tenantId, userId),
					provideLayer(poMock),
				),
			);

			expect(result.receivingId).toBeDefined();
			expect(result.newStatus).toBe("partial");
			expect(poMock.findById).toHaveBeenCalledWith(basePo.id, tenantId);
			expect(poMock.receivePurchaseOrder).toHaveBeenCalledTimes(1);
			const callArgs = (poMock.receivePurchaseOrder as ReturnType<typeof vi.fn>)
				.mock.calls[0];
			expect(callArgs?.[0]?.items).toHaveLength(1);
			expect(callArgs?.[0]?.items?.[0]?.variantId).toBe(basePoItem.variantId);
			expect(callArgs?.[0]?.items?.[0]?.unitCost).toBe(basePoItem.unitCost);
			expect(callArgs?.[1]).toBe(tenantId);
		});

		it("should set status to received when all items fully received", async () => {
			const fullItem: TPoItem = {
				...basePoItem,
				qtyOrdered: 5,
			};
			const poWithFullItem: TPurchaseOrderWithItems = {
				...basePoWithItems,
				items: [fullItem],
			};
			const fullResult = { ...receivePoResult, newStatus: "received" };
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(poWithFullItem)),
				receivePurchaseOrder: vi.fn(() => Effect.succeed(fullResult)),
			});
			const fullInput = {
				poId: basePo.id,
				items: [
					{
						poItemId: fullItem.id,
						qtyReceived: 5,
					},
				],
			};

			const result = await Effect.runPromise(
				Effect.provide(
					receivePurchaseOrderProgram(fullInput, tenantId, userId),
					provideLayer(poMock),
				),
			);

			expect(result.newStatus).toBe("received");
		});

		it("should fail when PO not found", async () => {
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(null)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						receivePurchaseOrderProgram(input, tenantId, userId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("PurchaseOrderNotFoundError"),
			});
		});

		it("should fail when PO is already received", async () => {
			const receivedPo = {
				...basePoWithItems,
				status: "received" as const,
			};
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(receivedPo)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						receivePurchaseOrderProgram(input, tenantId, userId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvalidPoStatusError"),
			});
		});

		it("should fail with OverReceiveError when receiving more than ordered", async () => {
			const overInput = {
				poId: basePo.id,
				items: [
					{
						poItemId: basePoItem.id,
						qtyReceived: 15,
					},
				],
			};

			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(basePoWithItems)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						receivePurchaseOrderProgram(overInput, tenantId, userId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("OverReceiveError"),
			});
		});

		it("should propagate DatabaseError from findById", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						receivePurchaseOrderProgram(input, tenantId, userId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});

		it("should propagate DatabaseError from receivePurchaseOrder RPC", async () => {
			const dbErr = new DatabaseError({ cause: new Error("rpc fail") });
			const poMock = makeMockPORepo({
				findById: vi.fn(() => Effect.succeed(basePoWithItems)),
				receivePurchaseOrder: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						receivePurchaseOrderProgram(input, tenantId, userId),
						provideLayer(poMock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});
});
