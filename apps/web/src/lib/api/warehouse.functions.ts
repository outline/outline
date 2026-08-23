import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	createRackLocationProgram,
	createWarehouseProgram,
	deleteRackLocationProgram,
	deleteWarehouseProgram,
	getRackLocationsProgram,
	getWarehousesByBranchProgram,
	getWarehousesProgram,
	updateRackLocationProgram,
	updateWarehouseProgram,
} from "@/domain/warehouse/warehouse.programs";
import {
	CreateRackLocationSchema,
	CreateWarehouseSchema,
} from "@/domain/warehouse/warehouse.schemas";
import type {
	TRackLocationId,
	TWarehouseId,
} from "@/domain/warehouse/warehouse.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { runApp } from "@/infra/runtime/app.runtime";

const UpdateWarehouseSchemaWithId = Schema.Struct({
	id: Schema.String,
	data: CreateWarehouseSchema,
});

const UpdateRackLocationSchemaWithId = Schema.Struct({
	id: Schema.String,
	data: CreateRackLocationSchema,
});

export const getWarehouses = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		try {
			return await runApp(getWarehousesProgram(tenantId));
		} catch (error) {
			console.error("[getWarehouses] Error:", error);
			throw error;
		}
	});

export const getWarehousesByBranch = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: branchId, context }) => {
		const { tenantId } = context;
		try {
			return await runApp(getWarehousesByBranchProgram(branchId, tenantId));
		} catch (error) {
			console.error("[getWarehousesByBranch] Error:", error);
			throw error;
		}
	});

export const createWarehouse = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateWarehouseSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		try {
			return await runApp(createWarehouseProgram(data, tenantId));
		} catch (error) {
			console.error("[createWarehouse] Error:", error);
			throw error;
		}
	});

export const updateWarehouse = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateWarehouseSchemaWithId))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		try {
			return await runApp(
				updateWarehouseProgram(data.id as TWarehouseId, data.data, tenantId),
			);
		} catch (error) {
			console.error("[updateWarehouse] Error:", error);
			throw error;
		}
	});

export const deleteWarehouse = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		try {
			await runApp(deleteWarehouseProgram(id as TWarehouseId, tenantId));
			return { success: true };
		} catch (error) {
			console.error("[deleteWarehouse] Error:", error);
			throw error;
		}
	});

// ─── Rack Locations Server Functions ──────────────────────────────────

export const getRackLocations = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: warehouseId, context }) => {
		const { tenantId } = context;
		try {
			return await runApp(
				getRackLocationsProgram(warehouseId as TWarehouseId, tenantId),
			);
		} catch (error) {
			console.error("[getRackLocations] Error:", error);
			throw error;
		}
	});

export const createRackLocation = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateRackLocationSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		try {
			return await runApp(createRackLocationProgram(data, tenantId));
		} catch (error) {
			console.error("[createRackLocation] Error:", error);
			throw error;
		}
	});

export const updateRackLocation = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateRackLocationSchemaWithId))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		try {
			return await runApp(
				updateRackLocationProgram(
					data.id as TRackLocationId,
					data.data,
					tenantId,
				),
			);
		} catch (error) {
			console.error("[updateRackLocation] Error:", error);
			throw error;
		}
	});

export const deleteRackLocation = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		try {
			await runApp(deleteRackLocationProgram(id as TRackLocationId, tenantId));
			return { success: true };
		} catch (error) {
			console.error("[deleteRackLocation] Error:", error);
			throw error;
		}
	});
