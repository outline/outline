import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	earnPointsProgram,
	evaluateTierProgram,
	getLoyaltyConfigProgram,
	redeemPointsProgram,
	updateLoyaltyConfigProgram,
} from "./loyalty.programs";
import { ILoyaltyRepository } from "./loyalty.repository";
import type {
	EarnPointsCommand,
	RedeemPointsCommand,
	UpdateLoyaltyConfigCommand,
} from "./loyalty.schemas";
import type {
	TCustomerLoyalty,
	TLoyaltyConfig,
	TLoyaltyTier,
} from "./loyalty.types";

const tenantId = generateId<TTenantId>();

const baseConfig: TLoyaltyConfig = {
	businessId: tenantId,
	pointsPerRupiah: 0.01,
	pointsExpiryDays: 365,
	minRedeemPoints: 100,
	isActive: true,
};

const baseCustomer: TCustomerLoyalty = {
	id: generateId(),
	tenantId,
	customerName: "Budi",
	customerPhone: "08123456789",
	totalPoints: 500,
	currentTierId: null,
};

const baseTiers: readonly TLoyaltyTier[] = [
	{
		id: generateId(),
		tenantId,
		name: "Silver",
		minPoints: 0,
		discountPercent: 5,
		benefits: ["Basic"],
	},
	{
		id: generateId(),
		tenantId,
		name: "Gold",
		minPoints: 500,
		discountPercent: 10,
		benefits: ["Priority"],
	},
];

const makeMockRepo = (overrides?: Record<string, unknown>) => {
	const base = {
		getConfig: vi.fn(),
		getTiers: vi.fn(),
		findCustomerByPhone: vi.fn(),
		findCustomerById: vi.fn(),
		updateConfig: vi.fn(() => Effect.void),
		updateCustomerPoints: vi.fn(() => Effect.void),
		savePointsTransaction: vi.fn(() => Effect.void),
		getPointsTransactions: vi.fn(),
		atomicEarnPoints: vi.fn(),
		atomicRedeemPoints: vi.fn(),
	};
	return { ...base, ...overrides } as unknown as Parameters<
		typeof ILoyaltyRepository.of
	>[0];
};

const provideRepo = (mock: ReturnType<typeof makeMockRepo>) =>
	Layer.succeed(ILoyaltyRepository, ILoyaltyRepository.of(mock));

describe("LoyaltyPrograms", () => {
	describe("getLoyaltyConfigProgram", () => {
		it("should return existing config and tiers", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				getTiers: vi.fn(() => Effect.succeed(baseTiers)),
			});

			const result = await Effect.runPromise(
				Effect.provide(getLoyaltyConfigProgram(tenantId), provideRepo(mock)),
			);

			expect(result.config.isActive).toBe(true);
			expect(result.config.pointsPerRupiah).toBe(0.01);
			expect(result.tiers).toHaveLength(2);
			expect(mock.getConfig).toHaveBeenCalledWith(tenantId);
		});

		it("should return default config when no config exists", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(null)),
				getTiers: vi.fn(() => Effect.succeed([])),
			});

			const result = await Effect.runPromise(
				Effect.provide(getLoyaltyConfigProgram(tenantId), provideRepo(mock)),
			);

			expect(result.config.isActive).toBe(true);
			expect(result.config.pointsPerRupiah).toBe(0.01);
			expect(result.tiers).toHaveLength(0);
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({
				cause: new Error("connection failed"),
			});
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(getLoyaltyConfigProgram(tenantId), provideRepo(mock)),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("updateLoyaltyConfigProgram", () => {
		const command: UpdateLoyaltyConfigCommand = {
			pointsPerRupiah: 0.02,
			pointsExpiryDays: 180,
			minRedeemPoints: 50,
			isActive: false,
		};

		it("should update config successfully", async () => {
			const mock = makeMockRepo({
				updateConfig: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					updateLoyaltyConfigProgram(command, tenantId),
					provideRepo(mock),
				),
			);

			expect(mock.updateConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					businessId: tenantId,
					pointsPerRupiah: 0.02,
				}),
			);
		});
	});

	describe("earnPointsProgram", () => {
		const command: EarnPointsCommand = {
			customerId: baseCustomer.id,
			orderId: "order-123",
			amount: 200_000,
			description: "Points from order",
		};

		it("should earn points and update totals", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				findCustomerById: vi.fn(() => Effect.succeed(baseCustomer)),
				atomicEarnPoints: vi.fn(() => Effect.succeed(2500)),
			});

			const result = await Effect.runPromise(
				Effect.provide(earnPointsProgram(command, tenantId), provideRepo(mock)),
			);

			expect(result.pointsEarned).toBe(2000); // 200000 * 0.01
			expect(result.newTotal).toBe(2500); // 500 + 2000
			expect(mock.atomicEarnPoints).toHaveBeenCalledTimes(1);
			expect(mock.atomicEarnPoints).toHaveBeenCalledWith(
				expect.objectContaining({
					tenantId,
					customerLoyaltyId: baseCustomer.id,
					points: 2000,
				}),
			);
			// Old two-call pattern should not be used anymore
			expect(mock.savePointsTransaction).not.toHaveBeenCalled();
			expect(mock.updateCustomerPoints).not.toHaveBeenCalled();
		});

		it("should return 0 when config is inactive", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() =>
					Effect.succeed({ ...baseConfig, isActive: false }),
				),
			});

			const result = await Effect.runPromise(
				Effect.provide(earnPointsProgram(command, tenantId), provideRepo(mock)),
			);

			expect(result.pointsEarned).toBe(0);
			expect(result.newTotal).toBe(0);
			expect(mock.findCustomerById).not.toHaveBeenCalled();
		});

		it("should return 0 when customer not found", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				findCustomerById: vi.fn(() => Effect.succeed(null)),
			});

			const result = await Effect.runPromise(
				Effect.provide(earnPointsProgram(command, tenantId), provideRepo(mock)),
			);

			expect(result.pointsEarned).toBe(0);
			expect(result.newTotal).toBe(0);
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						earnPointsProgram(command, tenantId),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("redeemPointsProgram", () => {
		const command: RedeemPointsCommand = {
			customerId: baseCustomer.id,
			points: 200,
			orderId: "order-456",
			description: "Points redeemed",
		};

		it("should redeem points successfully", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				findCustomerById: vi.fn(() => Effect.succeed(baseCustomer)),
				atomicRedeemPoints: vi.fn(() => Effect.succeed(300)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					redeemPointsProgram(command, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.pointsRedeemed).toBe(200);
			expect(result.newTotal).toBe(300);
			expect(mock.atomicRedeemPoints).toHaveBeenCalledTimes(1);
			expect(mock.atomicRedeemPoints).toHaveBeenCalledWith(
				expect.objectContaining({
					tenantId,
					customerLoyaltyId: baseCustomer.id,
					points: 200,
				}),
			);
			expect(mock.savePointsTransaction).not.toHaveBeenCalled();
			expect(mock.updateCustomerPoints).not.toHaveBeenCalled();
		});

		it("should return 0 when config is inactive", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() =>
					Effect.succeed({ ...baseConfig, isActive: false }),
				),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					redeemPointsProgram(command, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.pointsRedeemed).toBe(0);
			expect(result.newTotal).toBe(0);
		});

		it("should return 0 when customer not found", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				findCustomerById: vi.fn(() => Effect.succeed(null)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					redeemPointsProgram(command, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.pointsRedeemed).toBe(0);
			expect(result.newTotal).toBe(0);
		});

		it("should redeem available balance when customer has insufficient points", async () => {
			const customer = { ...baseCustomer, totalPoints: 50 };
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				findCustomerById: vi.fn(() => Effect.succeed(customer)),
				atomicRedeemPoints: vi.fn(() => Effect.succeed(0)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					redeemPointsProgram({ ...command, points: 200 }, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.pointsRedeemed).toBe(50);
			expect(result.newTotal).toBe(0);
		});
	});

	describe("evaluateTierProgram", () => {
		const customerId = baseCustomer.id;

		it("should detect tier upgrade", async () => {
			const customer = { ...baseCustomer, totalPoints: 1000 };
			const mock = makeMockRepo({
				findCustomerById: vi.fn(() => Effect.succeed(customer)),
				getTiers: vi.fn(() => Effect.succeed(baseTiers)),
				updateCustomerPoints: vi.fn(() => Effect.void),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					evaluateTierProgram(customerId, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.tierChanged).toBe(true);
			expect(result.newTierName).toBe("Gold");
		});

		it("should return no change when tier is the same", async () => {
			const customer = {
				...baseCustomer,
				totalPoints: 100,
				currentTierId: baseTiers[0]?.id,
			};
			const mock = makeMockRepo({
				findCustomerById: vi.fn(() => Effect.succeed(customer)),
				getTiers: vi.fn(() => Effect.succeed(baseTiers)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					evaluateTierProgram(customerId, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.tierChanged).toBe(false);
			expect(result.newTierName).toBe("Silver");
		});

		it("should return no change when customer not found", async () => {
			const mock = makeMockRepo({
				findCustomerById: vi.fn(() => Effect.succeed(null)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					evaluateTierProgram(customerId, tenantId),
					provideRepo(mock),
				),
			);

			expect(result.tierChanged).toBe(false);
			expect(result.newTierName).toBeNull();
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const mock = makeMockRepo({
				findCustomerById: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						evaluateTierProgram(customerId, tenantId),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});
});
