import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	RackLocationNotFoundError,
	WarehouseNotFoundError,
} from "./warehouse.errors";
import { IWarehouseRepository } from "./warehouse.repository";
import type {
	CreateRackLocationCommand,
	CreateWarehouseCommand,
} from "./warehouse.schemas";
import type {
	TRackLocation,
	TRackLocationId,
	TWarehouse,
	TWarehouseId,
} from "./warehouse.types";

export const getWarehousesProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TWarehouse[], DatabaseError, IWarehouseRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		return yield* repo.findAllWarehouses(tenantId);
	});

export const getWarehousesByBranchProgram = (
	branchId: string,
	tenantId: TTenantId,
): Effect.Effect<readonly TWarehouse[], DatabaseError, IWarehouseRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		return yield* repo.findWarehousesByBranch(branchId, tenantId);
	});

export const createWarehouseProgram = (
	command: CreateWarehouseCommand,
	tenantId: TTenantId,
): Effect.Effect<TWarehouse, DatabaseError, IWarehouseRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		const id = generateId<TWarehouseId>();
		const warehouse: TWarehouse = {
			id,
			tenantId,
			branchId: command.branchId,
			name: command.name,
			code: command.code ?? null,
			address: command.address ?? null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		yield* repo.saveWarehouse(warehouse);
		return warehouse;
	});

export const updateWarehouseProgram = (
	id: TWarehouseId,
	command: CreateWarehouseCommand,
	tenantId: TTenantId,
): Effect.Effect<
	TWarehouse,
	DatabaseError | WarehouseNotFoundError,
	IWarehouseRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		const existing = yield* repo.findWarehouseById(id, tenantId);
		if (!existing) {
			return yield* Effect.fail(new WarehouseNotFoundError({ id }));
		}
		const updated: TWarehouse = {
			...existing,
			branchId: command.branchId,
			name: command.name,
			code: command.code ?? null,
			address: command.address ?? null,
			updatedAt: new Date(),
		};
		yield* repo.updateWarehouse(updated);
		return updated;
	});

export const deleteWarehouseProgram = (
	id: TWarehouseId,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError, IWarehouseRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		yield* repo.deleteWarehouse(id, tenantId);
	});

// ─── Rack Locations Programs ──────────────────────────────────────────

export const getRackLocationsProgram = (
	warehouseId: TWarehouseId,
	tenantId: TTenantId,
): Effect.Effect<
	readonly TRackLocation[],
	DatabaseError,
	IWarehouseRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		return yield* repo.findRackLocationsByWarehouse(warehouseId, tenantId);
	});

export const createRackLocationProgram = (
	command: CreateRackLocationCommand,
	tenantId: TTenantId,
): Effect.Effect<TRackLocation, DatabaseError, IWarehouseRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		const id = generateId<TRackLocationId>();
		const rackLocation: TRackLocation = {
			id,
			tenantId,
			warehouseId: command.warehouseId as TWarehouseId,
			name: command.name,
			rack: command.rack ?? null,
			shelf: command.shelf ?? null,
			bin: command.bin ?? null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		yield* repo.saveRackLocation(rackLocation);
		return rackLocation;
	});

export const updateRackLocationProgram = (
	id: TRackLocationId,
	command: CreateRackLocationCommand,
	tenantId: TTenantId,
): Effect.Effect<
	TRackLocation,
	DatabaseError | RackLocationNotFoundError,
	IWarehouseRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		const existing = yield* repo.findRackLocationById(id, tenantId);
		if (!existing) {
			return yield* Effect.fail(new RackLocationNotFoundError({ id }));
		}
		const updated: TRackLocation = {
			...existing,
			name: command.name,
			rack: command.rack ?? null,
			shelf: command.shelf ?? null,
			bin: command.bin ?? null,
			updatedAt: new Date(),
		};
		yield* repo.updateRackLocation(updated);
		return updated;
	});

export const deleteRackLocationProgram = (
	id: TRackLocationId,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError, IWarehouseRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWarehouseRepository;
		yield* repo.deleteRackLocation(id, tenantId);
	});
