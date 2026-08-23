import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	addCommissionRuleProgram,
	addKasbonProgram,
	CreateCommissionRuleSchema,
	CreateKasbonSchema,
	getCommissionRecordsByStaffProgram,
	getCommissionRuleByStaffProgram,
	getKasbonByStaffProgram,
	PayKasbonSchema,
	payCommissionsProgram,
	payKasbonProgram,
	UpdateCommissionRuleSchema,
	updateCommissionRuleProgram,
} from "@/domain/commission";
import { getBusinessIdForUser } from "@/domain/identity";
import type { TStaffId } from "@/domain/staff/staff.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getCommissionRule = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((staffId: string) => staffId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;
		return await runApp(
			getCommissionRuleByStaffProgram(
				businessId as TTenantId,
				data as TStaffId,
			),
		);
	});

export const addCommissionRule = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(CreateCommissionRuleSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "commission:write"));
		return await runApp(addCommissionRuleProgram(tenantId, data));
	});

export const updateCommissionRule = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(UpdateCommissionRuleSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "commission:write"));
		return await runApp(updateCommissionRuleProgram(tenantId, data));
	});

export const getCommissionRecords = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((staffId: string) => staffId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(
			getCommissionRecordsByStaffProgram(
				businessId as TTenantId,
				data as TStaffId,
			),
		);
	});

export const payCommissions = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((staffId: string) => staffId)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "commission:write"));
		return await runApp(payCommissionsProgram(tenantId, data as TStaffId));
	});

export const getKasbon = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((staffId: string) => staffId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(
			getKasbonByStaffProgram(businessId as TTenantId, data as TStaffId),
		);
	});

export const addKasbon = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(CreateKasbonSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "commission:write"));
		return await runApp(addKasbonProgram(tenantId, data));
	});

export const payKasbon = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => Schema.decodeUnknownSync(PayKasbonSchema)(data))
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "commission:write"));
		return await runApp(payKasbonProgram(tenantId, data));
	});
