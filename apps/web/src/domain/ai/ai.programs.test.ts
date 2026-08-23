import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { IAccountingRepository } from "@/domain/accounting";
import { IBoardingRepository } from "@/domain/boarding";
import { IProductRepository } from "@/domain/product";
import type { TTenantId } from "@/shared/types/common.types";
import { aiGetBusinessSnapshotProgram } from "./ai.programs";

// ─── Default mocks ──────────────────────────────────────────────────────────

const accountingDefaults = {
	getDashboardMetrics: vi.fn(),
	getFinancialSummary: vi.fn(),
	getExpenses: vi.fn(),
	saveExpense: vi.fn(),
	getPettyCashTransactions: vi.fn(),
	savePettyCashTransaction: vi.fn(),
	getChartOfAccounts: vi.fn(),
	getJournalEntries: vi.fn(),
	saveJournalEntry: vi.fn(),
	getProfitLossReport: vi.fn(),
	getCommissionReport: vi.fn(),
	getAttendanceReport: vi.fn(),
	getCashFlowReport: vi.fn(),
};

const productDefaults = {
	findById: vi.fn(),
	findAllActive: vi.fn(),
	findFeatured: vi.fn(),
	findLowStock: vi.fn(),
	findPage: vi.fn(),
	delete: vi.fn(),
	save: vi.fn(),
	update: vi.fn(),
	saveFull: vi.fn(),
	findVariantsByProductId: vi.fn(),
	findVariantById: vi.fn(),
	saveVariant: vi.fn(),
	updateVariant: vi.fn(),
	deleteVariant: vi.fn(),
	existsBySku: vi.fn(),
	importProduct: vi.fn(),
};

const boardingDefaults = {
	findById: vi.fn(),
	findAll: vi.fn(),
	saveFull: vi.fn(),
	update: vi.fn(),
	updateFull: vi.fn(),
	delete: vi.fn(),
	getCharges: vi.fn(),
	addCharge: vi.fn(),
	getPhotos: vi.fn(),
	addPhoto: vi.fn(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tenantId = "tenant-1" as TTenantId;
const dbError = { _tag: "DatabaseError" as const, cause: new Error("db fail") };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("aiGetBusinessSnapshotProgram", () => {
	it("returns a complete business snapshot with metrics, inventory, and active boardings", async () => {
		const accLayer = Layer.succeed(IAccountingRepository, {
			...accountingDefaults,
			getDashboardMetrics: vi.fn().mockReturnValue(
				Effect.succeed({
					activeBoardings: 3,
					completedMonth: 15,
					activeBranches: 2,
					transactionsToday: 12,
					revenueToday: 750_000,
					lowStockProducts: 2,
					totalCustomers: 85,
					transactionsGrowth: 8.5,
					revenueGrowth: 12.3,
					volumeData: [],
				}),
			),
		});

		const prodLayer = Layer.succeed(IProductRepository, {
			...productDefaults,
			findAllActive: vi.fn().mockReturnValue(
				Effect.succeed([
					{
						id: "prod-1",
						tenantId,
						name: "Dog Food Premium",
						category: "food",
						description: null,
						brand: "BrandA",
						imageUrl: null,
						hasVariants: true,
						isActive: true,
						createdAt: new Date("2026-01-01"),
						updatedAt: new Date("2026-06-01"),
						variants: [
							{
								id: "var-1",
								productId: "prod-1",
								tenantId,
								name: "1kg",
								sku: "DF-001",
								barcode: null,
								price: 85_000,
								costPrice: 50_000,
								unit: "pcs",
								isFractional: false,
								stock: 20,
								lowStockThreshold: 5,
								isActive: true,
								sortOrder: 0,
								createdAt: new Date("2026-01-01"),
								updatedAt: new Date("2026-06-01"),
							},
						],
					},
					{
						id: "prod-2",
						tenantId,
						name: "Cat Toy Mouse",
						category: "toy",
						description: null,
						brand: "BrandB",
						imageUrl: null,
						hasVariants: false,
						isActive: true,
						createdAt: new Date("2026-02-01"),
						updatedAt: new Date("2026-06-01"),
						variants: [
							{
								id: "var-2",
								productId: "prod-2",
								tenantId,
								name: "Default",
								sku: "CT-001",
								barcode: null,
								price: 25_000,
								costPrice: 10_000,
								unit: "pcs",
								isFractional: false,
								stock: 3,
								lowStockThreshold: 5,
								isActive: true,
								sortOrder: 0,
								createdAt: new Date("2026-02-01"),
								updatedAt: new Date("2026-06-01"),
							},
						],
					},
				]),
			),
		});

		const boardLayer = Layer.succeed(IBoardingRepository, {
			...boardingDefaults,
			findAll: vi.fn().mockReturnValue(
				Effect.succeed([
					{
						id: "board-1",
						tenantId,
						branchId: "branch-1",
						customerId: null,
						ownerName: "Alice",
						ownerAddress: "Jl. Merdeka No.1",
						ownerPhone: "081-111",
						emergencyContactName: null,
						emergencyContactPhone: null,
						ownerSignature: null,
						checkInDate: new Date("2026-06-15"),
						estimatedCheckOutDate: null,
						notes: null,
						status: "active",
						roomId: null,
						dailyRate: 50_000,
						actualCheckout: null,
						totalAmount: 0,
						consentAcceptedAt: null,
						createdBy: "user-1",
						createdAt: new Date("2026-06-15"),
						updatedAt: new Date("2026-06-15"),
						pets: [
							{
								id: "pet-1",
								boardingId: "board-1",
								name: "Fluffy",
								kind: "cat",
								breed: "Persian",
								vaccinated: "yes",
								weight: "4kg",
								healthStatus: "Healthy",
								initialCondition: "Good",
								notes: null,
								createdAt: new Date("2026-06-15"),
								updatedAt: new Date("2026-06-15"),
							},
						],
					},
					{
						id: "board-2",
						tenantId,
						branchId: "branch-1",
						customerId: null,
						ownerName: "Bob",
						ownerAddress: "Jl. Sudirman",
						ownerPhone: "082-222",
						emergencyContactName: null,
						emergencyContactPhone: null,
						ownerSignature: null,
						checkInDate: new Date("2026-06-10"),
						estimatedCheckOutDate: new Date("2026-06-20"),
						notes: null,
						status: "completed",
						roomId: null,
						dailyRate: 75_000,
						actualCheckout: new Date("2026-06-20"),
						totalAmount: 750_000,
						consentAcceptedAt: null,
						createdBy: "user-2",
						createdAt: new Date("2026-06-10"),
						updatedAt: new Date("2026-06-20"),
						pets: [
							{
								id: "pet-2",
								boardingId: "board-2",
								name: "Buddy",
								kind: "dog",
								breed: "Golden Retriever",
								vaccinated: "yes",
								weight: "20kg",
								healthStatus: "Healthy",
								initialCondition: "Good",
								notes: null,
								createdAt: new Date("2026-06-10"),
								updatedAt: new Date("2026-06-20"),
							},
						],
					},
				]),
			),
		});

		const combined = Layer.merge(Layer.merge(accLayer, prodLayer), boardLayer);

		const result = await Effect.runPromise(
			aiGetBusinessSnapshotProgram(tenantId).pipe(Effect.provide(combined)),
		);

		// ── Metrics ──────────────────────────────────────────────────────────
		expect(result.metrics.revenueToday).toBe(750_000);
		expect(result.metrics.transactionsToday).toBe(12);
		expect(result.metrics.activeBoardings).toBe(3);

		// ── Inventory summary ────────────────────────────────────────────────
		expect(result.inventorySummary).toHaveLength(2);

		// Dog Food Premium: stock=20, threshold=5 → isLow=false
		expect(result.inventorySummary[0]?.name).toBe("Dog Food Premium");
		expect(result.inventorySummary[0]?.stock).toBe(20);
		expect(result.inventorySummary[0]?.isLow).toBe(false);

		// Cat Toy Mouse: stock=3, threshold=5 → isLow=true
		expect(result.inventorySummary[1]?.name).toBe("Cat Toy Mouse");
		expect(result.inventorySummary[1]?.stock).toBe(3);
		expect(result.inventorySummary[1]?.isLow).toBe(true);

		// ── Active boardings (only "active" status) ──────────────────────────
		expect(result.activeBoardings).toHaveLength(1);
		expect(result.activeBoardings[0]?.owner).toBe("Alice");
		expect(result.activeBoardings[0]?.pets).toBe("Fluffy");
		expect(result.activeBoardings[0]?.checkIn).toBe(
			new Date("2026-06-15").toISOString(),
		);
	});

	it("returns snapshot with empty arrays when no boardings or products exist", async () => {
		const accLayer = Layer.succeed(IAccountingRepository, {
			...accountingDefaults,
			getDashboardMetrics: vi.fn().mockReturnValue(
				Effect.succeed({
					activeBoardings: 0,
					completedMonth: 0,
					activeBranches: 1,
					transactionsToday: 0,
					revenueToday: 0,
					lowStockProducts: 0,
					totalCustomers: 0,
					transactionsGrowth: 0,
					revenueGrowth: 0,
					volumeData: [],
				}),
			),
		});
		const prodLayer = Layer.succeed(IProductRepository, {
			...productDefaults,
			findAllActive: vi.fn().mockReturnValue(Effect.succeed([])),
		});
		const boardLayer = Layer.succeed(IBoardingRepository, {
			...boardingDefaults,
			findAll: vi.fn().mockReturnValue(Effect.succeed([])),
		});

		const combined = Layer.merge(Layer.merge(accLayer, prodLayer), boardLayer);

		const result = await Effect.runPromise(
			aiGetBusinessSnapshotProgram(tenantId).pipe(Effect.provide(combined)),
		);

		expect(result.inventorySummary).toEqual([]);
		expect(result.activeBoardings).toEqual([]);
	});

	it("propagates DatabaseError when accounting repo fails", async () => {
		const accLayer = Layer.succeed(IAccountingRepository, {
			...accountingDefaults,
			getDashboardMetrics: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});
		const prodLayer = Layer.succeed(IProductRepository, {
			...productDefaults,
			findAllActive: vi.fn().mockReturnValue(Effect.succeed([])),
		});
		const boardLayer = Layer.succeed(IBoardingRepository, {
			...boardingDefaults,
			findAll: vi.fn().mockReturnValue(Effect.succeed([])),
		});

		const combined = Layer.merge(Layer.merge(accLayer, prodLayer), boardLayer);

		await expect(
			Effect.runPromise(
				aiGetBusinessSnapshotProgram(tenantId).pipe(Effect.provide(combined)),
			),
		).rejects.toThrow("DatabaseError");
	});

	it("propagates DatabaseError when product repo fails", async () => {
		const accLayer = Layer.succeed(IAccountingRepository, {
			...accountingDefaults,
			getDashboardMetrics: vi.fn().mockReturnValue(
				Effect.succeed({
					activeBoardings: 0,
					completedMonth: 0,
					activeBranches: 1,
					transactionsToday: 0,
					revenueToday: 0,
					lowStockProducts: 0,
					totalCustomers: 0,
					transactionsGrowth: 0,
					revenueGrowth: 0,
					volumeData: [],
				}),
			),
		});
		const prodLayer = Layer.succeed(IProductRepository, {
			...productDefaults,
			findAllActive: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});
		const boardLayer = Layer.succeed(IBoardingRepository, {
			...boardingDefaults,
			findAll: vi.fn().mockReturnValue(Effect.succeed([])),
		});

		const combined = Layer.merge(Layer.merge(accLayer, prodLayer), boardLayer);

		await expect(
			Effect.runPromise(
				aiGetBusinessSnapshotProgram(tenantId).pipe(Effect.provide(combined)),
			),
		).rejects.toThrow("DatabaseError");
	});

	it("propagates DatabaseError when boarding repo fails", async () => {
		const accLayer = Layer.succeed(IAccountingRepository, {
			...accountingDefaults,
			getDashboardMetrics: vi.fn().mockReturnValue(
				Effect.succeed({
					activeBoardings: 0,
					completedMonth: 0,
					activeBranches: 1,
					transactionsToday: 0,
					revenueToday: 0,
					lowStockProducts: 0,
					totalCustomers: 0,
					transactionsGrowth: 0,
					revenueGrowth: 0,
					volumeData: [],
				}),
			),
		});
		const prodLayer = Layer.succeed(IProductRepository, {
			...productDefaults,
			findAllActive: vi.fn().mockReturnValue(Effect.succeed([])),
		});
		const boardLayer = Layer.succeed(IBoardingRepository, {
			...boardingDefaults,
			findAll: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});

		const combined = Layer.merge(Layer.merge(accLayer, prodLayer), boardLayer);

		await expect(
			Effect.runPromise(
				aiGetBusinessSnapshotProgram(tenantId).pipe(Effect.provide(combined)),
			),
		).rejects.toThrow("DatabaseError");
	});
});
