import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { generateId } from "@/shared/utils";
import { LoyaltyModule } from "./loyalty.module";
import type {
	TCustomerLoyalty,
	TLoyaltyConfig,
	TLoyaltyTier,
} from "./loyalty.types";

const makeConfig = (overrides?: Partial<TLoyaltyConfig>): TLoyaltyConfig => ({
	businessId: generateId(),
	pointsPerRupiah: 0.01,
	pointsExpiryDays: 365,
	minRedeemPoints: 100,
	isActive: true,
	...overrides,
});

const makeCustomer = (
	overrides?: Partial<TCustomerLoyalty>,
): TCustomerLoyalty => ({
	id: generateId(),
	tenantId: generateId(),
	customerName: "Budi",
	customerPhone: "08123456789",
	totalPoints: 500,
	currentTierId: null,
	...overrides,
});

describe("LoyaltyModule", () => {
	describe("calculatePoints", () => {
		it("should calculate points from amount and config rate", () => {
			const config = makeConfig({ pointsPerRupiah: 0.01 });
			const points = LoyaltyModule.calculatePoints(100_000, config);
			expect(points).toBe(1000);
		});

		it("should handle zero amount", () => {
			const config = makeConfig({ pointsPerRupiah: 0.01 });
			const points = LoyaltyModule.calculatePoints(0, config);
			expect(points).toBe(0);
		});

		it("should floor fractional points", () => {
			const config = makeConfig({ pointsPerRupiah: 0.015 });
			const points = LoyaltyModule.calculatePoints(1000, config);
			expect(points).toBe(15);
		});
	});

	describe("validateRedemption", () => {
		it("should return 0 if loyalty config is inactive", () => {
			const config = makeConfig({ isActive: false });
			const customer = makeCustomer({ totalPoints: 500 });
			const result = Effect.runSync(
				LoyaltyModule.validateRedemption(customer, 200, config),
			);
			expect(result).toBe(0);
		});

		it("should return 0 if points below minRedeemPoints", () => {
			const config = makeConfig({ minRedeemPoints: 100 });
			const customer = makeCustomer({ totalPoints: 500 });
			const result = Effect.runSync(
				LoyaltyModule.validateRedemption(customer, 50, config),
			);
			expect(result).toBe(0);
		});

		it("should return 0 if customer has insufficient points", () => {
			const config = makeConfig({ minRedeemPoints: 100 });
			const customer = makeCustomer({ totalPoints: 200 });
			const result = Effect.runSync(
				LoyaltyModule.validateRedemption(customer, 300, config),
			);
			expect(result).toBe(0);
		});

		it("should return remaining points after valid redemption", () => {
			const config = makeConfig({ minRedeemPoints: 100 });
			const customer = makeCustomer({ totalPoints: 500 });
			const result = Effect.runSync(
				LoyaltyModule.validateRedemption(customer, 200, config),
			);
			expect(result).toBe(300);
		});
	});

	describe("evaluateTier", () => {
		const tiers: readonly TLoyaltyTier[] = [
			{
				id: generateId(),
				tenantId: generateId(),
				name: "Silver",
				minPoints: 0,
				discountPercent: 5,
				benefits: ["Basic"],
			},
			{
				id: generateId(),
				tenantId: generateId(),
				name: "Gold",
				minPoints: 500,
				discountPercent: 10,
				benefits: ["Priority"],
			},
			{
				id: generateId(),
				tenantId: generateId(),
				name: "Platinum",
				minPoints: 1000,
				discountPercent: 15,
				benefits: ["VIP"],
			},
		];

		it("should return null when no tiers exist", () => {
			const customer = makeCustomer({ totalPoints: 500 });
			const result = LoyaltyModule.evaluateTier(customer, []);
			expect(result).toBeNull();
		});

		it("should return the highest eligible tier", () => {
			const customer = makeCustomer({ totalPoints: 1500 });
			const result = LoyaltyModule.evaluateTier(customer, tiers);
			expect(result?.name).toBe("Platinum");
		});

		it("should return the first (lowest) tier when barely qualifying", () => {
			const customer = makeCustomer({ totalPoints: 100 });
			const result = LoyaltyModule.evaluateTier(customer, tiers);
			expect(result?.name).toBe("Silver");
		});

		it("should return null when customer has negative points", () => {
			const customer = makeCustomer({ totalPoints: -10 });
			const result = LoyaltyModule.evaluateTier(customer, tiers);
			expect(result).toBeNull();
		});
	});

	describe("createPointsTransaction", () => {
		it("should create an earn transaction with correct fields", () => {
			const customerLoyaltyId = generateId();
			const tenantId = generateId();
			const txn = LoyaltyModule.createPointsTransaction({
				customerLoyaltyId,
				type: "earn",
				points: 100,
				tenantId,
				description: "Points from order",
				orderId: "order-1",
			});

			expect(txn.id).toBeDefined();
			expect(txn.customerLoyaltyId).toBe(customerLoyaltyId);
			expect(txn.type).toBe("earn");
			expect(txn.points).toBe(100);
			expect(txn.description).toBe("Points from order");
			expect(txn.orderId).toBe("order-1");
			expect(txn.createdAt).toBeInstanceOf(Date);
		});

		it("should handle null orderId and empty description", () => {
			const customerLoyaltyId = generateId();
			const tenantId = generateId();
			const txn = LoyaltyModule.createPointsTransaction({
				customerLoyaltyId,
				type: "redeem",
				points: 50,
				tenantId,
			});

			expect(txn.orderId).toBeNull();
			expect(txn.description).toBe("");
		});

		it("should create a redeem transaction", () => {
			const txn = LoyaltyModule.createPointsTransaction({
				customerLoyaltyId: generateId(),
				type: "redeem",
				points: 200,
				tenantId: generateId(),
			});

			expect(txn.type).toBe("redeem");
			expect(txn.points).toBe(200);
		});
	});

	describe("reconstitute", () => {
		it("should return a shallow copy of the object", () => {
			const obj = { foo: "bar", num: 42 };
			const result = LoyaltyModule.reconstitute(obj);
			expect(result).toEqual(obj);
			expect(result).not.toBe(obj);
		});
	});
});
