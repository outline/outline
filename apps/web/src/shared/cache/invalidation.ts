import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export const invalidateDashboard = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({
		queryKey: queryKeys.dashboard.metrics(),
	});
};

export const invalidateProducts = async (queryClient: QueryClient) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() }),
		queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() }),
	]);
};

export const invalidateBoardings = async (
	queryClient: QueryClient,
	id?: string,
) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.boardings.lists() }),
		...(id
			? [
					queryClient.invalidateQueries({
						queryKey: queryKeys.boardings.detail(id),
					}),
				]
			: []),
		queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() }),
	]);
};

export const invalidateCustomers = async (
	queryClient: QueryClient,
	id?: string,
) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() }),
		...(id
			? [
					queryClient.invalidateQueries({
						queryKey: queryKeys.customers.detail(id),
					}),
				]
			: []),
	]);
};

export const invalidateBusinessSettings = async (queryClient: QueryClient) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.session.info() }),
		queryClient.invalidateQueries({ queryKey: queryKeys.session.legacyInfo() }),
		queryClient.invalidateQueries({
			queryKey: queryKeys.session.legacySession(),
		}),
	]);
};

export const invalidateBilling = async (queryClient: QueryClient) => {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: queryKeys.billing.subscription(),
		}),
		queryClient.invalidateQueries({
			queryKey: queryKeys.billing.usageMetrics(),
		}),
	]);
};

export const invalidateInventory = async (queryClient: QueryClient) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() }),
		queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() }),
		queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() }),
	]);
};

export const invalidateBranches = async (
	queryClient: QueryClient,
	branchId?: string,
) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.branches.all() }),
		...(branchId
			? [
					queryClient.invalidateQueries({
						queryKey: queryKeys.rooms.byBranch(branchId),
					}),
					queryClient.invalidateQueries({
						queryKey: queryKeys.branches.holidays(branchId),
					}),
				]
			: [queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() })]),
		queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() }),
	]);
};

export const invalidateStaff = async (
	queryClient: QueryClient,
	staffId?: string,
) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.staff.members() }),
		...(staffId
			? [
					queryClient.invalidateQueries({
						queryKey: queryKeys.staff.detail(staffId),
					}),
				]
			: []),
	]);
};

export const invalidateSuppliers = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.list() });
};

export const invalidateWarehouses = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({
		queryKey: queryKeys.warehouses.all(),
	});
};

export const invalidatePurchaseOrders = async (
	queryClient: QueryClient,
	id?: string,
) => {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: queryKeys.purchaseOrders.list(),
		}),
		...(id
			? [
					queryClient.invalidateQueries({
						queryKey: queryKeys.purchaseOrders.detail(id),
					}),
				]
			: []),
		queryClient.invalidateQueries({
			queryKey: queryKeys.inventory.all(),
		}),
	]);
};

export const invalidateInvoices = async (
	queryClient: QueryClient,
	id?: string,
) => {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.invoices.list() }),
		...(id
			? [
					queryClient.invalidateQueries({
						queryKey: queryKeys.invoices.detail(id),
					}),
				]
			: []),
		queryClient.invalidateQueries({
			queryKey: queryKeys.accounting.financialSummary(),
		}),
	]);
};

export const invalidateAccounting = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all() });
};

export const invalidatePortal = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({ queryKey: queryKeys.portal.all() });
};

export const invalidateWhatsApp = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp.all() });
};

export const invalidateGrooming = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({ queryKey: queryKeys.grooming.all() });
};

export const invalidateLoyalty = async (queryClient: QueryClient) => {
	await queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.all() });
};
