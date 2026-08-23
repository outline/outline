import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	addBatchProgram,
	CreateBatchSchema,
	DeductStockSchema,
	deductStockProgram,
	getBatchesProgram,
	getExpiringBatchesProgram,
	getMovementsProgram,
} from "@/domain/inventory";
import type { TProductVariantId } from "@/domain/product/product.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getBatches = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((variantId: string) => variantId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getBatchesProgram(
			businessId as TTenantId,
			data as TProductVariantId,
		);
		return await runApp(program);
	});

export const getExpiringBatches = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((days: number) => days)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getExpiringBatchesProgram(businessId as TTenantId, data);
		return await runApp(program);
	});

export const getMovements = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((variantId: string) => variantId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getMovementsProgram(
			businessId as TTenantId,
			data as TProductVariantId,
		);
		return await runApp(program);
	});

export const addBatch = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(CreateBatchSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "inventory:write"));

		const program = addBatchProgram(tenantId, data);
		return await runApp(program);
	});

export const deductStock = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(DeductStockSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "inventory:write"));

		const program = deductStockProgram(tenantId, data);
		return await runApp(program);
	});
