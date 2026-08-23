import { createServerFn } from "@tanstack/react-start";
import type { TLinkDoctype } from "@/domain/form-builder";
import { getLinkDoctypeOptionsProgram } from "@/domain/form-builder";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getLinkDoctypeOptions = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(
		(data: { doctype: string; search?: string; businessId?: string }) => data,
	)
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const { doctype, search, businessId } = data;

		const resolvedBusinessId =
			businessId ?? (await getBusinessIdForUser(userId as TUserId));

		const program = getLinkDoctypeOptionsProgram(
			resolvedBusinessId as TTenantId,
			doctype as TLinkDoctype,
			search ?? "",
		);
		return await runApp(program);
	});
