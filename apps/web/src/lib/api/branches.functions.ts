import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	createBranchHolidayProgram,
	createBranchProgram,
	deleteBranchHolidayProgram,
	deleteBranchProgram,
	getBranchesProgram,
	getBranchHolidaysProgram,
	toggleBranchStatusProgram,
	updateBranchProgram,
} from "@/domain/branch/branch.programs";
import {
	CreateBranchHolidaySchema,
	CreateBranchSchema,
	DeleteBranchHolidaySchema,
	ToggleBranchStatusSchema,
	UpdateBranchSchema,
} from "@/domain/branch/branch.schemas";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getBranches = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getBranchesProgram(businessId as TTenantId));
	});

export const toggleBranchStatus = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ToggleBranchStatusSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "branch:write"));
		await runApp(toggleBranchStatusProgram(data, tenantId));
		return { success: true };
	});

export const createBranch = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateBranchSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "branch:write"));
		return await runApp(createBranchProgram(data, tenantId, userId));
	});

export const updateBranch = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateBranchSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "branch:write"));
		await runApp(updateBranchProgram(data, tenantId));
		return { success: true };
	});

export const deleteBranch = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "branch:write"));
		await runApp(deleteBranchProgram(id, tenantId));
		return { success: true };
	});

export const getBranchHolidays = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: branchId, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(
			getBranchHolidaysProgram(branchId, businessId as TTenantId),
		);
	});

export const createBranchHoliday = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateBranchHolidaySchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "branch:write"));
		return await runApp(createBranchHolidayProgram(data, tenantId));
	});

export const deleteBranchHoliday = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(DeleteBranchHolidaySchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "branch:write"));
		await runApp(deleteBranchHolidayProgram(data, tenantId));
		return { success: true };
	});

export const branchesApi = {
	getBranches,
	toggleBranchStatus,
	createBranch,
	updateBranch,
	deleteBranch,
	getBranchHolidays,
	createBranchHoliday,
	deleteBranchHoliday,
};
