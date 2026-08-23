import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createPurchaseOrderEntity,
	createReceivingEntity,
} from "./purchase-order.module";
import type { TReceivePurchaseOrderInput } from "./purchase-order.schemas";
import type { TPoItemId, TPurchaseOrderId } from "./purchase-order.types";

const tenantId = generateId<TTenantId>();
const userId = generateId<TUserId>();

describe("PurchaseOrderModule", () => {
	describe("createPurchaseOrderEntity", () => {
		const input = {
			supplierId: generateId(),
			notes: "Urgent order",
			expectedDate: new Date("2026-07-20"),
			items: [
				{
					variantId: generateId(),
					qtyOrdered: 10,
					unitCost: 5_000,
				},
				{
					variantId: generateId(),
					qtyOrdered: 5,
					unitCost: 10_000,
				},
			],
		};

		it("should create a PO with items", () => {
			const result = Effect.runSync(
				createPurchaseOrderEntity(input, tenantId, userId),
			);

			expect(result.status).toBe("draft");
			expect(result.supplierId).toBe(input.supplierId);
			expect(result.poNumber).toMatch(/^PO-\d{6}-\d{4}$/);
			expect(result.createdBy).toBe(userId);
			expect(result.tenantId).toBe(tenantId);
			expect(result.orderDate).toBeInstanceOf(Date);
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it("should calculate total amount correctly", () => {
			const result = Effect.runSync(
				createPurchaseOrderEntity(input, tenantId, userId),
			);

			// (10 * 5000) + (5 * 10000) = 50000 + 50000 = 100000
			expect(result.totalAmount).toBe(100_000);
		});

		it("should create PO items with correct quantities", () => {
			const result = Effect.runSync(
				createPurchaseOrderEntity(input, tenantId, userId),
			);

			expect(result.items).toHaveLength(2);
			expect(result.items[0]?.qtyOrdered).toBe(10);
			expect(result.items[0]?.unitCost).toBe(5_000);
			expect(result.items[0]?.qtyReceived).toBe(0);
			expect(result.items[1]?.qtyOrdered).toBe(5);
			expect(result.items[1]?.unitCost).toBe(10_000);
		});

		it("should generate unique IDs for PO and items", () => {
			const result = Effect.runSync(
				createPurchaseOrderEntity(input, tenantId, userId),
			);

			expect(result.id).toBeDefined();
			expect(result.items[0]?.id).toBeDefined();
			expect(result.items[0]?.poId).toBe(result.id);
		});

		it("should handle undefined branchId and notes", () => {
			const minimalInput = {
				supplierId: generateId(),
				items: [
					{
						variantId: generateId(),
						qtyOrdered: 1,
						unitCost: 1_000,
					},
				],
			};
			const result = Effect.runSync(
				createPurchaseOrderEntity(minimalInput, tenantId, userId),
			);

			expect(result.branchId).toBeUndefined();
			expect(result.expectedDate).toBeNull();
			expect(result.notes).toBeNull();
		});
	});

	describe("createReceivingEntity", () => {
		const poId = generateId<TPurchaseOrderId>();
		const poItemId = generateId<TPoItemId>();

		const input: TReceivePurchaseOrderInput = {
			poId,
			notes: "Partial delivery",
			items: [
				{
					poItemId,
					qtyReceived: 5,
					expiryDate: new Date("2027-01-01"),
					batchNumber: "BATCH-001",
				},
			],
		};

		it("should create receiving entity with items", () => {
			const result = Effect.runSync(createReceivingEntity(poId, input, userId));

			expect(result.receiving.poId).toBe(poId);
			expect(result.receiving.receivedBy).toBe(userId);
			expect(result.receiving.receivedDate).toBeInstanceOf(Date);
			expect(result.receiving.notes).toBe("Partial delivery");
		});

		it("should create receiving items correctly", () => {
			const result = Effect.runSync(createReceivingEntity(poId, input, userId));

			expect(result.items).toHaveLength(1);
			expect(result.items[0]?.poItemId).toBe(poItemId);
			expect(result.items[0]?.qtyReceived).toBe(5);
			expect(result.items[0]?.batchNumber).toBe("BATCH-001");
			expect(result.items[0]?.expiryDate).toBeInstanceOf(Date);
		});

		it("should link receiving items to the receiving", () => {
			const result = Effect.runSync(createReceivingEntity(poId, input, userId));

			expect(result.items[0]?.receivingId).toBe(result.receiving.id);
		});

		it("should handle null expiryDate and batchNumber", () => {
			const minimalInput: TReceivePurchaseOrderInput = {
				poId,
				items: [
					{
						poItemId: generateId<TPoItemId>(),
						qtyReceived: 3,
					},
				],
			};

			const result = Effect.runSync(
				createReceivingEntity(poId, minimalInput, userId),
			);

			expect(result.items[0]?.expiryDate).toBeNull();
			expect(result.items[0]?.batchNumber).toBeNull();
			expect(result.receiving.notes).toBeNull();
		});
	});
});
