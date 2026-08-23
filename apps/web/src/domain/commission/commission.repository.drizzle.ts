import { and, desc, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	commissionRecords,
	commissionRules,
	kasbon,
	kasbonPayments,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import {
	CommissionRuleNotFoundError,
	KasbonNotFoundError,
} from "./commission.errors";
import { CommissionRepository } from "./commission.repository";
import type {
	TCommissionRecord,
	TCommissionRecordId,
	TCommissionRule,
	TCommissionRuleId,
	TKasbon,
	TKasbonId,
	TKasbonPayment,
	TKasbonPaymentId,
} from "./commission.types";

type TCommissionRuleRow = typeof commissionRules.$inferSelect;
type TCommissionRecordRow = typeof commissionRecords.$inferSelect;
type TKasbonRow = typeof kasbon.$inferSelect;
type TKasbonPaymentRow = typeof kasbonPayments.$inferSelect;

const mapRuleRow = (row: TCommissionRuleRow): TCommissionRule => ({
	id: row.id as TCommissionRuleId,
	tenantId: row.businessId as TTenantId,
	staffId: row.staffId as TStaffId,
	model: row.model as TCommissionRule["model"],
	ratePercent: Number(row.ratePercent ?? "0"),
	rateFixed: Number(row.rateFixed ?? "0"),
	rateSmall: Number(row.rateSmall ?? "0"),
	rateMedium: Number(row.rateMedium ?? "0"),
	rateLarge: Number(row.rateLarge ?? "0"),
	rateXl: Number(row.rateXl ?? "0"),
	includeAddons: row.includeAddons ?? false,
	isActive: row.isActive,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapRecordRow = (row: TCommissionRecordRow): TCommissionRecord => ({
	id: row.id as TCommissionRecordId,
	tenantId: row.businessId as TTenantId,
	staffId: row.staffId as TStaffId,
	referenceType: row.referenceType as "order" | "grooming",
	referenceId: row.referenceId,
	amount: Number(row.amount),
	status: row.status as "pending" | "paid",
	paidAt: row.paidAt ? new Date(row.paidAt) : null,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapKasbonRow = (row: TKasbonRow): TKasbon => ({
	id: row.id as TKasbonId,
	tenantId: row.businessId as TTenantId,
	staffId: row.staffId as TStaffId,
	amount: Number(row.amount),
	remaining: Number(row.remaining),
	installmentAmount: Number(row.installmentAmount),
	notes: row.notes,
	status: row.status as "active" | "paid_off",
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapPaymentRow = (row: TKasbonPaymentRow): TKasbonPayment => ({
	id: row.id as TKasbonPaymentId,
	kasbonId: row.kasbonId as TKasbonId,
	amount: Number(row.amount),
	source: row.source as "manual" | "commission_deduction",
	paidAt: new Date(row.paidAt),
});

export const CommissionRepositoryDrizzle = Layer.effect(
	CommissionRepository,
	Effect.map(IDrizzleClient, (db) =>
		CommissionRepository.of({
			findAllKasbon: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select({ kasbon })
								.from(kasbon)
								.where(eq(kasbon.businessId, tenantId))
								.orderBy(desc(kasbon.createdAt));
							const payments = await db
								.select({ payment: kasbonPayments })
								.from(kasbonPayments)
								.innerJoin(kasbon, eq(kasbonPayments.kasbonId, kasbon.id))
								.where(eq(kasbon.businessId, tenantId));
							const paymentsByKasbon = new Map<string, TKasbonPayment[]>();
							for (const row of payments) {
								const payment = mapPaymentRow(row.payment);
								const existing = paymentsByKasbon.get(payment.kasbonId) ?? [];
								existing.push(payment);
								paymentsByKasbon.set(payment.kasbonId, existing);
							}
							return rows.map((row) => {
								const mapped = mapKasbonRow(row.kasbon);
								return {
									...mapped,
									payments: paymentsByKasbon.get(mapped.id) ?? [],
								};
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			findRuleByStaffId: (staffId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(commissionRules)
								.where(
									and(
										eq(commissionRules.staffId, staffId),
										eq(commissionRules.businessId, tenantId),
									),
								)
								.limit(1);

							const row = rows[0];
							return row ? mapRuleRow(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveRule: (rule) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.insert(commissionRules)
								.values({
									businessId: rule.tenantId,
									staffId: rule.staffId,
									model: rule.model,
									ratePercent: rule.ratePercent.toString(),
									rateFixed: rule.rateFixed.toString(),
									rateSmall: rule.rateSmall.toString(),
									rateMedium: rule.rateMedium.toString(),
									rateLarge: rule.rateLarge.toString(),
									rateXl: rule.rateXl.toString(),
									includeAddons: rule.includeAddons,
									isActive: rule.isActive,
								})
								.returning();

							const row = rows[0];
							if (!row) {
								throw new Error("commission_rules insert returned no row");
							}
							return mapRuleRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			updateRule: (id, tenantId, rule) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const updates: Record<string, unknown> = {};
							if (rule.model !== undefined) updates.model = rule.model;
							if (rule.ratePercent !== undefined)
								updates.ratePercent = rule.ratePercent.toString();
							if (rule.rateFixed !== undefined)
								updates.rateFixed = rule.rateFixed.toString();
							if (rule.rateSmall !== undefined)
								updates.rateSmall = rule.rateSmall.toString();
							if (rule.rateMedium !== undefined)
								updates.rateMedium = rule.rateMedium.toString();
							if (rule.rateLarge !== undefined)
								updates.rateLarge = rule.rateLarge.toString();
							if (rule.rateXl !== undefined)
								updates.rateXl = rule.rateXl.toString();
							if (rule.includeAddons !== undefined)
								updates.includeAddons = rule.includeAddons;
							if (rule.isActive !== undefined) updates.isActive = rule.isActive;

							const rows = await db
								.update(commissionRules)
								.set({
									...updates,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(commissionRules.id, id),
										eq(commissionRules.businessId, tenantId),
									),
								)
								.returning();

							const updated = rows[0];
							return updated ? mapRuleRow(updated) : null;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}).pipe(
						Effect.flatMap((updated) =>
							updated
								? Effect.succeed(updated)
								: Effect.fail(new CommissionRuleNotFoundError({ id })),
						),
					),
				),

			findRecordsByStaffId: (staffId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(commissionRecords)
								.where(
									and(
										eq(commissionRecords.staffId, staffId),
										eq(commissionRecords.businessId, tenantId),
									),
								)
								.orderBy(desc(commissionRecords.createdAt));

							return rows.map(mapRecordRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveRecord: (record) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.insert(commissionRecords)
								.values({
									businessId: record.tenantId,
									staffId: record.staffId,
									referenceType: record.referenceType,
									referenceId: record.referenceId,
									amount: record.amount.toString(),
									status: "pending",
								})
								.returning();

							const row = rows[0];
							if (!row) {
								throw new Error("commission_records insert returned no row");
							}
							return mapRecordRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			markRecordsAsPaid: (staffId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(commissionRecords)
								.set({
									status: "paid",
									paidAt: new Date().toISOString(),
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(commissionRecords.staffId, staffId),
										eq(commissionRecords.businessId, tenantId),
										eq(commissionRecords.status, "pending"),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findKasbonByStaffId: (staffId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(kasbon)
								.where(
									and(
										eq(kasbon.staffId, staffId),
										eq(kasbon.businessId, tenantId),
									),
								)
								.orderBy(desc(kasbon.createdAt));

							return rows.map(mapKasbonRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveKasbon: (kasbonInput) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.insert(kasbon)
								.values({
									businessId: kasbonInput.tenantId,
									staffId: kasbonInput.staffId,
									amount: kasbonInput.amount.toString(),
									remaining: kasbonInput.amount.toString(),
									installmentAmount: kasbonInput.installmentAmount.toString(),
									notes: kasbonInput.notes,
									status: "active",
								})
								.returning();

							const row = rows[0];
							if (!row) {
								throw new Error("kasbon insert returned no row");
							}
							return mapKasbonRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			addKasbonPayment: (payment, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// Atomic kasbon payment port — mirrors
							// atomic_add_kasbon_payment RPC. Locks the
							// kasbon row FOR UPDATE, validates tenant
							// ownership, inserts the payment row, then
							// updates the kasbon remaining balance —
							// all in one Postgres transaction. Returns
							// KasbonNotFoundError on the same conditions
							// the RPC raised an exception for.
							return await db.transaction(async (tx) => {
								const kasbonRows = await tx
									.select()
									.from(kasbon)
									.where(eq(kasbon.id, payment.kasbonId))
									.for("update")
									.limit(1);

								const kasbonRow = kasbonRows[0];
								if (!kasbonRow) {
									throw new KasbonNotFoundError({ id: payment.kasbonId });
								}
								if (kasbonRow.businessId !== tenantId) {
									throw new KasbonNotFoundError({ id: payment.kasbonId });
								}

								const newRemaining = Math.max(
									0,
									Number(kasbonRow.remaining) - payment.amount,
								);
								const newStatus: "active" | "paid_off" =
									newRemaining <= 0 ? "paid_off" : "active";

								const paymentRows = await tx
									.insert(kasbonPayments)
									.values({
										kasbonId: payment.kasbonId,
										amount: payment.amount.toString(),
										source: payment.source,
									})
									.returning();

								const paymentRow = paymentRows[0];
								if (!paymentRow) {
									throw new Error("kasbon_payments insert returned no row");
								}

								await tx
									.update(kasbon)
									.set({
										remaining: sql`${newRemaining}`,
										status: newStatus,
										updatedAt: new Date().toISOString(),
									})
									.where(eq(kasbon.id, payment.kasbonId));

								return mapPaymentRow(paymentRow);
							});
						},
						catch: (e) => {
							if (e instanceof KasbonNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),
		}),
	),
);
