import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { createReturnEntity } from "./return.module";

describe("ReturnModule", () => {
	describe("createReturnEntity", () => {
		it("should create a valid return with items", () => {
			const input = {
				orderId: generateId(),
				refundAmount: 50000,
				items: [{ orderItemId: generateId(), qty: 2, isDamaged: false }],
			};
			const tenantId = generateId() as TTenantId;
			const userId = generateId() as TUserId;

			const result = Effect.runSync(
				createReturnEntity(input, tenantId, userId),
			);

			expect(result.id).toBeDefined();
			expect(result.tenantId).toBe(tenantId);
			expect(result.orderId).toBe(input.orderId);
			expect(result.status).toBe("completed");
			expect(result.refundAmount).toBe(50000);
			expect(result.createdBy).toBe(userId);
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
			expect(result.items).toHaveLength(1);
			expect(result.items[0]?.qty).toBe(2);
			expect(result.items[0]?.isDamaged).toBe(false);
			expect(result.items[0]?.returnId).toBe(result.id);
		});

		it("should propagate reason and refundMethod when provided", () => {
			const input = {
				orderId: generateId(),
				refundMethod: "transfer",
				refundAmount: 25000,
				reason: "Product defective",
				items: [
					{
						orderItemId: generateId(),
						qty: 1,
						reason: "Broken",
						isDamaged: true,
					},
				],
			};
			const result = Effect.runSync(
				createReturnEntity(input, "tenant-1" as TTenantId, "user-1" as TUserId),
			);

			expect(result.reason).toBe("Product defective");
			expect(result.refundMethod).toBe("transfer");
			expect(result.items[0]?.reason).toBe("Broken");
			expect(result.items[0]?.isDamaged).toBe(true);
		});

		it("should default optional fields to null when not provided", () => {
			const input = {
				orderId: generateId(),
				refundAmount: 0,
				items: [{ orderItemId: generateId(), qty: 1, isDamaged: false }],
			};
			const result = Effect.runSync(
				createReturnEntity(input, "tenant-1" as TTenantId, "user-1" as TUserId),
			);

			expect(result.reason).toBeNull();
			expect(result.refundMethod).toBeNull();
			expect(result.items[0]?.reason).toBeNull();
		});
	});
});
