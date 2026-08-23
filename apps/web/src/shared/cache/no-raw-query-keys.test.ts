import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for the frontend cache migration.
 *
 * Enforces that every file in `MIGRATED_FILES` uses `queryKeys.*` /
 * `invalidateXxx(...)` helpers instead of writing raw string-literal
 * query keys. The list covers all `src/routes/_authenticated/*.tsx` plus
 * key domain hook/infra files, and grows as migration progresses.
 *
 * Raw key patterns must be registered in `RAW_KEY_PATTERNS` for every
 * domain that has canonical keys in `queryKeys`. Add new patterns as
 * domains are migrated.
 */

const MIGRATED_FILES = [
	// === Cache infra ===
	"src/shared/contexts/SessionContext.tsx",
	"src/shared/hooks/use-limits.ts",

	// === Domain hook boundaries ===
	"src/domain/customer/hooks/use-customer-queries.ts",
	"src/domain/product/hooks/use-product-queries.ts",
	"src/domain/boarding/hooks/use-boarding-queries.ts",
	"src/domain/inventory/hooks/use-inventory-queries.ts",
	"src/domain/accounting/hooks/use-accounting-queries.ts",
	"src/domain/portal/hooks/use-portal-queries.ts",

	// === Routes (authenticated) ===
	"src/routes/_authenticated/boardings.index.tsx",
	"src/routes/_authenticated/branches.index.tsx",
	"src/routes/_authenticated/branches.$branchId.rooms.tsx",
	"src/routes/_authenticated/customers.index.tsx",
	"src/routes/_authenticated/dashboard.tsx",
	"src/routes/_authenticated/inventory.index.tsx",
	"src/routes/_authenticated/inventory.batches.tsx",
	"src/routes/_authenticated/inventory.movements.tsx",
	"src/routes/_authenticated/invoices.tsx",
	"src/routes/_authenticated/invoices/$invoiceId.tsx",
	"src/routes/_authenticated/loyalty.tsx",
	"src/routes/_authenticated/pos.tsx",
	"src/routes/_authenticated/products.tsx",
	"src/routes/_authenticated/purchase-orders.tsx",
	"src/routes/_authenticated/settings.billing.tsx",
	"src/routes/_authenticated/staff.tsx",
	"src/routes/_authenticated/staff.$staffId.tsx",
	"src/routes/_authenticated/suppliers.tsx",
	"src/routes/_authenticated/whatsapp.tsx",

	// === Routes (public) ===
	"src/routes/p.$businessSlug.booking.tsx",
	"src/routes/p.$businessId.products.$productId.tsx",
	"src/routes/p.$businessSlug.boarding.tsx",

	// === Domain components with queries ===
	"src/domain/branch/components/BranchHolidayManager/BranchHolidayManager.tsx",
	"src/domain/inventory/components/ManageStockContent.tsx",
	"src/domain/boarding/components/BoardingDetail/BoardingDailyPhotos.tsx",
	"src/domain/boarding/components/BoardingDetail/BoardingOpenBill.tsx",
	"src/domain/boarding/hooks/useBoardingDetail.ts",
] as const;

const RAW_KEY_PATTERNS = [
	// Registered domain keys — add every domain that has queryKeys.xxx()
	/queryKey:\s*\[\s*"products"/,
	/queryKey:\s*\[\s*"boardings"/,
	/queryKey:\s*\[\s*"customers"/,
	/queryKey:\s*\[\s*"dashboardMetrics"/,
	/queryKey:\s*\[\s*"session-info"/,
	/queryKey:\s*\[\s*"session"/,
	/queryKey:\s*\[\s*"branches"/,
	/queryKey:\s*\[\s*"rooms"/,
	/queryKey:\s*\[\s*"suppliers"/,
	/queryKey:\s*\[\s*"loyaltyConfig"/,
	/queryKey:\s*\[\s*"whatsappConfig"/,
	/queryKey:\s*\[\s*"whatsappStats"/,
	/queryKey:\s*\[\s*"whatsappTemplates"/,
	/queryKey:\s*\[\s*"productBatches"/,
	/queryKey:\s*\[\s*"document-template"/,
	/queryKey:\s*\[\s*"subscription"/,
	/queryKey:\s*\[\s*"usageMetrics"/,
	/queryKey:\s*\[\s*"billingHistory"/,
	/queryKey:\s*\[\s*"financialSummary"/,
	/queryKey:\s*\[\s*"purchase-orders"/,
	/queryKey:\s*\[\s*"invoices?"/,
	/queryKey:\s*\[\s*"kasbon"/,
	/queryKey:\s*\[\s*"portalReviews"/,
	/queryKey:\s*\[\s*"portalConfig"/,
	/queryKey:\s*\[\s*"portalBookings"/,
	/queryKey:\s*\[\s*"portalBranches"/,
	/queryKey:\s*\[\s*"portalServices"/,
	/queryKey:\s*\[\s*"portalStats"/,
	/queryKey:\s*\[\s*"public-business"/,
	/queryKey:\s*\[\s*"public-product"/,
	/queryKey:\s*\[\s*"expenses"/,
	/queryKey:\s*\[\s*"pettyCash"/,
	/queryKey:\s*\[\s*"journalEntries"/,
	/queryKey:\s*\[\s*"chartOfAccounts"/,
	/queryKey:\s*\[\s*"profitLoss"/,
	/queryKey:\s*\[\s*"cashFlowReport"/,
	/queryKey:\s*\[\s*"commissionReport"/,
	/queryKey:\s*\[\s*"commissionRule"/,
	/queryKey:\s*\[\s*"commissionRecords"/,
	/queryKey:\s*\[\s*"staffMembers"/,
	/queryKey:\s*\[\s*"staffAttendance"/,
	/queryKey:\s*\[\s*"staffSchedules"/,
	/queryKey:\s*\[\s*"attendanceReport"/,
	/queryKey:\s*\[\s*"pos"/,
	/queryKey:\s*\[\s*"boarding"/,
	/queryKey:\s*\[\s*"invoice"/,

	// Also catch invalidateQueries
	/invalidateQueries\(\{\s*queryKey:\s*\[\s*"/,
] as const;

describe("migrated frontend cache files", () => {
	it("do not reintroduce raw query keys for migrated domains", () => {
		const violations = MIGRATED_FILES.flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return RAW_KEY_PATTERNS.filter((pattern) => pattern.test(source)).map(
				(pattern) => `${file}: ${pattern.source}`,
			);
		});

		expect(violations).toEqual([]);
	});
});
