import { and, eq, ilike, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { customers } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { generateId } from "@/shared/utils";
import { ICustomerRepository } from "./customer.repository";
import type { ICustomer, TCustomerId } from "./customer.types";

export const CustomerRepositoryDrizzle = Layer.effect(
	ICustomerRepository,
	Effect.map(IDrizzleClient, (db) =>
		ICustomerRepository.of({
			findAll: (businessId, search) =>
				Effect.tryPromise({
					try: async () => {
						const conditions = [eq(customers.businessId, businessId)];
						if (search) {
							const pattern = `%${search}%`;
							const searchCondition = or(
								ilike(customers.fullName, pattern),
								ilike(customers.phone, pattern),
								ilike(customers.email, pattern),
							);
							if (searchCondition) conditions.push(searchCondition);
						}

						// Defensive upper bound - the admin customer list renders
						// whatever this returns with no client-side pagination, so this
						// cap must stay far above any realistic tenant's customer count
						// rather than changing behavior. It only guards against an
						// unbounded full-table fetch on every debounced search keystroke
						// as a tenant's customer base grows.
						const MAX_CUSTOMER_SCAN = 500;
						const rows = await db
							.select()
							.from(customers)
							.where(and(...conditions))
							.orderBy(customers.createdAt)
							.limit(MAX_CUSTOMER_SCAN);
						return rows.map(mapCustomer);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findById: (businessId, id) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.customers.findFirst({
							where: (c, { and, eq }) =>
								and(eq(c.id, id), eq(c.businessId, businessId)),
						});
						if (!row) return null;
						return mapCustomer(row);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findByPhone: (businessId, phone) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.customers.findFirst({
							where: (c, { and, eq }) =>
								and(eq(c.businessId, businessId), eq(c.phone, phone)),
						});
						if (!row) return null;
						return mapCustomer(row);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			create: (businessId, cmd) =>
				Effect.tryPromise({
					try: async () => {
						const id = generateId<TCustomerId>();
						const now = new Date().toISOString();
						const [row] = await db
							.insert(customers)
							.values({
								id,
								businessId,
								fullName: cmd.fullName,
								phone: cmd.phone,
								email: cmd.email ?? null,
								address: cmd.address ?? null,
								notes: cmd.notes ?? null,
								isActive: true,
								createdAt: now,
								updatedAt: now,
							})
							.returning();
						return mapCustomer(row as typeof customers.$inferSelect);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			update: (businessId, cmd) =>
				Effect.tryPromise({
					try: async () => {
						const now = new Date().toISOString();
						const [row] = await db
							.update(customers)
							.set({
								fullName: cmd.fullName,
								phone: cmd.phone,
								email: cmd.email,
								address: cmd.address,
								notes: cmd.notes,
								isActive: cmd.isActive,
								updatedAt: now,
							})
							.where(
								and(
									eq(customers.id, cmd.id),
									eq(customers.businessId, businessId),
								),
							)
							.returning();

						if (!row) {
							throw new Error("Customer not found");
						}

						return mapCustomer(row);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			delete: (businessId, id) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.delete(customers)
							.where(
								and(eq(customers.id, id), eq(customers.businessId, businessId)),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
		}),
	),
);

function mapCustomer(row: typeof customers.$inferSelect): ICustomer {
	return {
		id: row.id as TCustomerId,
		businessId: row.businessId,
		userId: row.userId,
		fullName: row.fullName,
		phone: row.phone,
		email: row.email,
		address: row.address,
		notes: row.notes,
		isActive: row.isActive,
		createdAt: new Date(row.createdAt),
		updatedAt: new Date(row.updatedAt),
	};
}
