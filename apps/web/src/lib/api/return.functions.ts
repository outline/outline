import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	getReturnsProgram,
	processReturnProgram,
} from "@/domain/return/return.programs";
import { CreateReturnSchema } from "@/domain/return/return.schemas";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getReturns = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getReturnsProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const createReturn = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateReturnSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "return:write"));

		const program = processReturnProgram(data, tenantId, userId as TUserId);
		return await runApp(program);
	});
