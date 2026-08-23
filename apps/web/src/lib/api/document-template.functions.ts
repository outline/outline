import { createServerFn } from "@tanstack/react-start";
import {
	getTemplateByTypeProgram,
	upsertTemplateProgram,
} from "@/domain/document-template/document-template.programs";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getTemplateByType = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((type: string) => type)
	.handler(async ({ data: type, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;
		return await runApp(
			getTemplateByTypeProgram(businessId as TTenantId, type),
		);
	});

export const upsertTemplate = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(
		(data: unknown) => data as Parameters<typeof upsertTemplateProgram>[1],
	)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "document:write"));
		return await runApp(upsertTemplateProgram(tenantId, data));
	});
