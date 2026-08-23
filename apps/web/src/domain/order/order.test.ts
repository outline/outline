import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { OrderModule } from "./order.module";

describe("OrderModule", () => {
	const tenantId = generateId<string>() as TTenantId;
	const branchId =
		generateId<string>() as import("@/shared/types/common.types").TBranchId;
	const userId = generateId<string>() as TUserId;

	describe("create", () => {
		it("should calculate total amount correctly", () => {
			const items = [
				{
					productId:
						generateId<string>() as import("@/domain/product/product.types").TProductId,
					quantity: 2,
					priceAtTime: 50000,
				},
				{
					productId:
						generateId<string>() as import("@/domain/product/product.types").TProductId,
					quantity: 1,
					priceAtTime: 25000,
				},
			];

			const order = OrderModule.create(
				tenantId,
				branchId,
				userId,
				items as unknown as Parameters<typeof OrderModule.create>[3],
			);

			expect(order.totalAmount).toBe(125000);
			expect(order.items).toHaveLength(2);
		});
	});

	describe("void", () => {
		it("should mark order as voided", () => {
			const order = { id: "ord-1", voidedAt: null } as unknown as Parameters<
				typeof OrderModule.void
			>[0];
			const program = OrderModule.void(order, userId, "Mistake");
			const result = Effect.runSync(program);

			expect(result.voidedAt).toBeInstanceOf(Date);
			expect(result.voidedReason).toBe("Mistake");
		});

		it("should fail if already voided", () => {
			const order = {
				id: "ord-1",
				voidedBy: "user-1" as TUserId,
				voidedAt: new Date(),
			} as unknown as Parameters<typeof OrderModule.void>[0];
			const program = OrderModule.void(order, userId, "Mistake");
			const result = Effect.runSyncExit(program);

			expect(result._tag).toBe("Failure");
		});

		it("should set status to voided", () => {
			const order = {
				id: "ord-1",
				status: "completed",
				voidedAt: null,
			} as unknown as Parameters<typeof OrderModule.void>[0];

			const result = Effect.runSync(OrderModule.void(order, userId, "Mistake"));

			expect(result.status).toBe("voided");
		});

		it("should fail when order status is already voided", () => {
			const order = {
				id: "ord-1",
				status: "voided",
				voidedAt: null,
			} as unknown as Parameters<typeof OrderModule.void>[0];

			const exit = Effect.runSyncExit(OrderModule.void(order, userId, "again"));

			expect(exit._tag).toBe("Failure");
		});
	});
});
