import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
	it("creates stable products keys", () => {
		expect(queryKeys.products.all()).toEqual(["products"]);
		expect(queryKeys.products.list()).toEqual(["products", "list"]);
		expect(queryKeys.products.detail("product-1")).toEqual([
			"products",
			"detail",
			"product-1",
		]);
	});

	it("creates stable boarding keys", () => {
		expect(queryKeys.boardings.all()).toEqual(["boardings"]);
		expect(queryKeys.boardings.list()).toEqual(["boardings", "list"]);
		expect(queryKeys.boardings.detail("boarding-1")).toEqual([
			"boardings",
			"detail",
			"boarding-1",
		]);
		expect(queryKeys.boardings.photos("boarding-1")).toEqual([
			"boardings",
			"detail",
			"boarding-1",
			"photos",
		]);
	});

	it("normalizes optional customer search", () => {
		expect(queryKeys.customers.list()).toEqual([
			"customers",
			"list",
			{ search: "" },
		]);
		expect(queryKeys.customers.list("  budi  ")).toEqual([
			"customers",
			"list",
			{ search: "budi" },
		]);
	});

	it("exposes cross-cutting keys", () => {
		expect(queryKeys.session.info()).toEqual(["session", "info"]);
		expect(queryKeys.dashboard.metrics()).toEqual(["dashboard", "metrics"]);
		expect(queryKeys.billing.subscription()).toEqual([
			"billing",
			"subscription",
		]);
		expect(queryKeys.billing.usageMetrics()).toEqual([
			"billing",
			"usageMetrics",
		]);
	});

	it("creates stable dashboard and POS keys", () => {
		expect(queryKeys.dashboard.metrics()).toEqual(["dashboard", "metrics"]);
		expect(queryKeys.dashboard.revenue()).toEqual(["dashboard", "revenue"]);
		expect(queryKeys.dashboard.topSellers()).toEqual([
			"dashboard",
			"topSellers",
		]);
		expect(queryKeys.dashboard.inventory()).toEqual(["dashboard", "inventory"]);
		expect(queryKeys.pos.customers()).toEqual(["pos", "customers"]);
		expect(queryKeys.pos.receiptTemplate()).toEqual(["pos", "receiptTemplate"]);
	});

	it("creates stable inventory keys", () => {
		expect(queryKeys.inventory.products()).toEqual(["inventory", "products"]);
		expect(queryKeys.inventory.expiringBatches()).toEqual([
			"inventory",
			"expiringBatches",
		]);
		expect(queryKeys.inventory.batches()).toEqual(["inventory", "batches"]);
		expect(queryKeys.inventory.movements()).toEqual(["inventory", "movements"]);
		expect(queryKeys.inventory.productBatches("product-1")).toEqual([
			"inventory",
			"productBatches",
			"product-1",
		]);
	});

	it("creates stable branch room and staff keys", () => {
		expect(queryKeys.branches.list()).toEqual(["branches", "list"]);
		expect(queryKeys.branches.holidays("branch-1")).toEqual([
			"branches",
			"detail",
			"branch-1",
			"holidays",
		]);
		expect(queryKeys.rooms.byBranch("branch-1")).toEqual([
			"rooms",
			{ branchId: "branch-1" },
		]);
		expect(queryKeys.staff.members()).toEqual(["staff", "members"]);
		expect(queryKeys.staff.detail("staff-1")).toEqual([
			"staff",
			"detail",
			"staff-1",
		]);
		expect(queryKeys.staff.schedules("staff-1")).toEqual([
			"staff",
			"detail",
			"staff-1",
			"schedules",
		]);
	});

	it("creates stable supplier purchase order and invoice keys", () => {
		expect(queryKeys.suppliers.list()).toEqual(["suppliers", "list"]);
		expect(queryKeys.purchaseOrders.list()).toEqual(["purchaseOrders", "list"]);
		expect(queryKeys.purchaseOrders.detail("po-1")).toEqual([
			"purchaseOrders",
			"detail",
			"po-1",
		]);
		expect(queryKeys.invoices.list()).toEqual(["invoices", "list"]);
		expect(queryKeys.invoices.detail("invoice-1")).toEqual([
			"invoices",
			"detail",
			"invoice-1",
		]);
	});

	it("creates stable accounting keys", () => {
		expect(queryKeys.accounting.financialSummary()).toEqual([
			"accounting",
			"financialSummary",
		]);
		expect(queryKeys.accounting.expenses()).toEqual(["accounting", "expenses"]);
		expect(queryKeys.accounting.pettyCash()).toEqual([
			"accounting",
			"pettyCash",
		]);
		expect(queryKeys.accounting.journalEntries()).toEqual([
			"accounting",
			"journalEntries",
		]);
		expect(queryKeys.accounting.profitLoss()).toEqual([
			"accounting",
			"profitLoss",
		]);
		expect(queryKeys.accounting.cashFlow()).toEqual(["accounting", "cashFlow"]);
	});

	it("creates stable portal public whatsapp grooming and loyalty keys", () => {
		expect(queryKeys.portal.stats()).toEqual(["portal", "stats"]);
		expect(queryKeys.portal.config()).toEqual(["portal", "config"]);
		expect(queryKeys.portal.bookings()).toEqual(["portal", "bookings"]);
		expect(queryKeys.portal.services()).toEqual(["portal", "services"]);
		expect(queryKeys.publicPortal.config("happy-pets")).toEqual([
			"publicPortal",
			"happy-pets",
			"config",
		]);
		expect(queryKeys.publicPortal.services("happy-pets")).toEqual([
			"publicPortal",
			"happy-pets",
			"services",
		]);
		expect(queryKeys.whatsapp.config()).toEqual(["whatsapp", "config"]);
		expect(queryKeys.whatsapp.templates()).toEqual(["whatsapp", "templates"]);
		expect(
			queryKeys.grooming.calendar({ groomerId: "staff-1", date: "2026-07-17" }),
		).toEqual([
			"grooming",
			"calendar",
			{ date: "2026-07-17", groomerId: "staff-1" },
		]);
		expect(queryKeys.loyalty.config()).toEqual(["loyalty", "config"]);
	});
});
