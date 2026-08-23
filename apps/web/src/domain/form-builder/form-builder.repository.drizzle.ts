import { and, eq, ilike } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branches,
	customers,
	products,
	rooms,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IFormBuilderRepository } from "./form-builder.repository";
import type { TLinkDoctype, TLinkOption } from "./form-builder.types";

const SEARCH_LIMIT = 20;

// TODO(form-builder): staff has no Drizzle pgTable yet — staff lives in
// `profiles` + `user_roles`. Resolve via join once Phase 1 schema lands it.
const STAFF_NOT_MIGRATED: TLinkOption[] = [];

export const FormBuilderRepositoryDrizzle = Layer.effect(
	IFormBuilderRepository,
	Effect.map(IDrizzleClient, (db) =>
		IFormBuilderRepository.of({
			getLinkDoctypeOptions: (
				tenantId: TTenantId,
				doctype: TLinkDoctype,
				search: string,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async (): Promise<readonly TLinkOption[]> => {
							const pattern = search ? `%${search}%` : null;

							switch (doctype) {
								case "Branch": {
									const where = pattern
										? and(
												eq(branches.businessId, tenantId),
												ilike(branches.name, pattern),
											)
										: eq(branches.businessId, tenantId);
									const rows = await db
										.select({
											value: branches.id,
											label: branches.name,
										})
										.from(branches)
										.where(where)
										.limit(SEARCH_LIMIT);
									return rows;
								}
								case "Customer": {
									const where = pattern
										? and(
												eq(customers.businessId, tenantId),
												ilike(customers.fullName, pattern),
											)
										: eq(customers.businessId, tenantId);
									const rows = await db
										.select({
											value: customers.id,
											label: customers.fullName,
										})
										.from(customers)
										.where(where)
										.limit(SEARCH_LIMIT);
									return rows;
								}
								case "Product": {
									const where = pattern
										? and(
												eq(products.businessId, tenantId),
												ilike(products.name, pattern),
											)
										: eq(products.businessId, tenantId);
									const rows = await db
										.select({
											value: products.id,
											label: products.name,
										})
										.from(products)
										.where(where)
										.limit(SEARCH_LIMIT);
									return rows;
								}
								case "Room": {
									const where = pattern
										? and(
												eq(rooms.businessId, tenantId),
												ilike(rooms.name, pattern),
											)
										: eq(rooms.businessId, tenantId);
									const rows = await db
										.select({
											value: rooms.id,
											label: rooms.name,
										})
										.from(rooms)
										.where(where)
										.limit(SEARCH_LIMIT);
									return rows;
								}
								case "Staff":
									return STAFF_NOT_MIGRATED;
							}
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
