import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	date,
	foreignKey,
	index,
	inet,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	pgView,
	text,
	time,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", [
	"admin",
	"staff",
	"owner",
	"manager",
	"kasir",
	"staff_daycare",
]);
export const boardingStatus = pgEnum("boarding_status", [
	"draft",
	"active",
	"completed",
	"cancelled",
]);
export const paymentMethod = pgEnum("payment_method", [
	"cash",
	"card",
	"transfer",
	"qris",
]);
export const petKind = pgEnum("pet_kind", ["cat", "dog", "rabbit", "other"]);
export const planType = pgEnum("plan_type", ["free", "pro", "business"]);
export const vaccineStatus = pgEnum("vaccine_status", ["yes", "no"]);

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		userId: uuid("user_id").notNull(),
		action: text().notNull(),
		entityType: text("entity_type").notNull(),
		entityId: uuid("entity_id"),
		oldValue: jsonb("old_value"),
		newValue: jsonb("new_value"),
		ipAddress: inet("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_audit_logs_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_audit_logs_created").using(
			"btree",
			table.createdAt.desc().nullsFirst().op("timestamptz_ops"),
		),
		index("idx_audit_logs_entity").using(
			"btree",
			table.entityType.asc().nullsLast().op("text_ops"),
			table.entityId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_audit_logs_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "audit_logs_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"audit_logs_action_check",
			sql`action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'void'::text, 'login'::text, 'logout'::text, 'export'::text, 'import'::text, 'settings_change'::text])`,
		),
	],
);

export const billingEvents = pgTable(
	"billing_events",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		eventType: text("event_type").notNull(),
		plan: planType().notNull(),
		amount: numeric({ precision: 12, scale: 2 }).default("0"),
		currency: text().default("IDR"),
		midtransOrderId: text("midtrans_order_id"),
		midtransTransactionId: text("midtrans_transaction_id"),
		paymentMethod: text("payment_method"),
		status: text().default("pending"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		version: integer().default(1).notNull(),
	},
	(table) => [
		index("idx_billing_events_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_billing_events_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "billing_events_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"billing_events_event_type_check",
			sql`event_type = ANY (ARRAY['payment_success'::text, 'payment_failed'::text, 'subscription_created'::text, 'subscription_renewed'::text, 'subscription_cancelled'::text, 'subscription_paused'::text, 'plan_changed'::text, 'refund'::text])`,
		),
		check(
			"billing_events_status_check",
			sql`status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'expired'::text])`,
		),
	],
);

export const pets = pgTable(
	"pets",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		customerId: uuid("customer_id"),
		name: text().notNull(),
		species: text().default("dog").notNull(),
		breed: text(),
		gender: text(),
		birthDate: date("birth_date"),
		weightKg: numeric("weight_kg"),
		color: text(),
		isVaccinated: boolean("is_vaccinated").default(false).notNull(),
		vaccineNotes: text("vaccine_notes"),
		allergies: text(),
		medicalNotes: text("medical_notes"),
		specialInstructions: text("special_instructions"),
		photoUrl: text("photo_url"),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_pets_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_pets_customer")
			.using("btree", table.customerId.asc().nullsLast().op("uuid_ops"))
			.where(sql`(customer_id IS NOT NULL)`),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "pets_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "pets_customer_id_fkey",
		}).onDelete("set null"),
	],
);

export const commissionRules = pgTable(
	"commission_rules",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		staffId: uuid("staff_id").notNull(),
		model: text().default("percentage").notNull(),
		ratePercent: numeric("rate_percent").default("0"),
		rateFixed: numeric("rate_fixed").default("0"),
		rateSmall: numeric("rate_small").default("0"),
		rateMedium: numeric("rate_medium").default("0"),
		rateLarge: numeric("rate_large").default("0"),
		rateXl: numeric("rate_xl").default("0"),
		includeAddons: boolean("include_addons").default(false),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_commission_rules_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_commission_rules_staff").using(
			"btree",
			table.staffId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "commission_rules_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.staffId],
			foreignColumns: [profiles.userId],
			name: "commission_rules_staff_id_fkey",
		}).onDelete("cascade"),
	],
);

export const commissionRecords = pgTable(
	"commission_records",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		staffId: uuid("staff_id").notNull(),
		referenceType: text("reference_type").notNull(),
		referenceId: uuid("reference_id").notNull(),
		amount: numeric().default("0").notNull(),
		status: text().default("pending").notNull(),
		paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_commission_records_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_commission_records_staff").using(
			"btree",
			table.staffId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "commission_records_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.staffId],
			foreignColumns: [profiles.userId],
			name: "commission_records_staff_id_fkey",
		}),
	],
);

export const kasbon = pgTable(
	"kasbon",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		staffId: uuid("staff_id").notNull(),
		amount: numeric().notNull(),
		remaining: numeric().notNull(),
		installmentAmount: numeric("installment_amount").default("0"),
		notes: text(),
		status: text().default("active").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_kasbon_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_kasbon_staff").using(
			"btree",
			table.staffId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "kasbon_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.staffId],
			foreignColumns: [profiles.userId],
			name: "kasbon_staff_id_fkey",
		}),
	],
);

export const kasbonPayments = pgTable(
	"kasbon_payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		kasbonId: uuid("kasbon_id").notNull(),
		amount: numeric().notNull(),
		source: text().default("manual"),
		paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.kasbonId],
			foreignColumns: [kasbon.id],
			name: "kasbon_payments_kasbon_id_fkey",
		}).onDelete("cascade"),
	],
);

export const productBatches = pgTable(
	"product_batches",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		variantId: uuid("variant_id").notNull(),
		warehouseId: uuid("warehouse_id"),
		rackLocationId: uuid("rack_location_id"),
		batchNumber: text("batch_number"),
		quantity: numeric().default("0").notNull(),
		initialQty: numeric("initial_qty").default("0").notNull(),
		costPrice: numeric("cost_price").default("0").notNull(),
		receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		expiryDate: date("expiry_date"),
		supplierId: uuid("supplier_id"),
		poId: uuid("po_id"),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_batches_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_batches_expiry")
			.using("btree", table.expiryDate.asc().nullsLast().op("date_ops"))
			.where(sql`(expiry_date IS NOT NULL)`),
		index("idx_batches_variant").using(
			"btree",
			table.variantId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_batches_warehouse").using(
			"btree",
			table.warehouseId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_batches_rack").using(
			"btree",
			table.rackLocationId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "product_batches_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "product_batches_variant_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "product_batches_warehouse_id_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.rackLocationId],
			foreignColumns: [rackLocations.id],
			name: "product_batches_rack_location_id_fkey",
		}).onDelete("set null"),
	],
);

export const stockMovements = pgTable(
	"stock_movements",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		// Nullable: order_create / order_void on parent-level (non-variant)
		// products no longer requires a variant_id. Variant products still
		// populate it; the legacy NOT NULL constraint was relaxed so a
		// single stock_movements row can describe either path.
		variantId: uuid("variant_id"),
		batchId: uuid("batch_id"),
		type: text().notNull(),
		quantity: numeric().notNull(),
		referenceType: text("reference_type"),
		referenceId: uuid("reference_id"),
		notes: text(),
		sourceWarehouseId: uuid("source_warehouse_id"),
		targetWarehouseId: uuid("target_warehouse_id"),
		sourceRackLocationId: uuid("source_rack_location_id"),
		targetRackLocationId: uuid("target_rack_location_id"),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_movements_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_movements_created").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("idx_movements_variant").using(
			"btree",
			table.variantId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_movements_src_wh").using(
			"btree",
			table.sourceWarehouseId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_movements_tgt_wh").using(
			"btree",
			table.targetWarehouseId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.batchId],
			foreignColumns: [productBatches.id],
			name: "stock_movements_batch_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "stock_movements_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "stock_movements_variant_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.sourceWarehouseId],
			foreignColumns: [warehouses.id],
			name: "stock_movements_source_warehouse_id_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.targetWarehouseId],
			foreignColumns: [warehouses.id],
			name: "stock_movements_target_warehouse_id_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.sourceRackLocationId],
			foreignColumns: [rackLocations.id],
			name: "stock_movements_source_rack_location_id_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.targetRackLocationId],
			foreignColumns: [rackLocations.id],
			name: "stock_movements_target_rack_location_id_fkey",
		}).onDelete("set null"),
	],
);

export const staffSchedules = pgTable(
	"staff_schedules",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		staffId: uuid("staff_id").notNull(),
		dayOfWeek: integer("day_of_week").notNull(),
		startTime: time("start_time").notNull(),
		endTime: time("end_time").notNull(),
		isOffDay: boolean("is_off_day").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_schedules_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		uniqueIndex("idx_schedules_staff_day").using(
			"btree",
			table.staffId.asc().nullsLast().op("uuid_ops"),
			table.dayOfWeek.asc().nullsLast().op("int4_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "staff_schedules_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.staffId],
			foreignColumns: [profiles.userId],
			name: "staff_schedules_staff_id_fkey",
		}).onDelete("cascade"),
		check(
			"staff_schedules_day_of_week_check",
			sql`(day_of_week >= 0) AND (day_of_week <= 6)`,
		),
	],
);

export const staffAttendances = pgTable(
	"staff_attendances",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		staffId: uuid("staff_id").notNull(),
		date: date().notNull(),
		clockIn: timestamp("clock_in", { withTimezone: true, mode: "string" }),
		clockOut: timestamp("clock_out", { withTimezone: true, mode: "string" }),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_attendances_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		uniqueIndex("idx_attendances_staff_date").using(
			"btree",
			table.staffId.asc().nullsLast().op("uuid_ops"),
			table.date.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "staff_attendances_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.staffId],
			foreignColumns: [profiles.userId],
			name: "staff_attendances_staff_id_fkey",
		}).onDelete("cascade"),
	],
);

export const users = pgTable(
	"users",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		email: text().notNull(),
		passwordHash: text("password_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [unique("users_email_key").on(table.email)],
);

export const sessions = pgTable(
	"sessions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("sessions_token_hash_key").on(table.tokenHash),
		index("idx_sessions_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_fkey",
		}).onDelete("cascade"),
	],
);

export const profiles = pgTable(
	"profiles",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		businessId: uuid("business_id").notNull(),
		fullName: text("full_name").notNull(),
		email: text().notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		phoneNumber: text("phone_number"),
		preferredLanguage: text("preferred_language").default("id"),
		pinHash: text("pin_hash"),
	},
	(table) => [
		index("idx_profiles_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "profiles_business_id_fkey",
		}).onDelete("cascade"),
		unique("profiles_user_id_key").on(table.userId),
	],
);

export const groomingServices = pgTable(
	"grooming_services",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		description: text(),
		durationMinutes: integer("duration_minutes").default(60).notNull(),
		priceSmall: numeric("price_small").default("0").notNull(),
		priceMedium: numeric("price_medium").default("0").notNull(),
		priceLarge: numeric("price_large").default("0").notNull(),
		priceXl: numeric("price_xl").default("0").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "grooming_services_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const groomingAddons = pgTable(
	"grooming_addons",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		price: numeric().default("0").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "grooming_addons_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const groomingAppointments = pgTable(
	"grooming_appointments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id"),
		serviceId: uuid("service_id").notNull(),
		petId: uuid("pet_id").notNull(),
		customerId: uuid("customer_id"),
		groomerId: uuid("groomer_id"),
		petSize: text("pet_size").default("medium").notNull(),
		price: numeric().default("0").notNull(),
		status: text().default("pending").notNull(),
		scheduledAt: timestamp("scheduled_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
		completedAt: timestamp("completed_at", {
			withTimezone: true,
			mode: "string",
		}),
		notes: text(),
		cancellationReason: text("cancellation_reason"),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_groom_appt_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_groom_appt_groomer").using(
			"btree",
			table.groomerId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_groom_appt_scheduled").using(
			"btree",
			table.scheduledAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("idx_groom_appt_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "grooming_appointments_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "grooming_appointments_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "grooming_appointments_customer_id_fkey",
		}),
		foreignKey({
			columns: [table.groomerId],
			foreignColumns: [profiles.userId],
			name: "grooming_appointments_groomer_id_fkey",
		}),
		foreignKey({
			columns: [table.petId],
			foreignColumns: [pets.id],
			name: "grooming_appointments_pet_id_fkey",
		}),
		foreignKey({
			columns: [table.serviceId],
			foreignColumns: [groomingServices.id],
			name: "grooming_appointments_service_id_fkey",
		}),
	],
);

export const groomingAppointmentAddons = pgTable(
	"grooming_appointment_addons",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		appointmentId: uuid("appointment_id").notNull(),
		addonId: uuid("addon_id").notNull(),
		price: numeric().default("0").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.addonId],
			foreignColumns: [groomingAddons.id],
			name: "grooming_appointment_addons_addon_id_fkey",
		}),
		foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [groomingAppointments.id],
			name: "grooming_appointment_addons_appointment_id_fkey",
		}).onDelete("cascade"),
	],
);

export const groomingPhotos = pgTable(
	"grooming_photos",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		appointmentId: uuid("appointment_id").notNull(),
		photoUrl: text("photo_url").notNull(),
		photoType: text("photo_type").default("after").notNull(),
		uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_groom_photos_appt").using(
			"btree",
			table.appointmentId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [groomingAppointments.id],
			name: "grooming_photos_appointment_id_fkey",
		}).onDelete("cascade"),
	],
);

export const businesses = pgTable(
	"businesses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		name: text().notNull(),
		ownerId: uuid("owner_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		signatureUrl: text("signature_url"),
		logoUrl: text("logo_url"),
		slug: text(),
		address: text(),
		phone: text(),
	},
	(table) => [unique("businesses_slug_key").on(table.slug)],
);

export const userRoles = pgTable(
	"user_roles",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		businessId: uuid("business_id").notNull(),
		role: appRole().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_user_roles_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "user_roles_business_id_fkey",
		}).onDelete("cascade"),
		unique("user_roles_user_id_business_id_role_key").on(
			table.userId,
			table.businessId,
			table.role,
		),
	],
);

export const boardings = pgTable(
	"boardings",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id").notNull(),
		createdBy: uuid("created_by").notNull(),
		ownerName: text("owner_name").notNull(),
		ownerAddress: text("owner_address").notNull(),
		ownerPhone: text("owner_phone").notNull(),
		checkInDate: date("check_in_date").notNull(),
		estimatedCheckOutDate: date("estimated_check_out_date"),
		status: boardingStatus().default("active").notNull(),
		consentAcceptedAt: timestamp("consent_accepted_at", {
			withTimezone: true,
			mode: "string",
		})
			.defaultNow()
			.notNull(),
		completedAt: timestamp("completed_at", {
			withTimezone: true,
			mode: "string",
		}),
		isArchived: boolean("is_archived").default(false).notNull(),
		archivedAt: timestamp("archived_at", {
			withTimezone: true,
			mode: "string",
		}),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		emergencyContactName: text("emergency_contact_name"),
		emergencyContactPhone: text("emergency_contact_phone"),
		customerId: uuid("customer_id"),
		ownerSignature: text("owner_signature"),
		version: integer().default(1).notNull(),
		roomId: uuid("room_id"),
		dailyRate: numeric("daily_rate").default("0"),
		actualCheckout: timestamp("actual_checkout", {
			withTimezone: true,
			mode: "string",
		}),
		totalAmount: numeric("total_amount").default("0"),
	},
	(table) => [
		index("idx_boarding_room")
			.using("btree", table.roomId.asc().nullsLast().op("uuid_ops"))
			.where(sql`(room_id IS NOT NULL)`),
		index("idx_boardings_branch").using(
			"btree",
			table.branchId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_boardings_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_boardings_customer").using(
			"btree",
			table.customerId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_boardings_status").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
			table.isArchived.asc().nullsLast().op("bool_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "boardings_branch_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "boardings_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "boardings_customer_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "boardings_room_id_fkey",
		}),
	],
);

export const branchMembers = pgTable(
	"branch_members",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		branchId: uuid("branch_id").notNull(),
		userId: uuid("user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_branch_members_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "branch_members_branch_id_fkey",
		}).onDelete("cascade"),
		unique("branch_members_branch_id_user_id_key").on(
			table.branchId,
			table.userId,
		),
	],
);

export const branches = pgTable(
	"branches",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		address: text(),
		phone: text(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		capacity: integer().default(20).notNull(),
		email: text(),
		whatsappNumber: text("whatsapp_number"),
		streetAddress: text("street_address"),
		addressLocality: text("address_locality"),
		addressRegion: text("address_region"),
		postalCode: text("postal_code"),
		addressCountry: text("address_country").default("ID"),
		latitude: numeric({ mode: "number" }),
		longitude: numeric({ mode: "number" }),
		operatingHours: jsonb("operating_hours"),
	},
	(table) => [
		index("idx_branches_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "branches_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const subscriptions = pgTable(
	"subscriptions",
	{
		businessId: uuid("business_id").primaryKey().notNull(),
		plan: planType().default("free").notNull(),
		validUntil: timestamp("valid_until", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		status: text().default("active"),
		currentPeriodStart: timestamp("current_period_start", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		currentPeriodEnd: timestamp("current_period_end", {
			withTimezone: true,
			mode: "string",
		}).default(sql`(now() + '30 days'::interval)`),
		midtransSubscriptionId: text("midtrans_subscription_id"),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
		version: integer().default(1).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "subscriptions_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"subscriptions_status_check",
			sql`status = ANY (ARRAY['active'::text, 'past_due'::text, 'cancelled'::text, 'paused'::text])`,
		),
	],
);

export const boardingPets = pgTable(
	"boarding_pets",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		boardingId: uuid("boarding_id").notNull(),
		name: text().notNull(),
		kind: petKind().notNull(),
		breed: text().notNull(),
		vaccinated: vaccineStatus().notNull(),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		weight: text(),
		healthStatus: text("health_status").default("healthy"),
		initialCondition: text("initial_condition"),
		petId: uuid("pet_id"),
	},
	(table) => [
		index("idx_pets_boarding").using(
			"btree",
			table.boardingId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.petId],
			foreignColumns: [pets.id],
			name: "boarding_pets_pet_id_fkey",
		}),
		foreignKey({
			columns: [table.boardingId],
			foreignColumns: [boardings.id],
			name: "pets_boarding_id_fkey",
		}).onDelete("cascade"),
	],
);

export const products = pgTable(
	"products",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		sku: text(),
		price: numeric().default("0").notNull(),
		stock: integer().default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
		deletedBy: uuid("deleted_by"),
		version: integer().default(1).notNull(),
		category: text(),
		description: text(),
		hasVariants: boolean("has_variants").default(false).notNull(),
		brand: text(),
		imageUrl: text("image_url"),
		unit: text().default("pcs").notNull(),
		isFractional: boolean("is_fractional").default(false).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		isFeatured: boolean("is_featured").default(false).notNull(),
	},
	(table) => [
		index("idx_products_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_products_deleted_at")
			.using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops"))
			.where(sql`(deleted_at IS NULL)`),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "products_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const rooms = pgTable(
	"rooms",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id"),
		name: text().notNull(),
		roomType: text("room_type").default("standard").notNull(),
		capacity: integer().default(1).notNull(),
		dailyRate: numeric("daily_rate").default("0").notNull(),
		description: text(),
		isActive: boolean("is_active").default(true).notNull(),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_rooms_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "rooms_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "rooms_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const seasonalPricing = pgTable(
	"seasonal_pricing",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		surchargePercent: numeric("surcharge_percent").default("0"),
		surchargeFixed: numeric("surcharge_fixed").default("0"),
		isActive: boolean("is_active").default(true).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "seasonal_pricing_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const boardingCharges = pgTable(
	"boarding_charges",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		boardingId: uuid("boarding_id").notNull(),
		businessId: uuid("business_id").notNull(),
		description: text().notNull(),
		amount: numeric().default("0").notNull(),
		chargeDate: timestamp("charge_date", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		createdBy: uuid("created_by"),
	},
	(table) => [
		index("idx_boarding_charges_boarding").using(
			"btree",
			table.boardingId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.boardingId],
			foreignColumns: [boardings.id],
			name: "boarding_charges_boarding_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "boarding_charges_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const boardingDailyPhotos = pgTable(
	"boarding_daily_photos",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		boardingId: uuid("boarding_id").notNull(),
		photoUrl: text("photo_url").notNull(),
		caption: text(),
		takenDate: date("taken_date").default(sql`CURRENT_DATE`).notNull(),
		uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		uploadedBy: uuid("uploaded_by"),
	},
	(table) => [
		index("idx_boarding_photos_boarding").using(
			"btree",
			table.boardingId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.boardingId],
			foreignColumns: [boardings.id],
			name: "boarding_daily_photos_boarding_id_fkey",
		}).onDelete("cascade"),
	],
);

export const loyaltyConfig = pgTable(
	"loyalty_config",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		pointsPerRupiah: numeric("points_per_rupiah", {
			precision: 10,
			scale: 4,
		}).default("0.01"),
		pointsExpiryDays: integer("points_expiry_days").default(365),
		minRedeemPoints: integer("min_redeem_points").default(100),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "loyalty_config_business_id_fkey",
		}).onDelete("cascade"),
		unique("loyalty_config_business_id_key").on(table.businessId),
	],
);

export const loyaltyTiers = pgTable(
	"loyalty_tiers",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		minPoints: integer("min_points").default(0).notNull(),
		discountPercent: numeric("discount_percent", {
			precision: 5,
			scale: 2,
		}).default("0"),
		benefits: jsonb().default([]),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_loyalty_tiers_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_loyalty_tiers_min_points").using(
			"btree",
			table.minPoints.asc().nullsLast().op("int4_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "loyalty_tiers_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const loyaltyTransactions = pgTable(
	"loyalty_transactions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		customerLoyaltyId: uuid("customer_loyalty_id").notNull(),
		orderId: uuid("order_id"),
		type: text().notNull(),
		points: integer().notNull(),
		description: text(),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_loyalty_transactions_customer").using(
			"btree",
			table.customerLoyaltyId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_loyalty_transactions_order").using(
			"btree",
			table.orderId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_loyalty_transactions_type").using(
			"btree",
			table.type.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "loyalty_transactions_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerLoyaltyId],
			foreignColumns: [customerLoyalty.id],
			name: "loyalty_transactions_customer_loyalty_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "loyalty_transactions_order_id_fkey",
		}),
		check(
			"loyalty_transactions_type_check",
			sql`type = ANY (ARRAY['earn'::text, 'redeem'::text, 'expire'::text, 'adjust'::text, 'bonus'::text])`,
		),
	],
);

export const stampCards = pgTable(
	"stamp_cards",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		serviceType: text("service_type"),
		totalStamps: integer("total_stamps").default(10).notNull(),
		freeService: text("free_service"),
		freeServiceValue: numeric("free_service_value", {
			precision: 12,
			scale: 2,
		}).default("0"),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_stamp_cards_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "stamp_cards_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const customerStamps = pgTable(
	"customer_stamps",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		customerLoyaltyId: uuid("customer_loyalty_id").notNull(),
		stampCardId: uuid("stamp_card_id").notNull(),
		currentStamps: integer("current_stamps").default(0),
		totalRedeemed: integer("total_redeemed").default(0),
		lastStampAt: timestamp("last_stamp_at", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_customer_stamps_card").using(
			"btree",
			table.stampCardId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_customer_stamps_customer").using(
			"btree",
			table.customerLoyaltyId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "customer_stamps_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerLoyaltyId],
			foreignColumns: [customerLoyalty.id],
			name: "customer_stamps_customer_loyalty_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.stampCardId],
			foreignColumns: [stampCards.id],
			name: "customer_stamps_stamp_card_id_fkey",
		}).onDelete("cascade"),
		unique("customer_stamps_customer_loyalty_id_stamp_card_id_key").on(
			table.customerLoyaltyId,
			table.stampCardId,
		),
	],
);

export const promoCodes = pgTable(
	"promo_codes",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		code: text().notNull(),
		name: text().notNull(),
		description: text(),
		type: text().notNull(),
		value: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
		minOrderAmount: numeric("min_order_amount", {
			precision: 12,
			scale: 2,
		}).default("0"),
		maxDiscountAmount: numeric("max_discount_amount", {
			precision: 12,
			scale: 2,
		}),
		maxUses: integer("max_uses"),
		usedCount: integer("used_count").default(0),
		maxUsesPerCustomer: integer("max_uses_per_customer").default(1),
		validFrom: timestamp("valid_from", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		validUntil: timestamp("valid_until", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		isActive: boolean("is_active").default(true),
		applicableServices: jsonb("applicable_services").default([]),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_promo_codes_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_promo_codes_code").using(
			"btree",
			table.code.asc().nullsLast().op("text_ops"),
		),
		index("idx_promo_codes_valid").using(
			"btree",
			table.validFrom.asc().nullsLast().op("timestamptz_ops"),
			table.validUntil.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "promo_codes_business_id_fkey",
		}).onDelete("cascade"),
		unique("promo_codes_business_id_code_key").on(table.businessId, table.code),
		check(
			"promo_codes_type_check",
			sql`type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'free_service'::text])`,
		),
	],
);

export const promoUsage = pgTable(
	"promo_usage",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		promoCodeId: uuid("promo_code_id").notNull(),
		customerLoyaltyId: uuid("customer_loyalty_id"),
		orderId: uuid("order_id"),
		discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
			.default("0")
			.notNull(),
		usedAt: timestamp("used_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_promo_usage_customer").using(
			"btree",
			table.customerLoyaltyId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_promo_usage_promo").using(
			"btree",
			table.promoCodeId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "promo_usage_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerLoyaltyId],
			foreignColumns: [customerLoyalty.id],
			name: "promo_usage_customer_loyalty_id_fkey",
		}),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "promo_usage_order_id_fkey",
		}),
		foreignKey({
			columns: [table.promoCodeId],
			foreignColumns: [promoCodes.id],
			name: "promo_usage_promo_code_id_fkey",
		}).onDelete("cascade"),
	],
);

export const serviceRewards = pgTable(
	"service_rewards",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		serviceType: text("service_type").notNull(),
		requiredVisits: integer("required_visits").default(5).notNull(),
		freeVisitValue: numeric("free_visit_value", {
			precision: 12,
			scale: 2,
		}).default("0"),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_service_rewards_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "service_rewards_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const customerServiceRewards = pgTable(
	"customer_service_rewards",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		customerLoyaltyId: uuid("customer_loyalty_id").notNull(),
		serviceRewardId: uuid("service_reward_id").notNull(),
		currentVisits: integer("current_visits").default(0),
		totalRedeemed: integer("total_redeemed").default(0),
		lastVisitAt: timestamp("last_visit_at", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_customer_service_rewards_customer").using(
			"btree",
			table.customerLoyaltyId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "customer_service_rewards_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerLoyaltyId],
			foreignColumns: [customerLoyalty.id],
			name: "customer_service_rewards_customer_loyalty_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.serviceRewardId],
			foreignColumns: [serviceRewards.id],
			name: "customer_service_rewards_service_reward_id_fkey",
		}).onDelete("cascade"),
		unique(
			"customer_service_rewards_customer_loyalty_id_service_reward_key",
		).on(table.customerLoyaltyId, table.serviceRewardId),
	],
);

export const customerLoyalty = pgTable(
	"customer_loyalty",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		customerPhone: text("customer_phone").notNull(),
		customerName: text("customer_name"),
		customerEmail: text("customer_email"),
		totalPoints: integer("total_points").default(0),
		availablePoints: integer("available_points").default(0),
		currentTierId: uuid("current_tier_id"),
		lastActivityAt: timestamp("last_activity_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		customerId: uuid("customer_id"),
	},
	(table) => [
		index("idx_customer_loyalty_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_customer_loyalty_customer").using(
			"btree",
			table.customerId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_customer_loyalty_phone").using(
			"btree",
			table.customerPhone.asc().nullsLast().op("text_ops"),
		),
		index("idx_customer_loyalty_points").using(
			"btree",
			table.availablePoints.desc().nullsFirst().op("int4_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "customer_loyalty_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.currentTierId],
			foreignColumns: [loyaltyTiers.id],
			name: "customer_loyalty_current_tier_id_fkey",
		}),
		foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_loyalty_customer_id_fkey",
		}).onDelete("cascade"),
		unique("customer_loyalty_business_id_customer_phone_key").on(
			table.businessId,
			table.customerPhone,
		),
	],
);

export const suppliers = pgTable(
	"suppliers",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		contactPerson: text("contact_person"),
		phone: text(),
		email: text(),
		address: text(),
		notes: text(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_suppliers_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "suppliers_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const purchaseOrders = pgTable(
	"purchase_orders",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id"),
		supplierId: uuid("supplier_id").notNull(),
		poNumber: text("po_number").notNull(),
		status: text().default("draft").notNull(),
		totalAmount: numeric("total_amount").default("0").notNull(),
		notes: text(),
		orderDate: date("order_date").default(sql`CURRENT_DATE`).notNull(),
		expectedDate: date("expected_date"),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_purchase_orders_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "purchase_orders_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "purchase_orders_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchase_orders_supplier_id_fkey",
		}),
	],
);

export const poItems = pgTable(
	"po_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		poId: uuid("po_id").notNull(),
		variantId: uuid("variant_id").notNull(),
		qtyOrdered: numeric("qty_ordered").notNull(),
		qtyReceived: numeric("qty_received").default("0").notNull(),
		unitCost: numeric("unit_cost").default("0").notNull(),
		subtotal: numeric().default("0").notNull(),
	},
	(table) => [
		index("idx_po_items_po").using(
			"btree",
			table.poId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "po_items_po_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "po_items_variant_id_fkey",
		}),
	],
);

export const poReceivings = pgTable(
	"po_receivings",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		poId: uuid("po_id").notNull(),
		receivedDate: timestamp("received_date", {
			withTimezone: true,
			mode: "string",
		})
			.defaultNow()
			.notNull(),
		notes: text(),
		receivedBy: uuid("received_by"),
	},
	(table) => [
		index("idx_po_receivings_po").using(
			"btree",
			table.poId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "po_receivings_po_id_fkey",
		}),
	],
);

export const poReceivingItems = pgTable(
	"po_receiving_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		receivingId: uuid("receiving_id").notNull(),
		poItemId: uuid("po_item_id").notNull(),
		qtyReceived: numeric("qty_received").notNull(),
		expiryDate: date("expiry_date"),
		batchNumber: text("batch_number"),
	},
	(table) => [
		index("idx_po_receiving_items_receiving").using(
			"btree",
			table.receivingId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.poItemId],
			foreignColumns: [poItems.id],
			name: "po_receiving_items_po_item_id_fkey",
		}),
		foreignKey({
			columns: [table.receivingId],
			foreignColumns: [poReceivings.id],
			name: "po_receiving_items_receiving_id_fkey",
		}).onDelete("cascade"),
	],
);

export const orderItems = pgTable(
	"order_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		orderId: uuid("order_id").notNull(),
		productId: uuid("product_id").notNull(),
		quantity: numeric().notNull(),
		priceAtTime: numeric("price_at_time").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		variantId: uuid("variant_id"),
		unit: text().default("pcs").notNull(),
		discountType: text("discount_type"),
		discountValue: numeric("discount_value").default("0"),
		discountAmount: numeric("discount_amount").default("0"),
	},
	(table) => [
		index("idx_order_items_order").using(
			"btree",
			table.orderId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_order_items_variant")
			.using("btree", table.variantId.asc().nullsLast().op("uuid_ops"))
			.where(sql`(variant_id IS NOT NULL)`),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "order_items_variant_id_fkey",
		}).onDelete("set null"),
		check("order_items_quantity_check", sql`quantity > (0)::numeric`),
	],
);

export const orders = pgTable(
	"orders",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id").notNull(),
		createdBy: uuid("created_by").notNull(),
		totalAmount: numeric("total_amount").default("0").notNull(),
		paymentMethod: paymentMethod("payment_method").default("cash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		version: integer().default(1).notNull(),
		status: text().default("completed").notNull(),
		customerId: uuid("customer_id"),
		discountType: text("discount_type"),
		discountValue: numeric("discount_value").default("0"),
		discountAmount: numeric("discount_amount").default("0"),
		voidedAt: timestamp("voided_at", { withTimezone: true, mode: "string" }),
		voidedBy: uuid("voided_by"),
		voidedReason: text("voided_reason"),
		voucherCode: text("voucher_code"),
		voucherDiscount: numeric("voucher_discount", {
			precision: 12,
			scale: 2,
		}).default("0"),
		trackingNumber: text("tracking_number").default(null),
		shippingCarrier: text("shipping_carrier"),
		shippedAt: timestamp("shipped_at", { withTimezone: true }),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancelledReason: text("cancelled_reason"),
		cancelledBy: uuid("cancelled_by").references(() => users.id),
	},
	(table) => [
		index("idx_orders_branch").using(
			"btree",
			table.branchId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_orders_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "orders_branch_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "orders_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "orders_customer_id_fkey",
		}).onDelete("set null"),
	],
);

export const ordersTrackingNumberIndex = index("idx_orders_tracking_number").on(
	orders.trackingNumber,
);
export const ordersStatusIndex = index("idx_orders_status").on(orders.status);

export const orderPayments = pgTable(
	"order_payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		orderId: uuid("order_id").notNull(),
		method: text().notNull(),
		amount: numeric().default("0").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_order_payments_order").using(
			"btree",
			table.orderId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_payments_order_id_fkey",
		}).onDelete("cascade"),
	],
);

export const returns = pgTable(
	"returns",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		orderId: uuid("order_id").notNull(),
		status: text().default("completed").notNull(),
		refundMethod: text("refund_method"),
		refundAmount: numeric("refund_amount").default("0").notNull(),
		reason: text(),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_returns_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_returns_order").using(
			"btree",
			table.orderId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "returns_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "returns_order_id_fkey",
		}),
	],
);

export const returnItems = pgTable(
	"return_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		returnId: uuid("return_id").notNull(),
		orderItemId: uuid("order_item_id").notNull(),
		qty: numeric().notNull(),
		reason: text(),
		isDamaged: boolean("is_damaged").default(false).notNull(),
	},
	(table) => [
		index("idx_return_items_return").using(
			"btree",
			table.returnId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "return_items_order_item_id_fkey",
		}),
		foreignKey({
			columns: [table.returnId],
			foreignColumns: [returns.id],
			name: "return_items_return_id_fkey",
		}).onDelete("cascade"),
	],
);

export const whatsappConfig = pgTable(
	"whatsapp_config",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		phoneNumber: text("phone_number"),
		isConnected: boolean("is_connected").default(false),
		apiKey: text("api_key"),
		autoReminder: boolean("auto_reminder").default(true),
		reminderHoursBefore: integer("reminder_hours_before").default(24),
		autoPaymentConfirm: boolean("auto_payment_confirm").default(true),
		autoLoyaltyNotify: boolean("auto_loyalty_notify").default(true),
		autoBookingConfirm: boolean("auto_booking_confirm").default(true),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "whatsapp_config_business_id_fkey",
		}).onDelete("cascade"),
		unique("whatsapp_config_business_id_key").on(table.businessId),
	],
);

export const whatsappTemplates = pgTable(
	"whatsapp_templates",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		category: text().notNull(),
		content: text().notNull(),
		variables: jsonb().default([]),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_whatsapp_templates_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "whatsapp_templates_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"whatsapp_templates_category_check",
			sql`category = ANY (ARRAY['booking'::text, 'payment'::text, 'loyalty'::text, 'promo'::text, 'reminder'::text, 'custom'::text])`,
		),
	],
);

export const whatsappMessages = pgTable(
	"whatsapp_messages",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		templateId: uuid("template_id"),
		recipientPhone: text("recipient_phone").notNull(),
		recipientName: text("recipient_name"),
		content: text().notNull(),
		status: text().default("pending"),
		errorMessage: text("error_message"),
		externalId: text("external_id"),
		sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
		deliveredAt: timestamp("delivered_at", {
			withTimezone: true,
			mode: "string",
		}),
		readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_whatsapp_messages_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_whatsapp_messages_recipient").using(
			"btree",
			table.recipientPhone.asc().nullsLast().op("text_ops"),
		),
		index("idx_whatsapp_messages_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "whatsapp_messages_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.templateId],
			foreignColumns: [whatsappTemplates.id],
			name: "whatsapp_messages_template_id_fkey",
		}),
		check(
			"whatsapp_messages_status_check",
			sql`status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])`,
		),
	],
);

export const whatsappScheduled = pgTable(
	"whatsapp_scheduled",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		templateId: uuid("template_id"),
		recipientPhone: text("recipient_phone").notNull(),
		recipientName: text("recipient_name"),
		variables: jsonb().default({}),
		scheduledAt: timestamp("scheduled_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		status: text().default("pending"),
		sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_whatsapp_scheduled_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_whatsapp_scheduled_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		index("idx_whatsapp_scheduled_time").using(
			"btree",
			table.scheduledAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "whatsapp_scheduled_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.templateId],
			foreignColumns: [whatsappTemplates.id],
			name: "whatsapp_scheduled_template_id_fkey",
		}),
		check(
			"whatsapp_scheduled_status_check",
			sql`status = ANY (ARRAY['pending'::text, 'sent'::text, 'cancelled'::text, 'failed'::text])`,
		),
	],
);

export const chartOfAccounts = pgTable(
	"chart_of_accounts",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		code: text().notNull(),
		name: text().notNull(),
		type: text().notNull(),
		subType: text("sub_type"),
		parentId: uuid("parent_id"),
		isActive: boolean("is_active").default(true),
		description: text(),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_chart_of_accounts_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_chart_of_accounts_type").using(
			"btree",
			table.type.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "chart_of_accounts_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "chart_of_accounts_parent_id_fkey",
		}),
		unique("chart_of_accounts_business_id_code_key").on(
			table.businessId,
			table.code,
		),
		check(
			"chart_of_accounts_type_check",
			sql`type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text])`,
		),
	],
);

export const journalEntries = pgTable(
	"journal_entries",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		entryNumber: text("entry_number").notNull(),
		entryDate: date("entry_date").notNull(),
		description: text(),
		referenceType: text("reference_type"),
		referenceId: uuid("reference_id"),
		status: text().default("posted"),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_journal_entries_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_journal_entries_date").using(
			"btree",
			table.entryDate.asc().nullsLast().op("date_ops"),
		),
		index("idx_journal_entries_reference").using(
			"btree",
			table.referenceType.asc().nullsLast().op("text_ops"),
			table.referenceId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "journal_entries_business_id_fkey",
		}).onDelete("cascade"),
		unique("journal_entries_business_id_entry_number_key").on(
			table.businessId,
			table.entryNumber,
		),
		check(
			"journal_entries_status_check",
			sql`status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text])`,
		),
	],
);

export const journalEntryLines = pgTable(
	"journal_entry_lines",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		journalEntryId: uuid("journal_entry_id").notNull(),
		accountId: uuid("account_id").notNull(),
		debit: numeric({ precision: 15, scale: 2 }).default("0"),
		credit: numeric({ precision: 15, scale: 2 }).default("0"),
		description: text(),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_journal_entry_lines_account").using(
			"btree",
			table.accountId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_journal_entry_lines_entry").using(
			"btree",
			table.journalEntryId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.accountId],
			foreignColumns: [chartOfAccounts.id],
			name: "journal_entry_lines_account_id_fkey",
		}),
		foreignKey({
			columns: [table.journalEntryId],
			foreignColumns: [journalEntries.id],
			name: "journal_entry_lines_journal_entry_id_fkey",
		}).onDelete("cascade"),
	],
);

export const expenses = pgTable(
	"expenses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id"),
		category: text().notNull(),
		description: text().notNull(),
		amount: numeric({ precision: 15, scale: 2 }).notNull(),
		expenseDate: date("expense_date").notNull(),
		paymentMethod: text("payment_method").default("cash"),
		receiptUrl: text("receipt_url"),
		notes: text(),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_expenses_branch").using(
			"btree",
			table.branchId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_expenses_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_expenses_category").using(
			"btree",
			table.category.asc().nullsLast().op("text_ops"),
		),
		index("idx_expenses_date").using(
			"btree",
			table.expenseDate.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "expenses_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "expenses_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const pettyCash = pgTable(
	"petty_cash",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id"),
		type: text().notNull(),
		amount: numeric({ precision: 15, scale: 2 }).notNull(),
		description: text().notNull(),
		receiptUrl: text("receipt_url"),
		transactionDate: date("transaction_date").notNull(),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_petty_cash_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_petty_cash_date").using(
			"btree",
			table.transactionDate.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "petty_cash_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "petty_cash_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"petty_cash_type_check",
			sql`type = ANY (ARRAY['in'::text, 'out'::text])`,
		),
	],
);

export const portalConfig = pgTable(
	"portal_config",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		slug: text().notNull(),
		isActive: boolean("is_active").default(false),
		logoUrl: text("logo_url"),
		bannerUrl: text("banner_url"),
		primaryColor: text("primary_color").default("#10b981"),
		description: text(),
		bookingEnabled: boolean("booking_enabled").default(true),
		loginEnabled: boolean("login_enabled").default(true),
		guestBooking: boolean("guest_booking").default(false),
		depositRequired: boolean("deposit_required").default(true),
		depositAmount: numeric("deposit_amount", {
			precision: 12,
			scale: 2,
		}).default("0"),
		depositPercent: numeric("deposit_percent", { precision: 5, scale: 2 }),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_portal_config_slug").using(
			"btree",
			table.slug.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "portal_config_business_id_fkey",
		}).onDelete("cascade"),
		unique("portal_config_business_id_key").on(table.businessId),
		unique("portal_config_slug_key").on(table.slug),
	],
);

export const portalServices = pgTable(
	"portal_services",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		description: text(),
		durationMinutes: integer("duration_minutes").default(60),
		price: numeric({ precision: 12, scale: 2 }).notNull(),
		isActive: boolean("is_active").default(true),
		category: text(),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_portal_services_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "portal_services_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"portal_services_category_check",
			sql`${table.category} IN ('freshwater', 'saltwater', 'terrarium', 'other') OR ${table.category} IS NULL`,
		),
	],
);

export const portalBookings = pgTable(
	"portal_bookings",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id").notNull(),
		serviceId: uuid("service_id"),
		customerName: text("customer_name").notNull(),
		customerPhone: text("customer_phone").notNull(),
		customerEmail: text("customer_email"),
		petName: text("pet_name").notNull(),
		petSpecies: text("pet_species"),
		petBreed: text("pet_breed"),
		scheduledAt: timestamp("scheduled_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		durationMinutes: integer("duration_minutes").default(60),
		status: text().default("pending"),
		notes: text(),
		depositAmount: numeric("deposit_amount", {
			precision: 12,
			scale: 2,
		}).default("0"),
		depositPaid: boolean("deposit_paid").default(false),
		depositPaidAt: timestamp("deposit_paid_at", {
			withTimezone: true,
			mode: "string",
		}),
		totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
		paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default(
			"0",
		),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_portal_bookings_branch").using(
			"btree",
			table.branchId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_portal_bookings_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_portal_bookings_customer").using(
			"btree",
			table.customerPhone.asc().nullsLast().op("text_ops"),
		),
		index("idx_portal_bookings_scheduled").using(
			"btree",
			table.scheduledAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("idx_portal_bookings_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "portal_bookings_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "portal_bookings_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.serviceId],
			foreignColumns: [portalServices.id],
			name: "portal_bookings_service_id_fkey",
		}),
		check(
			"portal_bookings_status_check",
			sql`status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])`,
		),
	],
);

export const portalReviews = pgTable(
	"portal_reviews",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		bookingId: uuid("booking_id"),
		customerName: text("customer_name").notNull(),
		customerPhone: text("customer_phone"),
		rating: integer().notNull(),
		comment: text(),
		isVisible: boolean("is_visible").default(true),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_portal_reviews_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_portal_reviews_rating").using(
			"btree",
			table.rating.asc().nullsLast().op("int4_ops"),
		),
		foreignKey({
			columns: [table.bookingId],
			foreignColumns: [portalBookings.id],
			name: "portal_reviews_booking_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "portal_reviews_business_id_fkey",
		}).onDelete("cascade"),
		check("portal_reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
	],
);

export const customers = pgTable(
	"customers",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		userId: uuid("user_id"),
		fullName: text("full_name").notNull(),
		phone: text().notNull(),
		email: text(),
		address: text(),
		notes: text(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_customers_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_customers_phone").using(
			"btree",
			table.phone.asc().nullsLast().op("text_ops"),
		),
		index("idx_customers_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "customers_business_id_fkey",
		}).onDelete("cascade"),
		unique("customers_business_id_phone_key").on(table.businessId, table.phone),
	],
);

export const invoices = pgTable(
	"invoices",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id"),
		customerId: uuid("customer_id").notNull(),
		invoiceNumber: text("invoice_number").notNull(),
		status: text().default("unpaid").notNull(),
		issueDate: date("issue_date").default(sql`CURRENT_DATE`).notNull(),
		dueDate: date("due_date").notNull(),
		subtotal: numeric().default("0").notNull(),
		taxAmount: numeric("tax_amount").default("0").notNull(),
		discountAmount: numeric("discount_amount").default("0").notNull(),
		totalAmount: numeric("total_amount").default("0").notNull(),
		amountPaid: numeric("amount_paid").default("0").notNull(),
		notes: text(),
		terms: text(),
		createdBy: uuid("created_by"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_invoices_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "invoices_branch_id_fkey",
		}),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "invoices_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "invoices_customer_id_fkey",
		}),
	],
);

export const deadLetterQueue = pgTable(
	"dead_letter_queue",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id"),
		operation: text().notNull(),
		payload: jsonb().notNull(),
		errorMessage: text("error_message"),
		errorStack: text("error_stack"),
		status: text().default("pending").notNull(),
		retryCount: integer("retry_count").default(0).notNull(),
		lockedAt: timestamp("locked_at", {
			withTimezone: true,
			mode: "string",
		}),
		lockedBy: text("locked_by"),
		nextAttemptAt: timestamp("next_attempt_at", {
			withTimezone: true,
			mode: "string",
		}),
		idempotencyKey: text("idempotency_key"),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_dlq_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_dlq_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("uq_dlq_idempotency").on(
			table.businessId,
			table.idempotencyKey,
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "dead_letter_queue_business_id_fkey",
		}).onDelete("cascade"),
		check(
			"dead_letter_queue_status_check",
			sql`status = ANY (ARRAY['pending'::text, 'processing'::text, 'resolved'::text, 'ignored'::text])`,
		),
	],
);

export const documentTemplates = pgTable(
	"document_templates",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		type: text().notNull(),
		name: text().notNull(),
		content: jsonb().default({}).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_document_templates_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_document_templates_type").using(
			"btree",
			table.type.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "document_templates_business_id_fkey",
		}).onDelete("cascade"),
		unique("document_templates_business_id_type_key").on(
			table.businessId,
			table.type,
		),
	],
);

export const invoiceItems = pgTable(
	"invoice_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		invoiceId: uuid("invoice_id").notNull(),
		itemName: text("item_name").notNull(),
		quantity: numeric().default("1").notNull(),
		unitPrice: numeric("unit_price").default("0").notNull(),
		discount: numeric().default("0").notNull(),
		total: numeric().default("0").notNull(),
	},
	(table) => [
		index("idx_invoice_items_invoice").using(
			"btree",
			table.invoiceId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_items_invoice_id_fkey",
		}).onDelete("cascade"),
	],
);

export const productVariants = pgTable(
	"product_variants",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		productId: uuid("product_id").notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().default("Default").notNull(),
		sku: text(),
		barcode: text(),
		price: numeric().default("0").notNull(),
		costPrice: numeric("cost_price").default("0"),
		unit: text().default("pcs").notNull(),
		isFractional: boolean("is_fractional").default(false).notNull(),
		stock: numeric().default("0").notNull(),
		lowStockThreshold: numeric("low_stock_threshold").default("5"),
		isActive: boolean("is_active").default(true).notNull(),
		sortOrder: integer("sort_order").default(0),
		// Optimistic locking — pair with `WHERE version = X` and the
		// UPDATE sets `version = version + 1` so concurrent racers cannot
		// double-deduct stock.
		version: integer().default(1).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_product_variants_barcode")
			.using("btree", table.barcode.asc().nullsLast().op("text_ops"))
			.where(sql`(barcode IS NOT NULL)`),
		index("idx_product_variants_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_product_variants_product").using(
			"btree",
			table.productId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_product_variants_sku")
			.using("btree", table.sku.asc().nullsLast().op("text_ops"))
			.where(sql`(sku IS NOT NULL)`),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "product_variants_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_variants_product_id_fkey",
		}).onDelete("cascade"),
	],
);

export const invoicePayments = pgTable(
	"invoice_payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		invoiceId: uuid("invoice_id").notNull(),
		paymentDate: timestamp("payment_date", {
			withTimezone: true,
			mode: "string",
		})
			.defaultNow()
			.notNull(),
		amount: numeric().notNull(),
		method: text().notNull(),
		reference: text(),
		recordedBy: uuid("recorded_by"),
	},
	(table) => [
		index("idx_invoice_payments_invoice").using(
			"btree",
			table.invoiceId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_payments_invoice_id_fkey",
		}).onDelete("cascade"),
	],
);

export const whatsappReminders = pgTable(
	"whatsapp_reminders",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		recipientPhone: text("recipient_phone").notNull(),
		recipientName: text("recipient_name").notNull(),
		message: text().notNull(),
		scheduledAt: timestamp("scheduled_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		status: text().default("pending").notNull(),
		relatedType: text("related_type").notNull(),
		relatedId: uuid("related_id"),
		sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_whatsapp_reminders_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_whatsapp_reminders_scheduled_at").using(
			"btree",
			table.scheduledAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("idx_whatsapp_reminders_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "whatsapp_reminders_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const branchHolidays = pgTable(
	"branch_holidays",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		branchId: uuid("branch_id").notNull(),
		businessId: uuid("business_id").notNull(),
		name: text().notNull(),
		date: date().notNull(),
		isRecurring: boolean("is_recurring").default(false),
		createdAt: timestamp("created_at", {
			withTimezone: true,
			mode: "string",
		}).defaultNow(),
	},
	(table) => [
		index("idx_branch_holidays_branch_id").using(
			"btree",
			table.branchId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_branch_holidays_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_branch_holidays_date").using(
			"btree",
			table.date.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "branch_holidays_branch_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "branch_holidays_business_id_fkey",
		}).onDelete("cascade"),
	],
);
export const activeProducts = pgView("active_products", {
	id: uuid(),
	businessId: uuid("business_id"),
	name: text(),
	sku: text(),
	price: numeric(),
	stock: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
	deletedBy: uuid("deleted_by"),
}).as(
	sql`SELECT id, business_id, name, sku, price, stock, created_at, updated_at, deleted_at, deleted_by FROM products WHERE deleted_at IS NULL`,
);

export const publicProducts = pgView("public_products", {
	id: uuid(),
	businessId: uuid("business_id"),
	name: text(),
	sku: text(),
	price: numeric(),
	imageUrl: text("image_url"),
	category: text(),
	isActive: boolean("is_active"),
}).as(
	sql`SELECT id, business_id, name, sku, price, image_url, category, is_active FROM products WHERE is_active = true AND deleted_at IS NULL`,
);

export const portalStats = pgView("portal_stats", {
	businessId: uuid("business_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalReviews: bigint("total_reviews", { mode: "number" }),
	averageRating: numeric("average_rating"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalServices: bigint("total_services", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalPets: bigint("total_pets", { mode: "number" }),
})
	.with({ securityInvoker: true })
	.as(
		sql`SELECT b.id AS business_id, COALESCE(rev.total_reviews, 0::bigint) AS total_reviews, COALESCE(rev.average_rating, 0::numeric) AS average_rating, COALESCE(svc.total_services, 0::bigint) AS total_services, COALESCE(p.total_pets, 0::bigint) AS total_pets FROM businesses b LEFT JOIN ( SELECT portal_reviews.business_id, count(*) AS total_reviews, avg(portal_reviews.rating) AS average_rating FROM portal_reviews GROUP BY portal_reviews.business_id) rev ON rev.business_id = b.id LEFT JOIN ( SELECT portal_services.business_id, count(*) AS total_services FROM portal_services WHERE portal_services.is_active = true GROUP BY portal_services.business_id) svc ON svc.business_id = b.id LEFT JOIN ( SELECT pets.business_id, count(*) AS total_pets FROM pets GROUP BY pets.business_id) p ON p.business_id = b.id`,
	);

export const publicBusinesses = pgView("public_businesses", {
	id: uuid(),
	name: text(),
	slug: text(),
	address: text(),
	phone: text(),
	logoUrl: text("logo_url"),
}).as(
	sql`SELECT id, name, slug, address, phone, logo_url FROM businesses WHERE slug IS NOT NULL`,
);

export const publicBranches = pgView("public_branches", {
	id: uuid(),
	businessId: uuid("business_id"),
	name: text(),
	address: text(),
	phone: text(),
}).as(
	sql`SELECT id, business_id, name, address, phone FROM branches WHERE is_active = true`,
);

export const businessApiKeys = pgTable(
	"business_api_keys",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		keyHash: text("key_hash").notNull(),
		prefix: text().notNull(),
		name: text().notNull(),
		scopes: text("scopes")
			.array()
			.notNull()
			.default(["products:read", "categories:read"]),
		isActive: boolean("is_active").default(true).notNull(),
		creatorId: uuid("creator_id"),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
		revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
		rotatedFromKeyId: uuid("rotated_from_key_id"),
		lastUsedAt: timestamp("last_used_at", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_api_keys_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_api_keys_hash").using(
			"btree",
			table.keyHash.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "business_api_keys_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const webhookEndpoints = pgTable(
	"webhook_endpoints",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		url: text().notNull(),
		secret: text().notNull(),
		events: text("events")
			.array()
			.notNull()
			.default(["order.created", "order.updated"]),
		isActive: boolean("is_active").default(true).notNull(),
		description: text(),
		lastTriggeredAt: timestamp("last_triggered_at", {
			withTimezone: true,
			mode: "string",
		}),
		lastTriggerStatus: integer("last_trigger_status"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
	},
	(table) => [
		index("idx_webhook_endpoints_business").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "webhook_endpoints_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const idempotencyKeys = pgTable(
	"idempotency_keys",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestHash: text("request_hash").notNull(),
		responseBody: jsonb("response_body").notNull(),
		responseStatus: integer("response_status").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("idx_idempotency_keys_lookup").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
			table.idempotencyKey.asc().nullsLast().op("text_ops"),
		),
	],
);

export const passwordResetTokens = pgTable(
	"password_reset_tokens",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_password_reset_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_password_reset_token_hash").using(
			"btree",
			table.tokenHash.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_fkey",
		}).onDelete("cascade"),
	],
);

export const warehouses = pgTable(
	"warehouses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		branchId: uuid("branch_id").notNull(),
		name: text().notNull(),
		code: text(),
		address: text(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_warehouses_business").using("btree", table.businessId.asc()),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "warehouses_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "warehouses_branch_id_fkey",
		}).onDelete("cascade"),
	],
);

export const rackLocations = pgTable(
	"rack_locations",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		warehouseId: uuid("warehouse_id").notNull(),
		name: text().notNull(),
		rack: text(),
		shelf: text(),
		bin: text(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_rack_locations_business").using("btree", table.businessId.asc()),
		index("idx_rack_locations_warehouse").using(
			"btree",
			table.warehouseId.asc(),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "rack_locations_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "rack_locations_warehouse_id_fkey",
		}).onDelete("cascade"),
	],
);
