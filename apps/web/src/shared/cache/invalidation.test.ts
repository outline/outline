import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
	invalidateAccounting,
	invalidateBilling,
	invalidateBoardings,
	invalidateBranches,
	invalidateBusinessSettings,
	invalidateCustomers,
	invalidateDashboard,
	invalidateGrooming,
	invalidateInventory,
	invalidateInvoices,
	invalidateLoyalty,
	invalidatePortal,
	invalidateProducts,
	invalidatePurchaseOrders,
	invalidateStaff,
	invalidateSuppliers,
	invalidateWhatsApp,
} from "./invalidation";
import { queryKeys } from "./query-keys";

const makeClient = () => {
	const client = new QueryClient();
	const spy = vi
		.spyOn(client, "invalidateQueries")
		.mockResolvedValue(undefined);
	return { client, spy };
};

describe("cache invalidation helpers", () => {
	it("invalidates product list and dashboard metrics", async () => {
		const { client, spy } = makeClient();

		await invalidateProducts(client);

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.products.lists() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.dashboard.metrics(),
		});
	});

	it("invalidates boarding list, optional detail, and dashboard metrics", async () => {
		const { client, spy } = makeClient();

		await invalidateBoardings(client, "boarding-1");

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.boardings.lists() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.boardings.detail("boarding-1"),
		});
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.dashboard.metrics(),
		});
	});

	it("invalidates customer list and optional detail", async () => {
		const { client, spy } = makeClient();

		await invalidateCustomers(client, "customer-1");

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.customers.lists() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.customers.detail("customer-1"),
		});
	});

	it("invalidates business settings session keys", async () => {
		const { client, spy } = makeClient();

		await invalidateBusinessSettings(client);

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.session.info() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.session.legacyInfo(),
		});
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.session.legacySession(),
		});
	});

	it("invalidates billing keys", async () => {
		const { client, spy } = makeClient();

		await invalidateBilling(client);

		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.billing.subscription(),
		});
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.billing.usageMetrics(),
		});
	});

	it("invalidates dashboard metrics directly", async () => {
		const { client, spy } = makeClient();

		await invalidateDashboard(client);

		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.dashboard.metrics(),
		});
	});

	it("invalidates inventory and dependent product/dashboard views", async () => {
		const { client, spy } = makeClient();

		await invalidateInventory(client);

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.inventory.all() });
		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.products.lists() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.dashboard.metrics(),
		});
	});

	it("invalidates branch room and dashboard dependent views", async () => {
		const { client, spy } = makeClient();

		await invalidateBranches(client, "branch-1");

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.branches.all() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.rooms.byBranch("branch-1"),
		});
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.dashboard.metrics(),
		});
	});

	it("invalidates staff list and optional staff detail", async () => {
		const { client, spy } = makeClient();

		await invalidateStaff(client, "staff-1");

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.staff.members() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.staff.detail("staff-1"),
		});
	});

	it("invalidates supplier and purchase order views", async () => {
		const { client, spy } = makeClient();

		await invalidateSuppliers(client);
		await invalidatePurchaseOrders(client, "po-1");

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.suppliers.list() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.purchaseOrders.list(),
		});
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.purchaseOrders.detail("po-1"),
		});
	});

	it("invalidates financial views conservatively", async () => {
		const { client, spy } = makeClient();

		await invalidateInvoices(client, "invoice-1");
		await invalidateAccounting(client);

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.invoices.list() });
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.invoices.detail("invoice-1"),
		});
		expect(spy).toHaveBeenCalledWith({
			queryKey: queryKeys.accounting.financialSummary(),
		});
		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.accounting.all() });
	});

	it("invalidates portal whatsapp grooming and loyalty groups", async () => {
		const { client, spy } = makeClient();

		await invalidatePortal(client);
		await invalidateWhatsApp(client);
		await invalidateGrooming(client);
		await invalidateLoyalty(client);

		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.portal.all() });
		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.whatsapp.all() });
		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.grooming.all() });
		expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.loyalty.all() });
	});
});
