import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	AuditLogFilterSchema,
	getAuditLogsProgram,
	logAuditEventProgram,
} from "@/domain/audit";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getAuditLogs = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(AuditLogFilterSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId)
			return { logs: [], total: 0, page: data.page, pageSize: data.pageSize };

		const result = await runApp(
			getAuditLogsProgram(businessId as TTenantId, data),
		);

		return {
			...result,
			page: data.page,
			pageSize: data.pageSize,
		};
	});

export async function logAuditEvent(
	tenantId: TTenantId,
	userId: TUserId,
	action: string,
	entityType: string,
	entityId?: string,
	oldValue?: Record<string, unknown>,
	newValue?: Record<string, unknown>,
) {
	const program = logAuditEventProgram(
		tenantId,
		userId,
		action,
		entityType,
		entityId || null,
		oldValue || null,
		newValue || null,
		null, // IP address approximate
		null, // User agent
	);

	try {
		await runApp(program);
	} catch (e) {
		console.error("Failed to log audit event:", e);
	}
}
