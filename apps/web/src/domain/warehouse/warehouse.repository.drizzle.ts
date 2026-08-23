import { and, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { rackLocations, warehouses } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import {
	RackLocationNotFoundError,
	WarehouseNotFoundError,
} from "./warehouse.errors";
import { IWarehouseRepository } from "./warehouse.repository";
import type {
	TRackLocation,
	TRackLocationId,
	TWarehouse,
	TWarehouseId,
} from "./warehouse.types";

type TWarehouseRow = typeof warehouses.$inferSelect;
type TRackLocationRow = typeof rackLocations.$inferSelect;

const mapWarehouse = (row: TWarehouseRow): TWarehouse => ({
	id: row.id as TWarehouseId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId,
	name: row.name,
	code: row.code ?? null,
	address: row.address ?? null,
	isActive: row.isActive,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapRackLocation = (row: TRackLocationRow): TRackLocation => ({
	id: row.id as TRackLocationId,
	tenantId: row.businessId as TTenantId,
	warehouseId: row.warehouseId as TWarehouseId,
	name: row.name,
	rack: row.rack ?? null,
	shelf: row.shelf ?? null,
	bin: row.bin ?? null,
	isActive: row.isActive,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const nowISO = (): string => new Date().toISOString();

export const WarehouseRepositoryDrizzle = Layer.effect(
	IWarehouseRepository,
	Effect.map(IDrizzleClient, (db) =>
		IWarehouseRepository.of({
			findWarehouseById: (id: TWarehouseId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const [row] = await db
							.select()
							.from(warehouses)
							.where(
								and(eq(warehouses.id, id), eq(warehouses.businessId, tenantId)),
							)
							.limit(1);
						return row ? mapWarehouse(row) : null;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findWarehousesByBranch: (branchId: string, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(warehouses)
							.where(
								and(
									eq(warehouses.branchId, branchId),
									eq(warehouses.businessId, tenantId),
								),
							)
							.orderBy(sql`${warehouses.createdAt} ASC`);
						return rows.map(mapWarehouse);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findAllWarehouses: (tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(warehouses)
							.where(eq(warehouses.businessId, tenantId))
							.orderBy(sql`${warehouses.createdAt} ASC`);
						return rows.map(mapWarehouse);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			saveWarehouse: (warehouse: TWarehouse) =>
				Effect.tryPromise({
					try: async () => {
						await db.insert(warehouses).values({
							id: warehouse.id,
							businessId: warehouse.tenantId,
							branchId: warehouse.branchId,
							name: warehouse.name,
							code: warehouse.code,
							address: warehouse.address,
							isActive: warehouse.isActive,
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			updateWarehouse: (warehouse: TWarehouse) =>
				Effect.tryPromise({
					try: async () => {
						const result = await db
							.update(warehouses)
							.set({
								branchId: warehouse.branchId,
								name: warehouse.name,
								code: warehouse.code,
								address: warehouse.address,
								isActive: warehouse.isActive,
								updatedAt: nowISO(),
							})
							.where(
								and(
									eq(warehouses.id, warehouse.id),
									eq(warehouses.businessId, warehouse.tenantId),
								),
							);
						if (result.rowCount === 0) {
							throw new WarehouseNotFoundError({ id: warehouse.id });
						}
					},
					catch: (e) =>
						e instanceof WarehouseNotFoundError
							? e
							: new DatabaseError({ cause: e }),
				}),

			deleteWarehouse: (id: TWarehouseId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.delete(warehouses)
							.where(
								and(eq(warehouses.id, id), eq(warehouses.businessId, tenantId)),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Rack Locations ──────────────────────────────────────────────
			findRackLocationById: (id: TRackLocationId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const [row] = await db
							.select()
							.from(rackLocations)
							.where(
								and(
									eq(rackLocations.id, id),
									eq(rackLocations.businessId, tenantId),
								),
							)
							.limit(1);
						return row ? mapRackLocation(row) : null;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findRackLocationsByWarehouse: (
				warehouseId: TWarehouseId,
				tenantId: TTenantId,
			) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(rackLocations)
							.where(
								and(
									eq(rackLocations.warehouseId, warehouseId),
									eq(rackLocations.businessId, tenantId),
								),
							)
							.orderBy(sql`${rackLocations.createdAt} ASC`);
						return rows.map(mapRackLocation);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			saveRackLocation: (rackLocation: TRackLocation) =>
				Effect.tryPromise({
					try: async () => {
						await db.insert(rackLocations).values({
							id: rackLocation.id,
							businessId: rackLocation.tenantId,
							warehouseId: rackLocation.warehouseId,
							name: rackLocation.name,
							rack: rackLocation.rack,
							shelf: rackLocation.shelf,
							bin: rackLocation.bin,
							isActive: rackLocation.isActive,
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			updateRackLocation: (rackLocation: TRackLocation) =>
				Effect.tryPromise({
					try: async () => {
						const result = await db
							.update(rackLocations)
							.set({
								name: rackLocation.name,
								rack: rackLocation.rack,
								shelf: rackLocation.shelf,
								bin: rackLocation.bin,
								isActive: rackLocation.isActive,
								updatedAt: nowISO(),
							})
							.where(
								and(
									eq(rackLocations.id, rackLocation.id),
									eq(rackLocations.businessId, rackLocation.tenantId),
								),
							);
						if (result.rowCount === 0) {
							throw new RackLocationNotFoundError({ id: rackLocation.id });
						}
					},
					catch: (e) =>
						e instanceof RackLocationNotFoundError
							? e
							: new DatabaseError({ cause: e }),
				}),

			deleteRackLocation: (id: TRackLocationId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.delete(rackLocations)
							.where(
								and(
									eq(rackLocations.id, id),
									eq(rackLocations.businessId, tenantId),
								),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
		}),
	),
);
