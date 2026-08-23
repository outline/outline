import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	addSupplierProgram,
	deleteSupplierProgram,
	getSupplierByIdProgram,
	getSuppliersProgram,
	updateSupplierProgram,
} from "@/domain/supplier/supplier.programs";
import {
	CreateSupplierSchema,
	UpdateSupplierSchema,
} from "@/domain/supplier/supplier.schemas";
import type { TSupplierId } from "@/domain/supplier/supplier.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getSuppliers = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		return await runApp(getSuppliersProgram(businessId as TTenantId));
	});

export const getSupplierById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Unauthorized");

		return await runApp(
			getSupplierByIdProgram(data as TSupplierId, businessId as TTenantId),
		);
	});

export const createSupplier = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateSupplierSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "supplier:write"));

		return await runApp(addSupplierProgram(data, tenantId));
	});

export const updateSupplier = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateSupplierSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "supplier:write"));

		return await runApp(updateSupplierProgram(data, tenantId));
	});

export const deleteSupplier = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "supplier:write"));

		return await runApp(deleteSupplierProgram(data as TSupplierId, tenantId));
	});
