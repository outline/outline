import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { suppliers } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { ISupplierRepository } from "./supplier.repository";
import type { TSupplier, TSupplierId } from "./supplier.types";

const mapSupplier = (row: typeof suppliers.$inferSelect): TSupplier => ({
	id: row.id as TSupplierId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	contactPerson: row.contactPerson,
	phone: row.phone,
	email: row.email,
	address: row.address,
	notes: row.notes,
	isActive: row.isActive,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

export const SupplierRepositoryDrizzle = Layer.effect(
	ISupplierRepository,
	Effect.map(IDrizzleClient, (db) =>
		ISupplierRepository.of({
			findAll: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(suppliers)
								.where(eq(suppliers.businessId, tenantId))
								.orderBy(asc(suppliers.name));
							return rows.map(mapSupplier);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findById: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(suppliers)
								.where(
									and(eq(suppliers.id, id), eq(suppliers.businessId, tenantId)),
								)
								.limit(1);
							const row = rows[0];
							return row ? mapSupplier(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			save: (supplier) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(suppliers).values({
								id: supplier.id,
								businessId: supplier.tenantId,
								name: supplier.name,
								contactPerson: supplier.contactPerson,
								phone: supplier.phone,
								email: supplier.email,
								address: supplier.address,
								notes: supplier.notes,
								isActive: supplier.isActive,
								createdAt: supplier.createdAt.toISOString(),
								updatedAt: supplier.updatedAt.toISOString(),
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			update: (supplier) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(suppliers)
								.set({
									name: supplier.name,
									contactPerson: supplier.contactPerson,
									phone: supplier.phone,
									email: supplier.email,
									address: supplier.address,
									notes: supplier.notes,
									isActive: supplier.isActive,
									updatedAt: supplier.updatedAt.toISOString(),
								})
								.where(
									and(
										eq(suppliers.id, supplier.id),
										eq(suppliers.businessId, supplier.tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			delete: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.delete(suppliers)
								.where(
									and(eq(suppliers.id, id), eq(suppliers.businessId, tenantId)),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
