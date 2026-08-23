import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { generateId } from "@/shared/utils";
import { ProductModule } from "./product.module";

describe("ProductModule", () => {
	describe("create", () => {
		it("should create a valid product", () => {
			const props = {
				name: "Test Product",
				category: "Food",
				description: "Delicious pet food",
				brand: "PetCo",
				imageUrl: null,
				hasVariants: false,
				isActive: true,
				tenantId: generateId(),
			} as import("./product.types").TProductProps;

			const program = ProductModule.create(props);
			const result = Effect.runSync(program);

			expect(result.name).toBe(props.name);
			expect(result.id).toBeDefined();
			expect(result.createdAt).toBeInstanceOf(Date);
		});
	});

	describe("createVariant", () => {
		it("should fail if price is negative", () => {
			const props = {
				name: "Test Variant",
				price: -100,
				stock: 10,
				sku: "TP-001",
				tenantId: generateId(),
				productId: generateId(),
			} as import("./product.types").TProductVariantProps;

			const program = ProductModule.createVariant(props);
			const result = Effect.runSyncExit(program);

			expect(result._tag).toBe("Failure");
		});
	});

	describe("stock status", () => {
		it("should identify low stock", () => {
			const product = {
				stock: 3,
				lowStockThreshold: 5,
			} as import("./product.types").TProductVariant;
			expect(ProductModule.isLowStock(product)).toBe(true);
		});

		it("should identify out of stock", () => {
			const product = { stock: 0 } as import("./product.types").TProductVariant;
			expect(ProductModule.isOutOfStock(product)).toBe(true);
		});
	});
});
