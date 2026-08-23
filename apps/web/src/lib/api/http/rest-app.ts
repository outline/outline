import { Effect, Schema } from "effect";
import {
	createExpenseProgram,
	getCashFlowReportProgram,
	getChartOfAccountsProgram,
	getCommissionReportProgram,
	getDashboardMetricsProgram,
	getExpensesProgram,
	getJournalEntriesProgram,
} from "@/domain/accounting/accounting.programs";
import { CreateExpenseSchema } from "@/domain/accounting/accounting.schemas";
import { getAuditLogsProgram } from "@/domain/audit/audit.programs";
import {
	changeSubscriptionPlanProgram,
	getBillingHistoryProgram,
	getCurrentSubscriptionProgram,
	getUsageMetricsProgram,
} from "@/domain/billing/billing.programs";
import {
	createBoardingProgram,
	getBoardingsProgram,
	updateBoardingStatusProgram,
} from "@/domain/boarding/boarding.programs";
import { CreateBoardingSchema } from "@/domain/boarding/boarding.schemas";
import {
	createBranchHolidayProgram,
	createBranchProgram,
	deleteBranchHolidayProgram,
	deleteBranchProgram,
	getBranchesProgram,
	getBranchHolidaysProgram,
	updateBranchProgram,
} from "@/domain/branch/branch.programs";
import {
	CreateBranchHolidaySchema,
	CreateBranchSchema,
	UpdateBranchSchema,
} from "@/domain/branch/branch.schemas";
import {
	addKasbonProgram,
	getAllKasbonProgram,
	payKasbonProgram,
} from "@/domain/commission/commission.programs";
import {
	CreateKasbonSchema,
	PayKasbonSchema,
} from "@/domain/commission/commission.schemas";
import {
	createCustomerProgram,
	deleteCustomerProgram,
	getCustomersProgram,
	updateCustomerProgram,
} from "@/domain/customer/customer.programs";
import { getTopSellersProgram } from "@/domain/dashboard/dashboard.programs";
import {
	getTemplateByTypeProgram,
	upsertTemplateProgram,
} from "@/domain/document-template/document-template.programs";
import type {
	IBoardingTemplateContent,
	IDocumentTemplate,
	TTemplateId,
} from "@/domain/document-template/document-template.types";
import {
	getCalendarPrograms,
	updateAppointmentStatusProgram,
} from "@/domain/grooming/grooming.programs";
import type { TGroomingAppointment } from "@/domain/grooming/grooming.types";
import {
	addBatchProgram,
	deductStockProgram,
	getBatchesProgram,
	getMovementsProgram,
} from "@/domain/inventory/inventory.programs";
import {
	createInvoiceProgram,
	getInvoiceByIdProgram,
	getInvoicesProgram,
	recordPaymentProgram,
	voidInvoiceProgram,
} from "@/domain/invoice/invoice.programs";
import type {
	ICreateInvoiceCommand,
	IRecordPaymentCommand,
} from "@/domain/invoice/invoice.repository";
import type { TInvoiceId } from "@/domain/invoice/invoice.types";
import {
	getLoyaltyConfigProgram,
	getLoyaltyTransactionsProgram,
	redeemPointsProgram,
	updateLoyaltyConfigProgram,
} from "@/domain/loyalty/loyalty.programs";
import {
	RedeemPointsSchema,
	UpdateLoyaltyConfigSchema,
} from "@/domain/loyalty/loyalty.schemas";
import {
	createOrderProgram,
	getOrdersProgram,
	markOrderPaidProgram,
	voidOrderProgram,
} from "@/domain/order/order.programs";
import {
	CreateOrderSchema,
	VoidOrderSchema,
} from "@/domain/order/order.schemas";
import {
	addPetProgram,
	deletePetProgram,
	getPetsProgram,
	updatePetProgram,
} from "@/domain/pet/pet.programs";
import type { TPetId } from "@/domain/pet/pet.types";
import {
	createPortalServiceProgram,
	deletePortalServiceProgram,
	getPortalConfigProgram,
	getPortalReviewsProgram,
	getPortalServicesProgram,
	getPortalStatsProgram,
	updatePortalConfigProgram,
	updatePortalServiceStatusProgram,
} from "@/domain/portal/portal.programs";
import type { UpdatePortalConfigCommand } from "@/domain/portal/portal.schemas";
import type { TPortalServiceId } from "@/domain/portal/portal.types";
import {
	addProductProgram,
	addVariantProgram,
	deleteProductProgram,
	getProductProgram,
	getProductsProgram,
	updateProductProgram,
	updateVariantProgram,
} from "@/domain/product/product.programs";
import {
	CreateProductSchema,
	CreateVariantSchema,
	UpdateProductSchema,
	UpdateVariantSchema,
} from "@/domain/product/product.schemas";
import type { TProductVariantId } from "@/domain/product/product.types";
import {
	createPurchaseOrderProgram,
	getPurchaseOrdersProgram,
	receivePurchaseOrderProgram,
	updatePoStatusProgram,
} from "@/domain/purchase-order/purchase-order.programs";
import {
	CreatePurchaseOrderSchema,
	ReceivePurchaseOrderSchema,
} from "@/domain/purchase-order/purchase-order.schemas";
import type { TPurchaseOrderId } from "@/domain/purchase-order/purchase-order.types";
import {
	getReturnsProgram,
	processReturnProgram,
} from "@/domain/return/return.programs";
import { CreateReturnSchema } from "@/domain/return/return.schemas";
import {
	createRoomProgram,
	deleteRoomProgram,
	updateRoomProgram,
} from "@/domain/room/room.programs";
import { RoomRepository } from "@/domain/room/room.repository";
import type { TRoomId } from "@/domain/room/room.types";
import {
	clockInProgram,
	clockOutProgram,
	getAllAttendanceProgram,
} from "@/domain/shift/shift.programs";
import {
	getStaffMembersProgram,
	inviteStaffProgram,
	removeStaffFromBranchProgram,
	setStaffActiveProgram,
} from "@/domain/staff/staff.programs";
import { InviteStaffSchema } from "@/domain/staff/staff.schemas";
import {
	addSupplierProgram,
	deleteSupplierProgram,
	getSuppliersProgram,
	updateSupplierProgram,
} from "@/domain/supplier/supplier.programs";
import {
	CreateSupplierSchema,
	UpdateSupplierSchema,
} from "@/domain/supplier/supplier.schemas";
import type { TSupplierId } from "@/domain/supplier/supplier.types";
import {
	createWarehouseProgram,
	deleteWarehouseProgram,
	getWarehousesProgram,
	updateWarehouseProgram,
} from "@/domain/warehouse/warehouse.programs";
import { CreateWarehouseSchema } from "@/domain/warehouse/warehouse.schemas";
import type { TWarehouseId } from "@/domain/warehouse/warehouse.types";
import {
	getPendingRemindersProgram,
	getWhatsAppTemplatesProgram,
	sendWhatsAppTemplateProgram,
} from "@/domain/whatsapp/whatsapp.programs";
import { SendWhatsAppTemplateSchema } from "@/domain/whatsapp/whatsapp.schemas";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import {
	type AccountingHandlers,
	createAccountingHandlers,
} from "./accounting.handlers";
import {
	type AccountingReportHandlers,
	createAccountingReportHandlers,
} from "./accounting-report.handlers";
import {
	type AdvanceHandlers,
	createAdvanceHandlers,
} from "./advance.handlers";
import { type AuditHandlers, createAuditHandlers } from "./audit.handlers";
import { type AuthHandlers, createAuthHandlers } from "./auth.handlers";
import { createAuthProgramDependencies } from "./auth.runtime";
import {
	type BillingHandlers,
	createBillingHandlers,
} from "./billing.handlers";
import {
	type BoardingHandlers,
	createBoardingHandlers,
} from "./boarding.handlers";
import { type BranchHandlers, createBranchHandlers } from "./branch.handlers";
import {
	type CatalogHandlers,
	createCatalogHandlers,
} from "./catalog.handlers";
import {
	createDashboardHandlers,
	type DashboardHandlers,
} from "./dashboard.handlers";
import {
	createDocumentTemplateHandlers,
	type DocumentTemplateHandlers,
} from "./document-template.handlers";
import {
	createExpenseHandlers,
	type ExpenseHandlers,
} from "./expense.handlers";
import {
	createGroomingHandlers,
	type GroomingHandlers,
} from "./grooming.handlers";
import {
	createHolidayHandlers,
	type HolidayHandlers,
} from "./holiday.handlers";
import {
	createInventoryHandlers,
	type InventoryHandlers,
} from "./inventory.handlers";
import {
	createInvoiceHandlers,
	type InvoiceHandlers,
} from "./invoice.handlers";
import { createLedgerHandlers, type LedgerHandlers } from "./ledger.handlers";
import {
	createLoyaltyHandlers,
	type LoyaltyHandlers,
} from "./loyalty.handlers";
import { createOrderHandlers, type OrderHandlers } from "./order.handlers";
import { createPortalHandlers, type PortalHandlers } from "./portal.handlers";
import {
	createPurchaseHandlers,
	type PurchaseHandlers,
} from "./purchase.handlers";
import {
	createReferenceHandlers,
	type ReferenceHandlers,
} from "./reference.handlers";
import { getRequestId } from "./request-context";
import { jsonSuccess } from "./response";
import { createReturnHandlers, type ReturnHandlers } from "./return.handlers";
import { createRoomHandlers, type RoomHandlers } from "./room.handlers";
import { createShiftHandlers, type ShiftHandlers } from "./shift.handlers";
import {
	createStaffInviteHandlers,
	type StaffInviteHandlers,
} from "./staff-invite.handlers";
import {
	createStaffStatusHandlers,
	type StaffStatusHandlers,
} from "./staff-status.handlers";
import {
	createWhatsAppHandlers,
	type WhatsAppHandlers,
} from "./whatsapp.handlers";

/**
 * Creates the direct REST request dispatcher.
 *
 * @param authHandlers handlers for the authentication routes.
 * @returns a dispatcher for migrated REST routes.
 */
export function createRestRequestHandler(
	authHandlers: AuthHandlers,
	branchHandlers?: BranchHandlers,
	catalogHandlers?: CatalogHandlers,
	inventoryHandlers?: InventoryHandlers,
	orderHandlers?: OrderHandlers,
	referenceHandlers?: ReferenceHandlers,
	roomHandlers?: RoomHandlers,
	purchaseHandlers?: PurchaseHandlers,
	invoiceHandlers?: InvoiceHandlers,
	shiftHandlers?: ShiftHandlers,
	returnHandlers?: ReturnHandlers,
	boardingHandlers?: BoardingHandlers,
	groomingHandlers?: GroomingHandlers,
	documentTemplateHandlers?: DocumentTemplateHandlers,
	dashboardHandlers?: DashboardHandlers,
	portalHandlers?: PortalHandlers,
	holidayHandlers?: HolidayHandlers,
	expenseHandlers?: ExpenseHandlers,
	accountingHandlers?: AccountingHandlers,
	ledgerHandlers?: LedgerHandlers,
	accountingReportHandlers?: AccountingReportHandlers,
	loyaltyHandlers?: LoyaltyHandlers,
	auditHandlers?: AuditHandlers,
	billingHandlers?: BillingHandlers,
	advanceHandlers?: AdvanceHandlers,
	whatsAppHandlers?: WhatsAppHandlers,
	staffInviteHandlers?: StaffInviteHandlers,
	staffStatusHandlers?: StaffStatusHandlers,
): (request: Request) => Promise<Response | undefined> {
	return async (request) => {
		const url = new URL(request.url);
		const requestId = getRequestId(request);

		if (url.pathname === "/api/v1/auth/login" && request.method === "POST") {
			return authHandlers.login(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/signup" && request.method === "POST") {
			return authHandlers.signup(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/logout" && request.method === "POST") {
			return authHandlers.logout(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/session" && request.method === "GET") {
			return authHandlers.session(request, requestId);
		}
		if (
			auditHandlers &&
			url.pathname === "/api/v1/admin/audit" &&
			request.method === "GET"
		) {
			return auditHandlers.list(request, requestId);
		}
		if (
			billingHandlers &&
			url.pathname === "/api/v1/admin/billing" &&
			request.method === "GET"
		) {
			return billingHandlers.get(request, requestId);
		}
		if (
			billingHandlers &&
			url.pathname === "/api/v1/admin/billing/plan" &&
			request.method === "POST"
		) {
			return billingHandlers.changePlan(request, requestId);
		}
		if (
			advanceHandlers &&
			url.pathname === "/api/v1/admin/advances" &&
			request.method === "GET"
		) {
			return advanceHandlers.list(request, requestId);
		}
		if (
			advanceHandlers &&
			url.pathname === "/api/v1/admin/advances" &&
			request.method === "POST"
		) {
			return advanceHandlers.create(request, requestId);
		}
		if (
			advanceHandlers &&
			url.pathname === "/api/v1/admin/advances/repay" &&
			request.method === "POST"
		) {
			return advanceHandlers.repay(request, requestId);
		}
		if (
			whatsAppHandlers &&
			url.pathname === "/api/v1/admin/whatsapp/templates" &&
			request.method === "GET"
		) {
			return whatsAppHandlers.templates(request, requestId);
		}
		if (
			whatsAppHandlers &&
			url.pathname === "/api/v1/admin/whatsapp/messages" &&
			request.method === "GET"
		) {
			return whatsAppHandlers.messages(request, requestId);
		}
		if (
			whatsAppHandlers &&
			url.pathname === "/api/v1/admin/whatsapp/send" &&
			request.method === "POST"
		) {
			return whatsAppHandlers.send(request, requestId);
		}
		if (
			staffInviteHandlers &&
			url.pathname === "/api/v1/admin/staff/invite" &&
			request.method === "POST"
		) {
			return staffInviteHandlers.invite(request, requestId);
		}
		const staffStatusMatch = url.pathname.match(
			/^\/api\/v1\/admin\/staff\/([^/]+)\/status$/,
		);
		if (staffStatusHandlers && staffStatusMatch && request.method === "PATCH") {
			return staffStatusHandlers.setStatus(
				request,
				requestId,
				staffStatusMatch[1] ?? "",
			);
		}
		if (
			branchHandlers &&
			url.pathname === "/api/v1/branches" &&
			request.method === "GET"
		) {
			return branchHandlers.list(request, requestId);
		}
		const branchMatch = url.pathname.match(
			/^\/api\/v1\/admin\/branches(?:\/([^/]+))?$/,
		);
		if (
			branchHandlers &&
			branchMatch &&
			(request.method === "POST" ||
				request.method === "PATCH" ||
				request.method === "DELETE")
		) {
			return branchHandlers.mutate(request, requestId, branchMatch[1]);
		}
		if (
			roomHandlers &&
			url.pathname === "/api/v1/admin/rooms" &&
			request.method === "GET"
		) {
			return roomHandlers.list(request, requestId);
		}
		const roomMatch = url.pathname.match(
			/^\/api\/v1\/admin\/rooms(?:\/([^/]+))?$/,
		);
		if (
			roomHandlers &&
			roomMatch &&
			(request.method === "POST" ||
				request.method === "PATCH" ||
				request.method === "DELETE")
		) {
			return roomHandlers.mutate(request, requestId, roomMatch[1]);
		}
		if (
			invoiceHandlers &&
			url.pathname === "/api/v1/admin/invoices" &&
			request.method === "GET"
		) {
			return invoiceHandlers.list(request, requestId);
		}
		if (
			invoiceHandlers &&
			url.pathname === "/api/v1/admin/invoices" &&
			request.method === "POST"
		) {
			return invoiceHandlers.create(request, requestId);
		}
		const invoicePaymentMatch = url.pathname.match(
			/^\/api\/v1\/admin\/invoices\/([^/]+)\/payment$/,
		);
		if (invoiceHandlers && invoicePaymentMatch && request.method === "POST") {
			return invoiceHandlers.payment(
				request,
				requestId,
				invoicePaymentMatch[1] ?? "",
			);
		}
		const invoiceVoidMatch = url.pathname.match(
			/^\/api\/v1\/admin\/invoices\/([^/]+)\/void$/,
		);
		if (invoiceHandlers && invoiceVoidMatch && request.method === "POST") {
			return invoiceHandlers.void(
				request,
				requestId,
				invoiceVoidMatch[1] ?? "",
			);
		}
		if (
			shiftHandlers &&
			url.pathname === "/api/v1/admin/shifts" &&
			request.method === "GET"
		) {
			return shiftHandlers.list(request, requestId);
		}
		if (
			shiftHandlers &&
			url.pathname === "/api/v1/admin/shifts/on-shift" &&
			request.method === "GET"
		) {
			return shiftHandlers.onShift(request, requestId);
		}
		if (
			shiftHandlers &&
			url.pathname === "/api/v1/admin/shifts/clock-in" &&
			request.method === "POST"
		) {
			return shiftHandlers.clockIn(request, requestId);
		}
		if (
			shiftHandlers &&
			url.pathname === "/api/v1/admin/shifts/clock-out" &&
			request.method === "POST"
		) {
			return shiftHandlers.clockOut(request, requestId);
		}
		if (
			returnHandlers &&
			url.pathname === "/api/v1/admin/returns" &&
			request.method === "GET"
		) {
			return returnHandlers.list(request, requestId);
		}
		if (
			returnHandlers &&
			url.pathname === "/api/v1/admin/returns" &&
			request.method === "POST"
		) {
			return returnHandlers.create(request, requestId);
		}
		if (
			boardingHandlers &&
			url.pathname === "/api/v1/admin/boardings" &&
			request.method === "GET"
		) {
			return boardingHandlers.list(request, requestId);
		}
		if (
			groomingHandlers &&
			url.pathname === "/api/v1/admin/grooming/appointments" &&
			request.method === "GET"
		) {
			return groomingHandlers.list(request, requestId);
		}
		if (
			documentTemplateHandlers &&
			url.pathname === "/api/v1/admin/document-templates" &&
			request.method === "GET"
		) {
			return documentTemplateHandlers.list(request, requestId);
		}
		if (
			dashboardHandlers &&
			url.pathname === "/api/v1/admin/dashboard/top-sellers" &&
			request.method === "GET"
		) {
			return dashboardHandlers.topSellers(request, requestId);
		}
		if (
			portalHandlers &&
			url.pathname === "/api/v1/admin/portal" &&
			request.method === "GET"
		) {
			return portalHandlers.get(request, requestId);
		}
		if (
			holidayHandlers &&
			url.pathname === "/api/v1/admin/branch-holidays" &&
			request.method === "GET"
		) {
			return holidayHandlers.list(request, requestId);
		}
		if (
			holidayHandlers &&
			url.pathname === "/api/v1/admin/branch-holidays" &&
			request.method === "POST"
		) {
			return holidayHandlers.create(request, requestId);
		}
		const holidayMatch = url.pathname.match(
			/^\/api\/v1\/admin\/branch-holidays\/([^/]+)$/,
		);
		if (holidayHandlers && holidayMatch && request.method === "DELETE") {
			return holidayHandlers.delete(request, requestId, holidayMatch[1] ?? "");
		}
		if (
			expenseHandlers &&
			url.pathname === "/api/v1/admin/expenses" &&
			request.method === "GET"
		) {
			return expenseHandlers.list(request, requestId);
		}
		if (
			accountingHandlers &&
			url.pathname === "/api/v1/admin/accounting/dashboard-metrics" &&
			request.method === "GET"
		) {
			return accountingHandlers.dashboardMetrics(request, requestId);
		}
		if (
			ledgerHandlers &&
			url.pathname === "/api/v1/admin/accounting/accounts" &&
			request.method === "GET"
		) {
			return ledgerHandlers.accounts(request, requestId);
		}
		if (
			ledgerHandlers &&
			url.pathname === "/api/v1/admin/accounting/journal" &&
			request.method === "GET"
		) {
			return ledgerHandlers.journal(request, requestId);
		}
		if (
			accountingReportHandlers &&
			url.pathname === "/api/v1/admin/accounting/cash-flow" &&
			request.method === "GET"
		) {
			return accountingReportHandlers.cashFlow(request, requestId);
		}
		if (
			accountingReportHandlers &&
			url.pathname === "/api/v1/admin/accounting/commissions" &&
			request.method === "GET"
		) {
			return accountingReportHandlers.commissions(request, requestId);
		}
		if (
			loyaltyHandlers &&
			url.pathname === "/api/v1/admin/loyalty/config" &&
			request.method === "GET"
		) {
			return loyaltyHandlers.config(request, requestId);
		}
		if (
			loyaltyHandlers &&
			url.pathname === "/api/v1/admin/loyalty/config" &&
			request.method === "PATCH"
		) {
			return loyaltyHandlers.updateConfig(request, requestId);
		}
		if (
			loyaltyHandlers &&
			url.pathname === "/api/v1/admin/loyalty/movements" &&
			request.method === "GET"
		) {
			return loyaltyHandlers.movements(request, requestId);
		}
		if (
			loyaltyHandlers &&
			url.pathname === "/api/v1/admin/loyalty/redeem" &&
			request.method === "POST"
		) {
			return loyaltyHandlers.redeem(request, requestId);
		}
		if (
			expenseHandlers &&
			url.pathname === "/api/v1/admin/expenses" &&
			request.method === "POST"
		) {
			return expenseHandlers.create(request, requestId);
		}
		if (
			portalHandlers &&
			url.pathname === "/api/v1/admin/portal/services" &&
			request.method === "POST"
		) {
			return portalHandlers.createService(request, requestId);
		}
		const portalServiceStatusMatch = url.pathname.match(
			/^\/api\/v1\/admin\/portal\/services\/([^/]+)\/status$/,
		);
		if (
			portalHandlers &&
			portalServiceStatusMatch &&
			request.method === "PATCH"
		) {
			return portalHandlers.updateServiceStatus(
				request,
				requestId,
				portalServiceStatusMatch[1] ?? "",
			);
		}
		const portalServiceMatch = url.pathname.match(
			/^\/api\/v1\/admin\/portal\/services\/([^/]+)$/,
		);
		if (portalHandlers && portalServiceMatch && request.method === "DELETE") {
			return portalHandlers.deleteService(
				request,
				requestId,
				portalServiceMatch[1] ?? "",
			);
		}
		if (
			portalHandlers &&
			url.pathname === "/api/v1/admin/portal/config" &&
			request.method === "PATCH"
		) {
			return portalHandlers.updateConfig(request, requestId);
		}
		if (
			documentTemplateHandlers &&
			url.pathname === "/api/v1/admin/document-templates" &&
			request.method === "POST"
		) {
			return documentTemplateHandlers.save(request, requestId);
		}
		const groomingStatusMatch = url.pathname.match(
			/^\/api\/v1\/admin\/grooming\/appointments\/([^/]+)\/status$/,
		);
		if (groomingHandlers && groomingStatusMatch && request.method === "PATCH") {
			return groomingHandlers.updateStatus(
				request,
				requestId,
				groomingStatusMatch[1] ?? "",
			);
		}
		if (
			boardingHandlers &&
			url.pathname === "/api/v1/admin/boardings" &&
			request.method === "POST"
		) {
			return boardingHandlers.create(request, requestId);
		}
		const boardingStatusMatch = url.pathname.match(
			/^\/api\/v1\/admin\/boardings\/([^/]+)\/status$/,
		);
		if (boardingHandlers && boardingStatusMatch && request.method === "PATCH") {
			return boardingHandlers.updateStatus(
				request,
				requestId,
				boardingStatusMatch[1] ?? "",
			);
		}
		if (
			catalogHandlers &&
			url.pathname.startsWith("/api/v1/admin/") &&
			request.method === "GET"
		) {
			const resource = url.pathname.slice("/api/v1/admin/".length);
			if (
				resource === "products" ||
				resource === "customers" ||
				resource === "pets" ||
				resource === "staff"
			) {
				return catalogHandlers.list(resource, request, requestId);
			}
		}
		if (
			catalogHandlers &&
			url.pathname === "/api/v1/admin/customers" &&
			request.method === "POST"
		) {
			return catalogHandlers.mutateCustomer(request, requestId);
		}
		if (
			catalogHandlers &&
			url.pathname === "/api/v1/admin/pets" &&
			request.method === "POST"
		) {
			return catalogHandlers.mutatePet(request, requestId);
		}
		const petMatch = url.pathname.match(/^\/api\/v1\/admin\/pets\/([^/]+)$/);
		if (
			catalogHandlers &&
			petMatch &&
			(request.method === "PATCH" || request.method === "DELETE")
		) {
			return catalogHandlers.mutatePet(request, requestId, petMatch[1]);
		}
		const customerMatch = url.pathname.match(
			/^\/api\/v1\/admin\/customers\/([^/]+)$/,
		);
		if (
			catalogHandlers &&
			customerMatch &&
			(request.method === "PATCH" || request.method === "DELETE")
		) {
			return catalogHandlers.mutateCustomer(
				request,
				requestId,
				customerMatch[1],
			);
		}
		if (
			catalogHandlers &&
			url.pathname === "/api/v1/admin/products" &&
			request.method === "POST"
		) {
			return catalogHandlers.mutateProduct(request, requestId);
		}
		const productMatch = url.pathname.match(
			/^\/api\/v1\/admin\/products\/([^/]+)$/,
		);
		if (
			catalogHandlers &&
			productMatch &&
			(request.method === "PATCH" || request.method === "DELETE")
		) {
			return catalogHandlers.mutateProduct(request, requestId, productMatch[1]);
		}
		const staffMatch = url.pathname.match(/^\/api\/v1\/admin\/staff\/([^/]+)$/);
		if (catalogHandlers && staffMatch && request.method === "DELETE") {
			return catalogHandlers.removeStaff(
				request,
				requestId,
				staffMatch[1] ?? "",
			);
		}
		if (
			inventoryHandlers &&
			url.pathname === "/api/v1/admin/inventory" &&
			request.method === "GET"
		) {
			return inventoryHandlers.snapshot(request, requestId);
		}
		if (
			inventoryHandlers &&
			url.pathname === "/api/v1/admin/inventory/adjust" &&
			request.method === "POST"
		) {
			return inventoryHandlers.adjust(request, requestId);
		}
		if (
			orderHandlers &&
			url.pathname === "/api/v1/admin/orders" &&
			request.method === "GET"
		) {
			return orderHandlers.list(request, requestId);
		}
		if (
			orderHandlers &&
			url.pathname === "/api/v1/admin/orders" &&
			request.method === "POST"
		) {
			return orderHandlers.create(request, requestId);
		}
		const orderPaidMatch = url.pathname.match(
			/^\/api\/v1\/admin\/orders\/([^/]+)\/mark-paid$/,
		);
		if (orderHandlers && orderPaidMatch && request.method === "POST") {
			return orderHandlers.markPaid(
				request,
				requestId,
				orderPaidMatch[1] ?? "",
			);
		}
		const voidOrderMatch = url.pathname.match(
			/^\/api\/v1\/admin\/orders\/([^/]+)\/void$/,
		);
		if (orderHandlers && voidOrderMatch && request.method === "POST") {
			return orderHandlers.void(request, requestId, voidOrderMatch[1] ?? "");
		}
		if (
			referenceHandlers &&
			url.pathname.startsWith("/api/v1/admin/") &&
			request.method === "GET"
		) {
			const resource = url.pathname.slice("/api/v1/admin/".length);
			if (resource === "suppliers" || resource === "warehouses") {
				return referenceHandlers.list(resource, request, requestId);
			}
		}
		const referenceMatch = url.pathname.match(
			/^\/api\/v1\/admin\/(suppliers|warehouses)(?:\/([^/]+))?$/,
		);
		if (
			referenceHandlers &&
			referenceMatch &&
			(request.method === "POST" ||
				request.method === "PATCH" ||
				request.method === "DELETE")
		) {
			return referenceHandlers.mutate(
				referenceMatch[1] as "suppliers" | "warehouses",
				request,
				requestId,
				referenceMatch[2],
			);
		}
		if (
			purchaseHandlers &&
			url.pathname === "/api/v1/admin/purchase-orders" &&
			request.method === "GET"
		) {
			return purchaseHandlers.list(request, requestId);
		}
		if (
			purchaseHandlers &&
			url.pathname === "/api/v1/admin/purchase-orders" &&
			request.method === "POST"
		) {
			return purchaseHandlers.create(request, requestId);
		}
		const purchaseStatusMatch = url.pathname.match(
			/^\/api\/v1\/admin\/purchase-orders\/([^/]+)\/status$/,
		);
		if (purchaseHandlers && purchaseStatusMatch && request.method === "PATCH") {
			return purchaseHandlers.updateStatus(
				request,
				requestId,
				purchaseStatusMatch[1] ?? "",
			);
		}
		if (
			purchaseHandlers &&
			url.pathname === "/api/v1/admin/purchase-orders/receive" &&
			request.method === "POST"
		) {
			return purchaseHandlers.receive(request, requestId);
		}
		if (url.pathname === "/api/v1/health" && request.method === "GET") {
			return jsonSuccess({ status: "ok" }, requestId);
		}

		return undefined;
	};
}

const authProgramDependencies = createAuthProgramDependencies();
const defaultRestRequestHandler = createRestRequestHandler(
	createAuthHandlers(authProgramDependencies),
	createBranchHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) =>
			runApp(getBranchesProgram(businessId as TTenantId)),
		mutate: async (businessId, userId, id, input) => {
			if (id && Object.keys(input).length === 0) {
				await runApp(deleteBranchProgram(id, businessId as TTenantId));
				return { deleted: true };
			}
			if (id) {
				const value = Schema.decodeUnknownSync(UpdateBranchSchema)({
					...input,
					id,
				});
				await runApp(updateBranchProgram(value, businessId as TTenantId));
				return { updated: true };
			}
			const value = Schema.decodeUnknownSync(CreateBranchSchema)(input);
			const branch = await runApp(
				createBranchProgram(value, businessId as TTenantId, userId),
			);
			return branch;
		},
	}),
	createCatalogHandlers({
		session: async (token) => authProgramDependencies.session(token),
		products: async (businessId) =>
			runApp(getProductsProgram(businessId as TTenantId)),
		customers: async (businessId) =>
			runApp(getCustomersProgram(businessId as TTenantId)),
		pets: async (businessId) => runApp(getPetsProgram(businessId as TTenantId)),
		staff: async (businessId) =>
			runApp(getStaffMembersProgram(businessId as TTenantId)),
		createCustomer: async (businessId, input) =>
			runApp(createCustomerProgram(businessId as TTenantId, input)),
		updateCustomer: async (businessId, input) =>
			runApp(updateCustomerProgram(businessId as TTenantId, input)),
		deleteCustomer: async (businessId, id) => {
			await runApp(deleteCustomerProgram(businessId as TTenantId, id));
		},
		createPet: async (businessId, input) =>
			runApp(addPetProgram(businessId as TTenantId, input)),
		updatePet: async (businessId, input) =>
			runApp(updatePetProgram(businessId as TTenantId, input)),
		deletePet: async (businessId, id) => {
			await runApp(deletePetProgram(businessId as TTenantId, id as TPetId));
		},
		createProduct: async (businessId, input) => {
			const product = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(CreateProductSchema)({
						name: input.name,
						category: input.category ?? null,
						hasVariants: false,
						isActive: true,
					}),
					(command) => addProductProgram(command, businessId as TTenantId),
				),
			);
			const variant = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(CreateVariantSchema)({
						productId: product.id,
						name: "Default",
						sku: typeof input.sku === "string" ? input.sku : null,
						price: typeof input.price === "number" ? input.price : 0,
						stock: typeof input.stock === "number" ? input.stock : 0,
						lowStockThreshold:
							typeof input.reorderLevel === "number" ? input.reorderLevel : 0,
						unit: "pcs",
					}),
					(command) => addVariantProgram(command, businessId as TTenantId),
				),
			);
			return { ...product, variants: [variant] };
		},
		updateProduct: async (businessId, input) => {
			const product = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(UpdateProductSchema)({
						id: input.id,
						name: input.name,
						category: input.category ?? null,
					}),
					(command) => updateProductProgram(command, businessId as TTenantId),
				),
			);
			const existing = await runApp(
				getProductProgram(product.id, businessId as TTenantId),
			);
			const variant = existing?.variants[0];
			if (!variant) return product;
			const updatedVariant = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(UpdateVariantSchema)({
						id: variant.id,
						productId: product.id,
						name: variant.name,
						sku: typeof input.sku === "string" ? input.sku : variant.sku,
						price:
							typeof input.price === "number" ? input.price : variant.price,
						stock:
							typeof input.stock === "number" ? input.stock : variant.stock,
						lowStockThreshold:
							typeof input.reorderLevel === "number"
								? input.reorderLevel
								: variant.lowStockThreshold,
						unit: variant.unit,
					}),
					(command) => updateVariantProgram(command, businessId as TTenantId),
				),
			);
			return { ...product, variants: [updatedVariant] };
		},
		deleteProduct: async (businessId, userId, id) => {
			await runApp(
				deleteProductProgram(id, businessId as TTenantId, userId as TUserId),
			);
		},
		removeStaff: async (businessId, _userId, id, branchId) => {
			await runApp(
				removeStaffFromBranchProgram(
					{ userId: id, branchId },
					businessId as TTenantId,
				),
			);
		},
	}),
	createInventoryHandlers({
		session: async (token) => authProgramDependencies.session(token),
		snapshot: async (businessId) => {
			const products = await runApp(
				getProductsProgram(businessId as TTenantId),
			);
			const variants = products.flatMap((product) => product.variants);
			const batches = await Promise.all(
				variants.map((variant) =>
					runApp(
						getBatchesProgram(
							businessId as TTenantId,
							variant.id as TProductVariantId,
						),
					),
				),
			);
			const movements = await Promise.all(
				variants.map((variant) =>
					runApp(
						getMovementsProgram(
							businessId as TTenantId,
							variant.id as TProductVariantId,
						),
					),
				),
			);
			return {
				batches: batches.flat().map((batch) => ({
					...batch,
					receivedAt: batch.receivedAt.toISOString(),
					expiryDate: batch.expiryDate?.toISOString() ?? null,
					createdAt: batch.createdAt.toISOString(),
					updatedAt: batch.updatedAt.toISOString(),
				})),
				movements: movements.flat().map((movement) => ({
					...movement,
					createdAt: movement.createdAt.toISOString(),
				})),
			};
		},
		adjust: async (businessId, input) => {
			const variantId = String(input.variantId);
			const quantity = typeof input.quantity === "number" ? input.quantity : 0;
			const notes =
				typeof input.notes === "string" ? input.notes : "Manual adjustment";
			if (quantity > 0) {
				await runApp(
					addBatchProgram(businessId as TTenantId, {
						variantId,
						batchNumber: "MANUAL",
						quantity,
						costPrice: 0,
						expiryDate: null,
						notes,
					}),
				);
				return;
			}
			if (quantity < 0) {
				await runApp(
					deductStockProgram(businessId as TTenantId, {
						variantId,
						quantity: Math.abs(quantity),
						referenceType: "adjustment",
						referenceId: crypto.randomUUID(),
						notes,
					}),
				);
			}
		},
	}),
	createOrderHandlers({
		session: async (token) => {
			const session = await authProgramDependencies.session(token);
			if (!session) return null;
			return {
				business: session.business,
				user: session.user,
				branchId: session.branches[0]?.id ?? "",
			};
		},
		list: async (businessId) => {
			return runApp(getOrdersProgram(businessId as TTenantId));
		},
		create: async (businessId, userId, input) => {
			const value = Schema.decodeUnknownSync(CreateOrderSchema)(input);
			return runApp(
				createOrderProgram(value, businessId as TTenantId, userId as TUserId),
			);
		},
		void: async (businessId, userId, id, reason) => {
			const value = Schema.decodeUnknownSync(VoidOrderSchema)({
				orderId: id,
				reason,
			});
			await runApp(
				voidOrderProgram(value, businessId as TTenantId, userId as TUserId),
			);
		},
		markPaid: async (businessId, id) => ({
			paid: await runApp(markOrderPaidProgram(businessId as TTenantId, id)),
		}),
	}),
	createReferenceHandlers({
		session: async (token) => authProgramDependencies.session(token),
		suppliers: async (businessId) => {
			const suppliers = await runApp(
				getSuppliersProgram(businessId as TTenantId),
			);
			return suppliers.map((supplier) => ({
				...supplier,
				createdAt: supplier.createdAt.toISOString(),
				updatedAt: supplier.updatedAt.toISOString(),
			}));
		},
		warehouses: async (businessId) => {
			const warehouses = await runApp(
				getWarehousesProgram(businessId as TTenantId),
			);
			return warehouses.map((warehouse) => ({
				...warehouse,
				createdAt: warehouse.createdAt.toISOString(),
				updatedAt: warehouse.updatedAt.toISOString(),
			}));
		},
		mutate: async (resource, businessId, id, input) => {
			if (resource === "suppliers") {
				if (!id) {
					const value = Schema.decodeUnknownSync(CreateSupplierSchema)(input);
					const supplier = await runApp(
						addSupplierProgram(value, businessId as TTenantId),
					);
					return serializeReference(supplier);
				}
				if (Object.keys(input).length === 0) {
					await runApp(
						deleteSupplierProgram(id as TSupplierId, businessId as TTenantId),
					);
					return { deleted: true };
				}
				const value = Schema.decodeUnknownSync(UpdateSupplierSchema)({
					...input,
					id,
				});
				return serializeReference(
					await runApp(updateSupplierProgram(value, businessId as TTenantId)),
				);
			}
			if (!id) {
				const value = Schema.decodeUnknownSync(CreateWarehouseSchema)(input);
				return serializeReference(
					await runApp(createWarehouseProgram(value, businessId as TTenantId)),
				);
			}
			if (Object.keys(input).length === 0) {
				await runApp(
					deleteWarehouseProgram(id as TWarehouseId, businessId as TTenantId),
				);
				return { deleted: true };
			}
			const value = Schema.decodeUnknownSync(CreateWarehouseSchema)(input);
			return serializeReference(
				await runApp(
					updateWarehouseProgram(
						id as TWarehouseId,
						value,
						businessId as TTenantId,
					),
				),
			);
		},
	}),
	createRoomHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId, branchId) => {
			const rooms = await runApp(
				Effect.gen(function* (_) {
					const repo = yield* _(RoomRepository);
					return yield* _(
						repo.getRooms(businessId as TTenantId, branchId ?? ""),
					);
				}),
			);
			return rooms.map(serializeRoom);
		},
		mutate: async (businessId, id, input) => {
			if (id && Object.keys(input).length === 0) {
				await runApp(deleteRoomProgram(businessId as TTenantId, id as TRoomId));
				return { deleted: true };
			}
			if (id) {
				return serializeRoom(
					await runApp(
						updateRoomProgram(businessId as TTenantId, id as TRoomId, input),
					),
				);
			}
			return serializeRoom(
				await runApp(createRoomProgram(businessId as TTenantId, input)),
			);
		},
	}),
	createPurchaseHandlers({
		session: async (token) => {
			const session = await authProgramDependencies.session(token);
			if (!session) return null;
			return { business: session.business, userId: session.user.id };
		},
		list: async (businessId) => {
			const orders = await runApp(
				getPurchaseOrdersProgram(businessId as TTenantId),
			);
			return orders.map((order) => ({
				...order,
				orderDate: order.orderDate.toISOString(),
				expectedDate: order.expectedDate?.toISOString() ?? null,
				createdAt: order.createdAt.toISOString(),
				updatedAt: order.updatedAt.toISOString(),
			}));
		},
		create: async (businessId, userId, input) => {
			const value = Schema.decodeUnknownSync(CreatePurchaseOrderSchema)({
				...input,
				expectedDate:
					typeof input.expectedDate === "string"
						? new Date(input.expectedDate)
						: (input.expectedDate ?? null),
			});
			const order = await runApp(
				createPurchaseOrderProgram(
					value,
					businessId as TTenantId,
					userId as TUserId,
				),
			);
			return {
				...order,
				orderDate: order.orderDate.toISOString(),
				expectedDate: order.expectedDate?.toISOString() ?? null,
				createdAt: order.createdAt.toISOString(),
				updatedAt: order.updatedAt.toISOString(),
			};
		},
		updateStatus: async (businessId, id, status) => {
			await runApp(
				updatePoStatusProgram(
					id as TPurchaseOrderId,
					businessId as TTenantId,
					status,
				),
			);
		},
		receive: async (businessId, userId, input) => {
			const value = Schema.decodeUnknownSync(ReceivePurchaseOrderSchema)({
				...input,
				items: Array.isArray(input.items)
					? input.items.map((item) => {
							if (!isRecord(item)) return item;
							return {
								...item,
								expiryDate:
									typeof item.expiryDate === "string"
										? new Date(item.expiryDate)
										: (item.expiryDate ?? null),
							};
						})
					: input.items,
			});
			const result = await runApp(
				receivePurchaseOrderProgram(
					value,
					businessId as TTenantId,
					userId as TUserId,
				),
			);
			return result;
		},
	}),
	createInvoiceHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) =>
			runApp(getInvoicesProgram(businessId as TTenantId)),
		create: async (businessId, input) => {
			const value = Schema.decodeUnknownSync(InvoiceCreateSchema)(input);
			return runApp(
				createInvoiceProgram(
					businessId as TTenantId,
					value as ICreateInvoiceCommand,
				),
			);
		},
		payment: async (businessId, invoiceId, input) => {
			const value = Schema.decodeUnknownSync(InvoicePaymentSchema)(input);
			await runApp(
				recordPaymentProgram(
					businessId as TTenantId,
					invoiceId as TInvoiceId,
					value as IRecordPaymentCommand,
				),
			);
			return runApp(
				getInvoiceByIdProgram(businessId as TTenantId, invoiceId as TInvoiceId),
			);
		},
		void: async (businessId, invoiceId) => {
			await runApp(
				voidInvoiceProgram(businessId as TTenantId, invoiceId as TInvoiceId),
			);
		},
	}),
	createShiftHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) => {
			const rows = await runApp(
				getAllAttendanceProgram(businessId as TTenantId),
			);
			return rows.map((row) => ({
				...serializeAttendance(row.attendance),
				staffName: row.staffName,
			}));
		},
		onShift: async (businessId) => {
			const rows = await runApp(
				getAllAttendanceProgram(businessId as TTenantId),
			);
			return rows
				.filter((row) => row.attendance.clockIn && !row.attendance.clockOut)
				.map((row) => ({
					staffId: row.attendance.staffId,
					staffName: row.staffName,
					since: row.attendance.clockIn?.toISOString() ?? "",
				}));
		},
		clockIn: async (businessId, input) => {
			const attendance = await runApp(
				clockInProgram(businessId as TTenantId, input),
			);
			return serializeAttendance(attendance);
		},
		clockOut: async (businessId, input) => {
			const attendance = await runApp(
				clockOutProgram(businessId as TTenantId, input),
			);
			return serializeAttendance(attendance);
		},
	}),
	createReturnHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) =>
			runApp(getReturnsProgram(businessId as TTenantId)),
		create: async (businessId, userId, input) => {
			const value = Schema.decodeUnknownSync(CreateReturnSchema)(input);
			const id = await runApp(
				processReturnProgram(value, businessId as TTenantId, userId as TUserId),
			);
			return id;
		},
	}),
	createBoardingHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) =>
			runApp(getBoardingsProgram(businessId as TTenantId)),
		create: async (businessId, userId, input) => {
			const value = Schema.decodeUnknownSync(CreateBoardingSchema)(input);
			return runApp(
				createBoardingProgram(
					value,
					businessId as TTenantId,
					userId as TUserId,
				),
			);
		},
		updateStatus: async (businessId, id, status) => {
			await runApp(
				updateBoardingStatusProgram(
					{ id, status: status as "draft" | "active" | "completed" },
					businessId as TTenantId,
				),
			);
		},
	}),
	createGroomingHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) => {
			const appointments = await runApp(
				getCalendarPrograms(businessId as TTenantId, {
					start: new Date(0),
					end: new Date("2100-01-01T00:00:00.000Z"),
				}),
			);
			return appointments.map(serializeGroomingAppointment);
		},
		updateStatus: async (businessId, id, status) =>
			serializeGroomingAppointment(
				await runApp(
					updateAppointmentStatusProgram(
						businessId as TTenantId,
						id as TGroomingAppointment["id"],
						status,
					),
				),
			),
	}),
	createDocumentTemplateHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) => {
			const templates = await Promise.all(
				["receipt", "agreement"].map((type) =>
					runApp(getTemplateByTypeProgram(businessId, type)),
				),
			);
			return templates
				.filter((template): template is IDocumentTemplate => template !== null)
				.map(serializeDocumentTemplate);
		},
		save: async (businessId, input) => {
			const content = normalizeTemplateContent(input.content);
			const command =
				typeof input.id === "string"
					? {
							id: input.id as TTemplateId,
							businessId,
							content,
						}
					: {
							type: typeof input.type === "string" ? input.type : "receipt",
							name: typeof input.name === "string" ? input.name : "Template",
							content,
						};
			return serializeDocumentTemplate(
				await runApp(upsertTemplateProgram(businessId, command)),
			);
		},
	}),
	createDashboardHandlers({
		session: async (token) => authProgramDependencies.session(token),
		topSellers: async (businessId) =>
			runApp(getTopSellersProgram(businessId as TTenantId)),
	}),
	createPortalHandlers({
		session: async (token) => authProgramDependencies.session(token),
		get: async (businessId) => {
			const tenantId = businessId as TTenantId;
			const [config, services, stats, reviews] = await Promise.all([
				runApp(getPortalConfigProgram(tenantId)),
				runApp(getPortalServicesProgram(tenantId)),
				runApp(getPortalStatsProgram(tenantId)),
				runApp(getPortalReviewsProgram(tenantId)),
			]);
			return {
				config: {
					slug: config.slug,
					isActive: config.isActive,
					bookingEnabled: config.bookingEnabled,
				},
				services,
				stats,
				reviews: reviews.map((review) => ({
					...review,
					createdAt: review.createdAt,
				})),
			};
		},
		createService: async (businessId, input) =>
			runApp(
				createPortalServiceProgram(businessId as TTenantId, {
					tenantId: businessId as TTenantId,
					name: typeof input.name === "string" ? input.name : "Service",
					description:
						typeof input.description === "string" ? input.description : null,
					durationMinutes:
						typeof input.durationMinutes === "number"
							? input.durationMinutes
							: 60,
					price: typeof input.price === "number" ? input.price : 0,
					isActive: true,
					category:
						typeof input.category === "string"
							? (input.category as
									| "freshwater"
									| "saltwater"
									| "terrarium"
									| "other")
							: null,
				}),
			),
		updateServiceStatus: async (businessId, id, isActive) =>
			runApp(
				updatePortalServiceStatusProgram(
					businessId as TTenantId,
					id as TPortalServiceId,
					isActive,
				),
			),
		deleteService: async (businessId, id) =>
			runApp(
				deletePortalServiceProgram(
					businessId as TTenantId,
					id as TPortalServiceId,
				),
			),
		updateConfig: async (businessId, input) => {
			const command: UpdatePortalConfigCommand = {
				...(typeof input.slug === "string" ? { slug: input.slug } : {}),
				...(typeof input.isActive === "boolean"
					? { isActive: input.isActive }
					: {}),
				...(typeof input.bookingEnabled === "boolean"
					? { bookingEnabled: input.bookingEnabled }
					: {}),
			};
			await runApp(updatePortalConfigProgram(command, businessId as TTenantId));
		},
	}),
	createHolidayHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) => {
			const branches = await runApp(
				getBranchesProgram(businessId as TTenantId),
			);
			const holidays = await Promise.all(
				branches.map((branch) =>
					runApp(getBranchHolidaysProgram(branch.id, businessId as TTenantId)),
				),
			);
			return holidays.flat().map(serializeBranchHoliday);
		},
		create: async (businessId, input) => {
			const command = Schema.decodeUnknownSync(CreateBranchHolidaySchema)({
				...input,
				date: new Date(
					typeof input.date === "string"
						? input.date
						: new Date().toISOString(),
				),
			});
			return serializeBranchHoliday(
				await runApp(
					createBranchHolidayProgram(command, businessId as TTenantId),
				),
			);
		},
		delete: async (businessId, id) => {
			const branches = await runApp(
				getBranchesProgram(businessId as TTenantId),
			);
			const holidays = await Promise.all(
				branches.map((branch) =>
					runApp(getBranchHolidaysProgram(branch.id, businessId as TTenantId)),
				),
			);
			const holiday = holidays.flat().find((item) => item.id === id);
			if (!holiday) return;
			await runApp(
				deleteBranchHolidayProgram(
					{ id, branchId: holiday.branchId },
					businessId as TTenantId,
				),
			);
		},
	}),
	createExpenseHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) =>
			runApp(getExpensesProgram(businessId as TTenantId)),
		create: async (businessId, userId, input) => {
			const command = Schema.decodeUnknownSync(CreateExpenseSchema)({
				...input,
				expenseDate: new Date(
					typeof input.expenseDate === "string"
						? input.expenseDate
						: new Date().toISOString(),
				),
				branchId: typeof input.branchId === "string" ? input.branchId : null,
				receiptUrl:
					typeof input.receiptUrl === "string" ? input.receiptUrl : null,
				notes: typeof input.notes === "string" ? input.notes : null,
			});
			return runApp(
				createExpenseProgram(
					command,
					businessId as TTenantId,
					userId as TUserId,
				),
			);
		},
	}),
	createAccountingHandlers({
		session: async (token) => authProgramDependencies.session(token),
		dashboardMetrics: async (businessId) =>
			runApp(getDashboardMetricsProgram(businessId as TTenantId)),
	}),
	createLedgerHandlers({
		session: async (token) => authProgramDependencies.session(token),
		accounts: async (businessId) =>
			runApp(getChartOfAccountsProgram(businessId as TTenantId)),
		journal: async (businessId) =>
			runApp(getJournalEntriesProgram(businessId as TTenantId)),
	}),
	createAccountingReportHandlers({
		session: async (token) => authProgramDependencies.session(token),
		cashFlow: async (businessId) =>
			runApp(getCashFlowReportProgram(businessId as TTenantId)),
		commissions: async (businessId) => {
			const rows = await runApp(
				getCommissionReportProgram(businessId as TTenantId),
			);
			return rows.map((row) => ({
				...row,
				date: row.date.toISOString(),
			}));
		},
	}),
	createLoyaltyHandlers({
		session: async (token) => authProgramDependencies.session(token),
		config: async (businessId) => {
			const result = await runApp(
				getLoyaltyConfigProgram(businessId as TTenantId),
			);
			return {
				pointsPerRupiah: result.config.pointsPerRupiah,
				pointsExpiryDays: result.config.pointsExpiryDays,
				minRedeemPoints: result.config.minRedeemPoints,
				isActive: result.config.isActive,
				tiers: result.tiers.map((tier) => ({
					name: tier.name,
					minPoints: tier.minPoints,
					discountPercent: tier.discountPercent,
				})),
			};
		},
		updateConfig: async (businessId, input) => {
			const command = Schema.decodeUnknownSync(UpdateLoyaltyConfigSchema)({
				pointsPerRupiah: input.pointsPerRupiah,
				pointsExpiryDays: input.pointsExpiryDays,
				minRedeemPoints: input.minRedeemPoints,
				isActive: input.isActive,
			});
			await runApp(
				updateLoyaltyConfigProgram(command, businessId as TTenantId),
			);
		},
		movements: async (businessId) => {
			const rows = await runApp(
				getLoyaltyTransactionsProgram(businessId as TTenantId),
			);
			return rows.map((row) => ({
				id: row.transaction.id,
				customerId: row.customerId ?? "",
				customerName: row.customerName,
				date: row.transaction.createdAt.toISOString(),
				points:
					row.transaction.type === "redeem"
						? -row.transaction.points
						: row.transaction.points,
				reason: row.transaction.description,
			}));
		},
		redeem: async (businessId, input) => {
			const command = Schema.decodeUnknownSync(RedeemPointsSchema)({
				customerId: input.customerId,
				points: input.points,
			});
			return runApp(redeemPointsProgram(command, businessId as TTenantId));
		},
	}),
	createAuditHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) => {
			const result = await runApp(
				getAuditLogsProgram(businessId as TTenantId, {}),
			);
			return result.logs;
		},
	}),
	createBillingHandlers({
		session: async (token) => authProgramDependencies.session(token),
		get: async (businessId) => {
			const tenantId = businessId as TTenantId;
			const [subscription, history, usage] = await Promise.all([
				runApp(getCurrentSubscriptionProgram(tenantId)),
				runApp(getBillingHistoryProgram(tenantId)),
				runApp(getUsageMetricsProgram(tenantId)),
			]);
			return {
				subscription,
				invoices: history.map((event) => ({
					id: event.id,
					number: event.externalOrderId ?? event.id,
					date: event.createdAt,
					amount: event.amount,
					status: event.status === "success" ? "paid" : "open",
				})),
				usage,
			};
		},
		changePlan: async (businessId, input) => {
			const value = Schema.decodeUnknownSync(
				Schema.Struct({
					plan: Schema.Literal("free", "pro", "business"),
				}),
			)(input);
			return {
				changed: await runApp(
					changeSubscriptionPlanProgram(businessId as TTenantId, value.plan),
				),
			};
		},
	}),
	createAdvanceHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) => {
			const kasbons = await runApp(
				getAllKasbonProgram(businessId as TTenantId),
			);
			return kasbons.map((kasbon) => ({
				id: kasbon.id,
				staffId: kasbon.staffId,
				amount: kasbon.amount,
				remaining: kasbon.remaining,
				installmentAmount: kasbon.installmentAmount,
				notes: kasbon.notes,
				status: kasbon.status,
				createdAt: kasbon.createdAt.toISOString(),
			}));
		},
		create: async (businessId, input) => {
			const value = Schema.decodeUnknownSync(CreateKasbonSchema)({
				...input,
				installmentAmount: input.installmentAmount ?? input.installment,
			});
			const kasbon = await runApp(
				addKasbonProgram(businessId as TTenantId, value),
			);
			return { created: true, id: kasbon.id };
		},
		repay: async (businessId, input) => {
			const value = Schema.decodeUnknownSync(PayKasbonSchema)(input);
			await runApp(payKasbonProgram(businessId as TTenantId, value));
			return { repaid: true };
		},
	}),
	createWhatsAppHandlers({
		session: async (token) => authProgramDependencies.session(token),
		templates: async (businessId) => {
			const templates = await runApp(
				getWhatsAppTemplatesProgram(businessId as TTenantId),
			);
			return templates.map((template) => ({
				id: template.id,
				name: template.name,
				category: template.category,
				body: template.content,
				status: template.isActive ? "approved" : "pending",
			}));
		},
		messages: async (businessId) => {
			const reminders = await runApp(
				getPendingRemindersProgram(businessId as TTenantId),
			);
			return reminders.map((reminder) => ({
				id: reminder.id,
				templateId: reminder.relatedType,
				templateName: reminder.relatedType,
				sentAt:
					reminder.sentAt?.toISOString() ?? reminder.scheduledAt.toISOString(),
				to: reminder.recipientPhone,
				status: reminder.status === "failed" ? "failed" : "pending",
			}));
		},
		send: async (businessId, input) => {
			const customerId =
				typeof input.customerId === "string" ? input.customerId : "";
			const templateId =
				typeof input.templateId === "string" ? input.templateId : "";
			const [customers, templates] = await Promise.all([
				runApp(getCustomersProgram(businessId as TTenantId)),
				runApp(getWhatsAppTemplatesProgram(businessId as TTenantId)),
			]);
			const customer = customers.find((item) => item.id === customerId);
			const template = templates.find((item) => item.id === templateId);
			if (!customer?.phone || !template) {
				return { sent: false };
			}
			const command = Schema.decodeUnknownSync(SendWhatsAppTemplateSchema)({
				to: customer.phone,
				templateName: template.name,
				variables: {},
			});
			const result = await runApp(
				sendWhatsAppTemplateProgram(businessId as TTenantId, command),
			);
			return { sent: result.status === "sent", ...result };
		},
	}),
	createStaffInviteHandlers({
		session: async (token) => authProgramDependencies.session(token),
		invite: async (businessId, input) => {
			const value = Schema.decodeUnknownSync(InviteStaffSchema)(input);
			await runApp(inviteStaffProgram(value, businessId as TTenantId));
			return { sent: true };
		},
	}),
	createStaffStatusHandlers({
		session: async (token) => authProgramDependencies.session(token),
		setStatus: async (businessId, userId, isActive) =>
			runApp(
				setStaffActiveProgram(
					businessId as TTenantId,
					userId as TUserId,
					isActive,
				),
			),
	}),
);

function serializeGroomingAppointment(appointment: TGroomingAppointment) {
	return {
		...appointment,
		scheduledAt: appointment.scheduledAt.toISOString(),
		startedAt: appointment.startedAt?.toISOString() ?? null,
		completedAt: appointment.completedAt?.toISOString() ?? null,
		createdAt: appointment.createdAt.toISOString(),
		updatedAt: appointment.updatedAt.toISOString(),
	};
}

function serializeDocumentTemplate(template: IDocumentTemplate) {
	return {
		id: template.id,
		type: template.type,
		name: template.name,
		content: template.content,
		isActive: template.isActive,
		createdAt: template.createdAt.toISOString(),
		updatedAt: template.updatedAt.toISOString(),
	};
}

function serializeBranchHoliday(holiday: {
	readonly id: string;
	readonly branchId: string;
	readonly name: string;
	readonly date: Date;
	readonly isRecurring: boolean;
	readonly createdAt: Date;
}) {
	return {
		...holiday,
		date: holiday.date.toISOString().slice(0, 10),
		createdAt: holiday.createdAt.toISOString(),
	};
}

function normalizeTemplateContent(value: unknown): IBoardingTemplateContent {
	const content = isRecord(value) ? value : {};
	const stringValue = (key: string): string =>
		typeof content[key] === "string" ? content[key] : "";
	return {
		title: stringValue("title"),
		header: stringValue("header"),
		p1: stringValue("body") || stringValue("p1"),
		p2: stringValue("p2"),
		p3: stringValue("p3"),
		p4: stringValue("p4"),
		footer: stringValue("footer"),
		termsAndConditions: Array.isArray(content.termsAndConditions)
			? content.termsAndConditions.filter(
					(term): term is string => typeof term === "string",
				)
			: [],
		...(typeof content.showLogo === "boolean"
			? { showLogo: content.showLogo }
			: {}),
	};
}

const InvoiceCreateSchema = Schema.Struct({
	customerId: Schema.String,
	issueDate: Schema.String,
	dueDate: Schema.String,
	subtotal: Schema.Number,
	taxAmount: Schema.Number,
	discountAmount: Schema.Number,
	totalAmount: Schema.Number,
	notes: Schema.optionalWith(Schema.String, { exact: true }),
	terms: Schema.optionalWith(Schema.String, { exact: true }),
	items: Schema.Array(
		Schema.Struct({
			itemName: Schema.String,
			quantity: Schema.Number,
			unitPrice: Schema.Number,
			discount: Schema.Number,
			total: Schema.Number,
		}),
	),
});

const InvoicePaymentSchema = Schema.Struct({
	amount: Schema.Number,
	paymentDate: Schema.String,
	method: Schema.String,
	reference: Schema.optionalWith(Schema.String, { exact: true }),
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeReference<
	T extends { readonly createdAt: Date; readonly updatedAt: Date },
>(
	value: T,
): Omit<T, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
} {
	return {
		...value,
		createdAt: value.createdAt.toISOString(),
		updatedAt: value.updatedAt.toISOString(),
	};
}

function serializeRoom<
	T extends { readonly createdAt: Date; readonly updatedAt: Date },
>(
	room: T,
): Omit<T, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
} {
	return {
		...room,
		createdAt: room.createdAt.toISOString(),
		updatedAt: room.updatedAt.toISOString(),
	};
}

function serializeAttendance(attendance: {
	readonly id: string;
	readonly tenantId: string;
	readonly staffId: string;
	readonly date: string;
	readonly clockIn: Date | null;
	readonly clockOut: Date | null;
	readonly notes: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}) {
	return {
		id: attendance.id,
		businessId: attendance.tenantId,
		staffId: attendance.staffId,
		date: attendance.date,
		clockIn: attendance.clockIn?.toISOString() ?? null,
		clockOut: attendance.clockOut?.toISOString() ?? null,
		notes: attendance.notes,
		createdAt: attendance.createdAt.toISOString(),
		updatedAt: attendance.updatedAt.toISOString(),
	};
}

/**
 * Handles REST routes that have been migrated to the direct Pet Store API.
 *
 * @param request the incoming HTTP request.
 * @returns a response for a migrated route, or undefined for the legacy route dispatcher.
 */
export async function handleRestRequest(
	request: Request,
): Promise<Response | undefined> {
	return defaultRestRequestHandler(request);
}
