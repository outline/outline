CREATE TYPE "public"."app_role" AS ENUM('admin', 'staff', 'owner', 'manager', 'kasir', 'staff_daycare');--> statement-breakpoint
CREATE TYPE "public"."boarding_status" AS ENUM('draft', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'transfer', 'qris');--> statement-breakpoint
CREATE TYPE "public"."pet_kind" AS ENUM('cat', 'dog', 'rabbit', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'pro', 'business');--> statement-breakpoint
CREATE TYPE "public"."vaccine_status" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "audit_logs_action_check" CHECK (action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'void'::text, 'login'::text, 'logout'::text, 'export'::text, 'import'::text, 'settings_change'::text]))
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"plan" "plan_type" NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0',
	"currency" text DEFAULT 'IDR',
	"midtrans_order_id" text,
	"midtrans_transaction_id" text,
	"payment_method" text,
	"status" text DEFAULT 'pending',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "billing_events_event_type_check" CHECK (event_type = ANY (ARRAY['payment_success'::text, 'payment_failed'::text, 'subscription_created'::text, 'subscription_renewed'::text, 'subscription_cancelled'::text, 'subscription_paused'::text, 'plan_changed'::text, 'refund'::text])),
	CONSTRAINT "billing_events_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "boarding_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"boarding_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"charge_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "boarding_daily_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"boarding_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"caption" text,
	"taken_date" date DEFAULT CURRENT_DATE NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "boarding_pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"boarding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "pet_kind" NOT NULL,
	"breed" text NOT NULL,
	"vaccinated" "vaccine_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"weight" text,
	"health_status" text DEFAULT 'healthy',
	"initial_condition" text,
	"pet_id" uuid
);
--> statement-breakpoint
CREATE TABLE "boardings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"owner_name" text NOT NULL,
	"owner_address" text NOT NULL,
	"owner_phone" text NOT NULL,
	"check_in_date" date NOT NULL,
	"estimated_check_out_date" date,
	"status" "boarding_status" DEFAULT 'active' NOT NULL,
	"consent_accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"customer_id" uuid,
	"owner_signature" text,
	"version" integer DEFAULT 1 NOT NULL,
	"room_id" uuid,
	"daily_rate" numeric DEFAULT '0',
	"actual_checkout" timestamp with time zone,
	"total_amount" numeric DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "branch_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"is_recurring" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branch_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_members_branch_id_user_id_key" UNIQUE("branch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"capacity" integer DEFAULT 20 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signature_url" text,
	"logo_url" text,
	"slug" text,
	"address" text,
	"phone" text,
	CONSTRAINT "businesses_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sub_type" text,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chart_of_accounts_business_id_code_key" UNIQUE("business_id","code"),
	CONSTRAINT "chart_of_accounts_type_check" CHECK (type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text]))
);
--> statement-breakpoint
CREATE TABLE "commission_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" uuid NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"model" text DEFAULT 'percentage' NOT NULL,
	"rate_percent" numeric DEFAULT '0',
	"rate_fixed" numeric DEFAULT '0',
	"rate_small" numeric DEFAULT '0',
	"rate_medium" numeric DEFAULT '0',
	"rate_large" numeric DEFAULT '0',
	"rate_xl" numeric DEFAULT '0',
	"include_addons" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_loyalty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"total_points" integer DEFAULT 0,
	"available_points" integer DEFAULT 0,
	"current_tier_id" uuid,
	"last_activity_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"customer_id" uuid,
	CONSTRAINT "customer_loyalty_business_id_customer_phone_key" UNIQUE("business_id","customer_phone")
);
--> statement-breakpoint
CREATE TABLE "customer_service_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_loyalty_id" uuid NOT NULL,
	"service_reward_id" uuid NOT NULL,
	"current_visits" integer DEFAULT 0,
	"total_redeemed" integer DEFAULT 0,
	"last_visit_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "customer_service_rewards_customer_loyalty_id_service_reward_key" UNIQUE("customer_loyalty_id","service_reward_id")
);
--> statement-breakpoint
CREATE TABLE "customer_stamps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_loyalty_id" uuid NOT NULL,
	"stamp_card_id" uuid NOT NULL,
	"current_stamps" integer DEFAULT 0,
	"total_redeemed" integer DEFAULT 0,
	"last_stamp_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "customer_stamps_customer_loyalty_id_stamp_card_id_key" UNIQUE("customer_loyalty_id","stamp_card_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_business_id_phone_key" UNIQUE("business_id","phone")
);
--> statement-breakpoint
CREATE TABLE "dead_letter_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"operation" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"error_stack" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dead_letter_queue_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'resolved'::text, 'ignored'::text]))
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_templates_business_id_type_key" UNIQUE("business_id","type")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" text DEFAULT 'cash',
	"receipt_url" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grooming_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_appointment_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"addon_id" uuid NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"service_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"customer_id" uuid,
	"groomer_id" uuid,
	"pet_size" text DEFAULT 'medium' NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"cancellation_reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"photo_type" text DEFAULT 'after' NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"price_small" numeric DEFAULT '0' NOT NULL,
	"price_medium" numeric DEFAULT '0' NOT NULL,
	"price_large" numeric DEFAULT '0' NOT NULL,
	"price_xl" numeric DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"quantity" numeric DEFAULT '1' NOT NULL,
	"unit_price" numeric DEFAULT '0' NOT NULL,
	"discount" numeric DEFAULT '0' NOT NULL,
	"total" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" numeric NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"recorded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"customer_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"issue_date" date DEFAULT CURRENT_DATE NOT NULL,
	"due_date" date NOT NULL,
	"subtotal" numeric DEFAULT '0' NOT NULL,
	"tax_amount" numeric DEFAULT '0' NOT NULL,
	"discount_amount" numeric DEFAULT '0' NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"amount_paid" numeric DEFAULT '0' NOT NULL,
	"notes" text,
	"terms" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"entry_number" text NOT NULL,
	"entry_date" date NOT NULL,
	"description" text,
	"reference_type" text,
	"reference_id" uuid,
	"status" text DEFAULT 'posted',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "journal_entries_business_id_entry_number_key" UNIQUE("business_id","entry_number"),
	CONSTRAINT "journal_entries_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text]))
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kasbon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"remaining" numeric NOT NULL,
	"installment_amount" numeric DEFAULT '0',
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kasbon_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kasbon_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"source" text DEFAULT 'manual',
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"points_per_rupiah" numeric(10, 4) DEFAULT '0.01',
	"points_expiry_days" integer DEFAULT 365,
	"min_redeem_points" integer DEFAULT 100,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "loyalty_config_business_id_key" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_points" integer DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0',
	"benefits" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_loyalty_id" uuid NOT NULL,
	"order_id" uuid,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"description" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "loyalty_transactions_type_check" CHECK (type = ANY (ARRAY['earn'::text, 'redeem'::text, 'expire'::text, 'adjust'::text, 'bonus'::text]))
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric NOT NULL,
	"price_at_time" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"variant_id" uuid,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"discount_type" text,
	"discount_value" numeric DEFAULT '0',
	"discount_amount" numeric DEFAULT '0',
	CONSTRAINT "order_items_quantity_check" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" text NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"customer_id" uuid,
	"discount_type" text,
	"discount_value" numeric DEFAULT '0',
	"discount_amount" numeric DEFAULT '0',
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"voided_reason" text
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid,
	"name" text NOT NULL,
	"species" text DEFAULT 'dog' NOT NULL,
	"breed" text,
	"gender" text,
	"birth_date" date,
	"weight_kg" numeric,
	"color" text,
	"is_vaccinated" boolean DEFAULT false NOT NULL,
	"vaccine_notes" text,
	"allergies" text,
	"medical_notes" text,
	"special_instructions" text,
	"photo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petty_cash" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text NOT NULL,
	"receipt_url" text,
	"transaction_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "petty_cash_type_check" CHECK (type = ANY (ARRAY['in'::text, 'out'::text]))
);
--> statement-breakpoint
CREATE TABLE "po_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"qty_ordered" numeric NOT NULL,
	"qty_received" numeric DEFAULT '0' NOT NULL,
	"unit_cost" numeric DEFAULT '0' NOT NULL,
	"subtotal" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_receiving_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receiving_id" uuid NOT NULL,
	"po_item_id" uuid NOT NULL,
	"qty_received" numeric NOT NULL,
	"expiry_date" date,
	"batch_number" text
);
--> statement-breakpoint
CREATE TABLE "po_receivings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"received_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"received_by" uuid
);
--> statement-breakpoint
CREATE TABLE "portal_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"pet_name" text NOT NULL,
	"pet_species" text,
	"pet_breed" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 60,
	"status" text DEFAULT 'pending',
	"notes" text,
	"deposit_amount" numeric(12, 2) DEFAULT '0',
	"deposit_paid" boolean DEFAULT false,
	"deposit_paid_at" timestamp with time zone,
	"total_amount" numeric(12, 2),
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "portal_bookings_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]))
);
--> statement-breakpoint
CREATE TABLE "portal_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"logo_url" text,
	"banner_url" text,
	"primary_color" text DEFAULT '#10b981',
	"description" text,
	"booking_enabled" boolean DEFAULT true,
	"login_enabled" boolean DEFAULT true,
	"guest_booking" boolean DEFAULT false,
	"deposit_required" boolean DEFAULT true,
	"deposit_amount" numeric(12, 2) DEFAULT '0',
	"deposit_percent" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "portal_config_business_id_key" UNIQUE("business_id"),
	CONSTRAINT "portal_config_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "portal_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"booking_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"rating" integer NOT NULL,
	"comment" text,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "portal_reviews_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
CREATE TABLE "portal_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 60,
	"price" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"batch_number" text,
	"quantity" numeric DEFAULT '0' NOT NULL,
	"initial_qty" numeric DEFAULT '0' NOT NULL,
	"cost_price" numeric DEFAULT '0' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expiry_date" date,
	"supplier_id" uuid,
	"po_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text DEFAULT 'Default' NOT NULL,
	"sku" text,
	"barcode" text,
	"price" numeric DEFAULT '0' NOT NULL,
	"cost_price" numeric DEFAULT '0',
	"unit" text DEFAULT 'pcs' NOT NULL,
	"is_fractional" boolean DEFAULT false NOT NULL,
	"stock" numeric DEFAULT '0' NOT NULL,
	"low_stock_threshold" numeric DEFAULT '5',
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"price" numeric DEFAULT '0' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"category" text,
	"description" text,
	"has_variants" boolean DEFAULT false NOT NULL,
	"brand" text,
	"image_url" text,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"is_fractional" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"phone_number" text,
	"preferred_language" text DEFAULT 'id',
	"pin_hash" text,
	CONSTRAINT "profiles_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"min_order_amount" numeric(12, 2) DEFAULT '0',
	"max_discount_amount" numeric(12, 2),
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"max_uses_per_customer" integer DEFAULT 1,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true,
	"applicable_services" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "promo_codes_business_id_code_key" UNIQUE("business_id","code"),
	CONSTRAINT "promo_codes_type_check" CHECK (type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'free_service'::text]))
);
--> statement-breakpoint
CREATE TABLE "promo_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"customer_loyalty_id" uuid,
	"order_id" uuid,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"used_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"supplier_id" uuid NOT NULL,
	"po_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"notes" text,
	"order_date" date DEFAULT CURRENT_DATE NOT NULL,
	"expected_date" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"qty" numeric NOT NULL,
	"reason" text,
	"is_damaged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"refund_method" text,
	"refund_amount" numeric DEFAULT '0' NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"name" text NOT NULL,
	"room_type" text DEFAULT 'standard' NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"daily_rate" numeric DEFAULT '0' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasonal_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"surcharge_percent" numeric DEFAULT '0',
	"surcharge_fixed" numeric DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"service_type" text NOT NULL,
	"required_visits" integer DEFAULT 5 NOT NULL,
	"free_visit_value" numeric(12, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_attendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"date" date NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_off_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_schedules_day_of_week_check" CHECK ((day_of_week >= 0) AND (day_of_week <= 6))
);
--> statement-breakpoint
CREATE TABLE "stamp_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"service_type" text,
	"total_stamps" integer DEFAULT 10 NOT NULL,
	"free_service" text,
	"free_service_value" numeric(12, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"batch_id" uuid,
	"type" text NOT NULL,
	"quantity" numeric NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"plan" "plan_type" DEFAULT 'free' NOT NULL,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active',
	"current_period_start" timestamp with time zone DEFAULT now(),
	"current_period_end" timestamp with time zone DEFAULT (now() + '30 days'::interval),
	"midtrans_subscription_id" text,
	"cancel_at_period_end" boolean DEFAULT false,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "subscriptions_status_check" CHECK (status = ANY (ARRAY['active'::text, 'past_due'::text, 'cancelled'::text, 'paused'::text]))
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"role" "app_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_business_id_role_key" UNIQUE("user_id","business_id","role")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"phone_number" text,
	"is_connected" boolean DEFAULT false,
	"api_key" text,
	"auto_reminder" boolean DEFAULT true,
	"reminder_hours_before" integer DEFAULT 24,
	"auto_payment_confirm" boolean DEFAULT true,
	"auto_loyalty_notify" boolean DEFAULT true,
	"auto_booking_confirm" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whatsapp_config_business_id_key" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"template_id" uuid,
	"recipient_phone" text NOT NULL,
	"recipient_name" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending',
	"error_message" text,
	"external_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whatsapp_messages_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "whatsapp_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_name" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"related_type" text NOT NULL,
	"related_id" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_scheduled" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"template_id" uuid,
	"recipient_phone" text NOT NULL,
	"recipient_name" text,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whatsapp_scheduled_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'cancelled'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whatsapp_templates_category_check" CHECK (category = ANY (ARRAY['booking'::text, 'payment'::text, 'loyalty'::text, 'promo'::text, 'reminder'::text, 'custom'::text]))
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_charges" ADD CONSTRAINT "boarding_charges_boarding_id_fkey" FOREIGN KEY ("boarding_id") REFERENCES "public"."boardings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_charges" ADD CONSTRAINT "boarding_charges_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_daily_photos" ADD CONSTRAINT "boarding_daily_photos_boarding_id_fkey" FOREIGN KEY ("boarding_id") REFERENCES "public"."boardings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_pets" ADD CONSTRAINT "boarding_pets_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_pets" ADD CONSTRAINT "pets_boarding_id_fkey" FOREIGN KEY ("boarding_id") REFERENCES "public"."boardings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardings" ADD CONSTRAINT "boardings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardings" ADD CONSTRAINT "boardings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardings" ADD CONSTRAINT "boardings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardings" ADD CONSTRAINT "boardings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_holidays" ADD CONSTRAINT "branch_holidays_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_holidays" ADD CONSTRAINT "branch_holidays_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_members" ADD CONSTRAINT "branch_members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_current_tier_id_fkey" FOREIGN KEY ("current_tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_service_rewards" ADD CONSTRAINT "customer_service_rewards_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_service_rewards" ADD CONSTRAINT "customer_service_rewards_customer_loyalty_id_fkey" FOREIGN KEY ("customer_loyalty_id") REFERENCES "public"."customer_loyalty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_service_rewards" ADD CONSTRAINT "customer_service_rewards_service_reward_id_fkey" FOREIGN KEY ("service_reward_id") REFERENCES "public"."service_rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_stamps" ADD CONSTRAINT "customer_stamps_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_stamps" ADD CONSTRAINT "customer_stamps_customer_loyalty_id_fkey" FOREIGN KEY ("customer_loyalty_id") REFERENCES "public"."customer_loyalty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_stamps" ADD CONSTRAINT "customer_stamps_stamp_card_id_fkey" FOREIGN KEY ("stamp_card_id") REFERENCES "public"."stamp_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_addons" ADD CONSTRAINT "grooming_addons_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointment_addons" ADD CONSTRAINT "grooming_appointment_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "public"."grooming_addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointment_addons" ADD CONSTRAINT "grooming_appointment_addons_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."grooming_appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_groomer_id_fkey" FOREIGN KEY ("groomer_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."grooming_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_photos" ADD CONSTRAINT "grooming_photos_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."grooming_appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_services" ADD CONSTRAINT "grooming_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kasbon" ADD CONSTRAINT "kasbon_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kasbon" ADD CONSTRAINT "kasbon_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kasbon_payments" ADD CONSTRAINT "kasbon_payments_kasbon_id_fkey" FOREIGN KEY ("kasbon_id") REFERENCES "public"."kasbon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD CONSTRAINT "loyalty_config_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_loyalty_id_fkey" FOREIGN KEY ("customer_loyalty_id") REFERENCES "public"."customer_loyalty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash" ADD CONSTRAINT "petty_cash_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash" ADD CONSTRAINT "petty_cash_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receiving_items" ADD CONSTRAINT "po_receiving_items_po_item_id_fkey" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receiving_items" ADD CONSTRAINT "po_receiving_items_receiving_id_fkey" FOREIGN KEY ("receiving_id") REFERENCES "public"."po_receivings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receivings" ADD CONSTRAINT "po_receivings_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_bookings" ADD CONSTRAINT "portal_bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_bookings" ADD CONSTRAINT "portal_bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_bookings" ADD CONSTRAINT "portal_bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."portal_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_config" ADD CONSTRAINT "portal_config_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_reviews" ADD CONSTRAINT "portal_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."portal_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_reviews" ADD CONSTRAINT "portal_reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_services" ADD CONSTRAINT "portal_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usage" ADD CONSTRAINT "promo_usage_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usage" ADD CONSTRAINT "promo_usage_customer_loyalty_id_fkey" FOREIGN KEY ("customer_loyalty_id") REFERENCES "public"."customer_loyalty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usage" ADD CONSTRAINT "promo_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usage" ADD CONSTRAINT "promo_usage_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasonal_pricing" ADD CONSTRAINT "seasonal_pricing_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_rewards" ADD CONSTRAINT "service_rewards_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_cards" ADD CONSTRAINT "stamp_cards_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."product_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_config" ADD CONSTRAINT "whatsapp_config_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_reminders" ADD CONSTRAINT "whatsapp_reminders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_scheduled" ADD CONSTRAINT "whatsapp_scheduled_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_scheduled" ADD CONSTRAINT "whatsapp_scheduled_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_business" ON "audit_logs" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type" text_ops,"entity_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_billing_events_business" ON "billing_events" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_billing_events_status" ON "billing_events" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_boarding_charges_boarding" ON "boarding_charges" USING btree ("boarding_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_boarding_photos_boarding" ON "boarding_daily_photos" USING btree ("boarding_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pets_boarding" ON "boarding_pets" USING btree ("boarding_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_boarding_room" ON "boardings" USING btree ("room_id" uuid_ops) WHERE (room_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_boardings_branch" ON "boardings" USING btree ("branch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_boardings_business" ON "boardings" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_boardings_customer" ON "boardings" USING btree ("customer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_boardings_status" ON "boardings" USING btree ("status" enum_ops,"is_archived" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_branch_holidays_branch_id" ON "branch_holidays" USING btree ("branch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_branch_holidays_business_id" ON "branch_holidays" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_branch_holidays_date" ON "branch_holidays" USING btree ("date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_branch_members_user" ON "branch_members" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_branches_business" ON "branches" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chart_of_accounts_business" ON "chart_of_accounts" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chart_of_accounts_type" ON "chart_of_accounts" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_commission_records_business" ON "commission_records" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_commission_records_staff" ON "commission_records" USING btree ("staff_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_commission_rules_business" ON "commission_rules" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_commission_rules_staff" ON "commission_rules" USING btree ("staff_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_loyalty_business" ON "customer_loyalty" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_loyalty_customer" ON "customer_loyalty" USING btree ("customer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_loyalty_phone" ON "customer_loyalty" USING btree ("customer_phone" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_loyalty_points" ON "customer_loyalty" USING btree ("available_points" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_service_rewards_customer" ON "customer_service_rewards" USING btree ("customer_loyalty_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_stamps_card" ON "customer_stamps" USING btree ("stamp_card_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_stamps_customer" ON "customer_stamps" USING btree ("customer_loyalty_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_business" ON "customers" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_user" ON "customers" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_dlq_business" ON "dead_letter_queue" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_dlq_status" ON "dead_letter_queue" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_document_templates_business" ON "document_templates" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_document_templates_type" ON "document_templates" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_expenses_branch" ON "expenses" USING btree ("branch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_expenses_business" ON "expenses" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_expenses_category" ON "expenses" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_expenses_date" ON "expenses" USING btree ("expense_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_groom_appt_business" ON "grooming_appointments" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_groom_appt_groomer" ON "grooming_appointments" USING btree ("groomer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_groom_appt_scheduled" ON "grooming_appointments" USING btree ("scheduled_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_groom_appt_status" ON "grooming_appointments" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_groom_photos_appt" ON "grooming_photos" USING btree ("appointment_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_invoice_items_invoice" ON "invoice_items" USING btree ("invoice_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_invoice_payments_invoice" ON "invoice_payments" USING btree ("invoice_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_business" ON "invoices" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_journal_entries_business" ON "journal_entries" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_journal_entries_date" ON "journal_entries" USING btree ("entry_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_journal_entries_reference" ON "journal_entries" USING btree ("reference_type" text_ops,"reference_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_journal_entry_lines_account" ON "journal_entry_lines" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_journal_entry_lines_entry" ON "journal_entry_lines" USING btree ("journal_entry_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_kasbon_business" ON "kasbon" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_kasbon_staff" ON "kasbon" USING btree ("staff_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loyalty_tiers_business" ON "loyalty_tiers" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loyalty_tiers_min_points" ON "loyalty_tiers" USING btree ("min_points" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_loyalty_transactions_customer" ON "loyalty_transactions" USING btree ("customer_loyalty_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loyalty_transactions_order" ON "loyalty_transactions" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loyalty_transactions_type" ON "loyalty_transactions" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_order_items_variant" ON "order_items" USING btree ("variant_id" uuid_ops) WHERE (variant_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_order_payments_order" ON "order_payments" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_branch" ON "orders" USING btree ("branch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_business" ON "orders" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pets_business" ON "pets" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pets_customer" ON "pets" USING btree ("customer_id" uuid_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_petty_cash_business" ON "petty_cash" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_petty_cash_date" ON "petty_cash" USING btree ("transaction_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_po_items_po" ON "po_items" USING btree ("po_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_po_receiving_items_receiving" ON "po_receiving_items" USING btree ("receiving_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_po_receivings_po" ON "po_receivings" USING btree ("po_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_bookings_branch" ON "portal_bookings" USING btree ("branch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_bookings_business" ON "portal_bookings" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_bookings_customer" ON "portal_bookings" USING btree ("customer_phone" text_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_bookings_scheduled" ON "portal_bookings" USING btree ("scheduled_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_bookings_status" ON "portal_bookings" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_config_slug" ON "portal_config" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_reviews_business" ON "portal_reviews" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_reviews_rating" ON "portal_reviews" USING btree ("rating" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_portal_services_business" ON "portal_services" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_business" ON "product_batches" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_expiry" ON "product_batches" USING btree ("expiry_date" date_ops) WHERE (expiry_date IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_batches_variant" ON "product_batches" USING btree ("variant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_product_variants_barcode" ON "product_variants" USING btree ("barcode" text_ops) WHERE (barcode IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_product_variants_business" ON "product_variants" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_product_variants_product" ON "product_variants" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_product_variants_sku" ON "product_variants" USING btree ("sku" text_ops) WHERE (sku IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_products_business" ON "products" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_deleted_at" ON "products" USING btree ("deleted_at" timestamptz_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_profiles_business" ON "profiles" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_promo_codes_business" ON "promo_codes" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_promo_codes_code" ON "promo_codes" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_promo_codes_valid" ON "promo_codes" USING btree ("valid_from" timestamptz_ops,"valid_until" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_promo_usage_customer" ON "promo_usage" USING btree ("customer_loyalty_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_promo_usage_promo" ON "promo_usage" USING btree ("promo_code_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_business" ON "purchase_orders" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_return_items_return" ON "return_items" USING btree ("return_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_returns_business" ON "returns" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_returns_order" ON "returns" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_rooms_business" ON "rooms" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_service_rewards_business" ON "service_rewards" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_attendances_business" ON "staff_attendances" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attendances_staff_date" ON "staff_attendances" USING btree ("staff_id" uuid_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_schedules_business" ON "staff_schedules" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_schedules_staff_day" ON "staff_schedules" USING btree ("staff_id" uuid_ops,"day_of_week" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_stamp_cards_business" ON "stamp_cards" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_movements_business" ON "stock_movements" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_movements_created" ON "stock_movements" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_movements_variant" ON "stock_movements" USING btree ("variant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_suppliers_business" ON "suppliers" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_roles_user" ON "user_roles" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_business" ON "whatsapp_messages" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_recipient" ON "whatsapp_messages" USING btree ("recipient_phone" text_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_status" ON "whatsapp_messages" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_reminders_business_id" ON "whatsapp_reminders" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_reminders_scheduled_at" ON "whatsapp_reminders" USING btree ("scheduled_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_reminders_status" ON "whatsapp_reminders" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_scheduled_business" ON "whatsapp_scheduled" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_scheduled_status" ON "whatsapp_scheduled" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_scheduled_time" ON "whatsapp_scheduled" USING btree ("scheduled_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_templates_business" ON "whatsapp_templates" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."active_products" AS (SELECT id, business_id, name, sku, price, stock, created_at, updated_at, deleted_at, deleted_by FROM products WHERE deleted_at IS NULL);--> statement-breakpoint
CREATE VIEW "public"."portal_stats" WITH (security_invoker = true) AS (SELECT b.id AS business_id, COALESCE(rev.total_reviews, 0::bigint) AS total_reviews, COALESCE(rev.average_rating, 0::numeric) AS average_rating, COALESCE(svc.total_services, 0::bigint) AS total_services, COALESCE(p.total_pets, 0::bigint) AS total_pets FROM businesses b LEFT JOIN ( SELECT portal_reviews.business_id, count(*) AS total_reviews, avg(portal_reviews.rating) AS average_rating FROM portal_reviews GROUP BY portal_reviews.business_id) rev ON rev.business_id = b.id LEFT JOIN ( SELECT portal_services.business_id, count(*) AS total_services FROM portal_services WHERE portal_services.is_active = true GROUP BY portal_services.business_id) svc ON svc.business_id = b.id LEFT JOIN ( SELECT pets.business_id, count(*) AS total_pets FROM pets GROUP BY pets.business_id) p ON p.business_id = b.id);--> statement-breakpoint
CREATE VIEW "public"."public_branches" AS (SELECT id, business_id, name, address, phone FROM branches WHERE is_active = true);--> statement-breakpoint
CREATE VIEW "public"."public_businesses" AS (SELECT id, name, slug, address, phone, logo_url FROM businesses WHERE slug IS NOT NULL);--> statement-breakpoint
CREATE VIEW "public"."public_products" AS (SELECT id, business_id, name, sku, price, image_url, category, is_active FROM products WHERE is_active = true AND deleted_at IS NULL);