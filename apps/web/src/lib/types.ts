// ============================================================
// COMMON TYPES & INTERFACES
// ============================================================

import type {
	boardings,
	branches,
	orderItems,
	orders,
	pets,
	products,
	profiles,
	subscriptions,
	userRoles,
} from "@/infra/db/drizzle/schema";

// ---- Database Types ----
export type Branch = typeof branches.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Boarding = typeof boardings.$inferSelect;
export type Pet = typeof pets.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;

// ---- Extended Types ----
export interface BoardingWithPets extends Boarding {
	pets: Pet[];
	branches?: Branch;
}

export interface OrderWithItems extends Order {
	order_items: (OrderItem & {
		product: Product;
	})[];
}

export interface BranchWithMembers extends Branch {
	members?: { user_id: string }[];
}

// ---- Session Types ----
export interface SessionData {
	userId: string;
	businessId: string;
	businessName: string;
	fullName: string;
	email: string;
	role: UserRoleType;
	branches: Branch[];
	hasProducts?: boolean;
	hasBoardings?: boolean;
	hasStaff?: boolean;
	hasBranches?: boolean;
}

export type UserRoleType =
	| "owner"
	| "manager"
	| "admin"
	| "kasir"
	| "staff_daycare";

// ---- Dashboard Types ----
export interface DashboardMetrics {
	transactionsToday: number;
	revenueToday: number;
	activeBoardings: number;
	lowStockProducts: number;
	completedMonth?: number;
	occupancyRate?: number;
	totalCapacity?: number;
}

export interface ChartDataPoint {
	day: string;
	date: number;
	amount: number;
}

export interface OccupancyData {
	occupancyRate: number;
	activeBoardings: number;
	totalCapacity: number;
}

// ---- Loyalty Types ----
export interface LoyaltyConfigData {
	business_id: string;
	points_per_rupiah: number;
	points_expiry_days: number;
	min_redeem_points: number;
	is_active: boolean;
}

export interface LoyaltyTierData {
	id: string;
	business_id: string;
	name: string;
	min_points: number;
	discount_percent: number;
	benefits: string[];
}

export interface CustomerLoyaltyData {
	id: string;
	business_id: string;
	customer_phone: string;
	customer_name: string | null;
	customer_email: string | null;
	total_points: number;
	available_points: number;
	current_tier_id: string | null;
	tier?: LoyaltyTierData;
}

export interface StampCardData {
	id: string;
	business_id: string;
	name: string;
	service_type: string | null;
	total_stamps: number;
	free_service: string | null;
	free_service_value: number;
	is_active: boolean;
}

export interface PromoCodeData {
	id: string;
	business_id: string;
	code: string;
	name: string;
	description: string | null;
	type: "percentage" | "fixed" | "free_service";
	value: number;
	min_order_amount: number;
	max_discount_amount: number | null;
	max_uses: number | null;
	used_count: number;
	max_uses_per_customer: number;
	valid_from: string;
	valid_until: string;
	is_active: boolean;
}

// ---- WhatsApp Types ----
export interface WhatsAppConfigData {
	business_id: string;
	phone_number: string | null;
	is_connected: boolean;
	auto_reminder: boolean;
	reminder_hours_before: number;
	auto_payment_confirm: boolean;
	auto_loyalty_notify: boolean;
	auto_booking_confirm: boolean;
}

export interface WhatsAppTemplateData {
	id: string;
	business_id: string;
	name: string;
	category: "booking" | "payment" | "loyalty" | "promo" | "reminder" | "custom";
	content: string;
	variables: string[];
	is_active: boolean;
}

export interface WhatsAppMessageData {
	id: string;
	business_id: string;
	template_id: string | null;
	recipient_phone: string;
	recipient_name: string | null;
	content: string;
	status: "pending" | "sent" | "delivered" | "read" | "failed";
	sent_at: string | null;
	created_at: string;
}

// ---- Accounting Types ----
export interface AccountData {
	id: string;
	business_id: string;
	code: string;
	name: string;
	type: "asset" | "liability" | "equity" | "revenue" | "expense";
	sub_type: string | null;
	is_active: boolean;
}

export interface JournalEntryData {
	id: string;
	business_id: string;
	entry_number: string;
	entry_date: string;
	description: string | null;
	reference_type: string | null;
	reference_id: string | null;
	status: "draft" | "posted" | "void";
	lines?: JournalEntryLineData[];
}

export interface JournalEntryLineData {
	id: string;
	journal_entry_id: string;
	account_id: string;
	debit: number;
	credit: number;
	description: string | null;
	account?: AccountData;
}

export interface ExpenseData {
	id: string;
	business_id: string;
	branch_id: string | null;
	category: string;
	description: string;
	amount: number;
	expense_date: string;
	payment_method: string;
	receipt_url: string | null;
	notes: string | null;
}

export interface PettyCashData {
	id: string;
	business_id: string;
	branch_id: string | null;
	type: "in" | "out";
	amount: number;
	description: string;
	receipt_url: string | null;
	transaction_date: string;
}

export interface FinancialSummaryData {
	monthlyRevenue: number;
	monthlyExpenses: number;
	monthlyProfit: number;
	pettyCashBalance: number;
	revenueTrend: { month: string; amount: number }[];
}

export interface ProfitLossData {
	period: { start: string; end: string };
	revenue: { total: number };
	expenses: { total: number; byCategory: Record<string, number> };
	grossProfit: number;
	netProfit: number;
	margin: number;
}

// ---- Portal Types ----
export interface PortalConfigData {
	business_id: string;
	slug: string;
	is_active: boolean;
	logo_url: string | null;
	banner_url: string | null;
	primary_color: string;
	description: string | null;
	booking_enabled: boolean;
	login_enabled: boolean;
	guest_booking: boolean;
	deposit_required: boolean;
	deposit_amount: number;
	deposit_percent: number | null;
}

export interface PortalServiceData {
	id: string;
	business_id: string;
	name: string;
	description: string | null;
	duration_minutes: number;
	price: number;
	is_active: boolean;
}

export interface PortalBookingData {
	id: string;
	business_id: string;
	branch_id: string;
	service_id: string | null;
	customer_name: string;
	customer_phone: string;
	customer_email: string | null;
	pet_name: string;
	pet_species: string | null;
	pet_breed: string | null;
	scheduled_at: string;
	duration_minutes: number;
	status:
		| "pending"
		| "confirmed"
		| "in_progress"
		| "completed"
		| "cancelled"
		| "no_show";
	notes: string | null;
	deposit_amount: number;
	deposit_paid: boolean;
	total_amount: number | null;
	paid_amount: number;
	service?: PortalServiceData;
}

export interface PortalReviewData {
	id: string;
	business_id: string;
	booking_id: string | null;
	customer_name: string;
	customer_phone: string | null;
	rating: number;
	comment: string | null;
	is_visible: boolean;
	created_at: string;
}

export interface PortalStatsData {
	totalReviews: number;
	averageRating: number;
	totalServices: number;
	totalPets: number;
}

// ---- Audit Types ----
export type AuditAction =
	| "create"
	| "update"
	| "delete"
	| "void"
	| "login"
	| "logout"
	| "export"
	| "import"
	| "settings_change";

export interface AuditLogData {
	id: string;
	business_id: string;
	user_id: string;
	action: AuditAction;
	entity_type: string;
	entity_id: string | null;
	old_value: Record<string, unknown> | null;
	new_value: Record<string, unknown> | null;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
	user_name?: string;
	user_email?: string;
}

// ---- Midtrans Types ----
export interface MidtransResult {
	order_id: string;
	status_code: string;
	transaction_id: string;
	gross_amount: string;
	payment_type: string;
	transaction_time: string;
	transaction_status: string;
	fraud_status: string;
}

// ---- Form Types ----
export interface DateRange {
	startDate: string | null;
	endDate: string | null;
}

export interface SelectOption {
	value: string;
	label: string;
}

// ---- API Response Types ----
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}
