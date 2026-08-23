import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { ILoyaltyRepository } from "@/domain/loyalty";
import { IProductRepository } from "@/domain/product";
import { generateId } from "@/shared/utils";
import { OrderAlreadyVoidedError } from "./order.errors";
import { createOrderProgram, voidOrderProgram } from "./order.programs";
import { IOrderRepository } from "./order.repository";

describe("OrderPrograms", () => {
	const tenantId = generateId<string>();
	const userId = generateId<string>();

	it("should orchestrate order creation", async () => {
		const productId = generateId<string>();

		// Mock Repositories
		const mockOrderRepo = {
			saveFull: vi.fn(() => Effect.succeed(undefined)),
		};

		const orderRepoLayer = Layer.succeed(
			IOrderRepository,
			IOrderRepository.of(
				mockOrderRepo as unknown as Parameters<typeof IOrderRepository.of>[0],
			),
		);

		// Product Repo is injected but not used because we removed stock verification from createOrderProgram
		const mockProductRepo = {};
		const productRepoLayer = Layer.succeed(
			IProductRepository,
			IProductRepository.of(
				mockProductRepo as Parameters<typeof IProductRepository.of>[0],
			),
		);

		// createOrderProgram now also touches ILoyaltyRepository (voucher
		// re-validation + apply). Provide a no-op mock so the test stays
		// voucher-less.
		const mockLoyaltyRepo = {
			findPromoCodeByCode: vi.fn(() => Effect.succeed(null)),
			getCustomerPromoUsage: vi.fn(() => Effect.succeed([])),
			savePromoUsage: vi.fn(() => Effect.succeed(undefined)),
			incrementPromoUsage: vi.fn(() => Effect.succeed(undefined)),
		};
		const loyaltyRepoLayer = Layer.succeed(
			ILoyaltyRepository,
			mockLoyaltyRepo as unknown as Parameters<typeof ILoyaltyRepository.of>[0],
		);

		const combinedLayer = Layer.merge(
			Layer.merge(orderRepoLayer, productRepoLayer),
			loyaltyRepoLayer,
		);

		const command = {
			branchId: generateId(),
			paymentMethod: "cash" as const,
			items: [{ productId, quantity: 2, priceAtTime: 100 }],
		};

		const program = createOrderProgram(
			command as import("./order.schemas").CreateOrderCommand,
			tenantId as import("@/shared/types/common.types").TTenantId,
			userId as import("@/shared/types/common.types").TUserId,
		).pipe(Effect.provide(combinedLayer));

		const result = await Effect.runPromise(program);

		expect(result.totalAmount).toBe(200);
		expect(mockOrderRepo.saveFull).toHaveBeenCalled();
	});

	it("should void an order through the repository", async () => {
		const orderId = generateId<string>();
		const mockOrderRepo = {
			voidOrder: vi.fn(() => Effect.succeed(undefined)),
		};
		const orderRepoLayer = Layer.succeed(
			IOrderRepository,
			IOrderRepository.of(
				mockOrderRepo as unknown as Parameters<typeof IOrderRepository.of>[0],
			),
		);

		const program = voidOrderProgram(
			{ orderId, reason: "salah input" },
			tenantId as import("@/shared/types/common.types").TTenantId,
			userId as import("@/shared/types/common.types").TUserId,
		).pipe(Effect.provide(orderRepoLayer));

		await Effect.runPromise(program);

		expect(mockOrderRepo.voidOrder).toHaveBeenCalledWith(
			orderId,
			tenantId,
			userId,
			"salah input",
		);
	});

	it("should propagate OrderAlreadyVoidedError from the repository", async () => {
		const orderId = generateId<string>();
		const mockOrderRepo = {
			voidOrder: vi.fn(() =>
				Effect.fail(new OrderAlreadyVoidedError({ id: orderId })),
			),
		};
		const orderRepoLayer = Layer.succeed(
			IOrderRepository,
			IOrderRepository.of(
				mockOrderRepo as unknown as Parameters<typeof IOrderRepository.of>[0],
			),
		);

		const program = voidOrderProgram(
			{ orderId, reason: "lagi" },
			tenantId as import("@/shared/types/common.types").TTenantId,
			userId as import("@/shared/types/common.types").TUserId,
		).pipe(Effect.provide(orderRepoLayer));

		const error = await Effect.runPromise(Effect.flip(program));

		expect(error._tag).toBe("OrderAlreadyVoidedError");
	});
});
