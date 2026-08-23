import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	deleteWhatsAppTemplateProgram,
	getPendingRemindersProgram,
	getWhatsAppConfigProgram,
	getWhatsAppStatsProgram,
	getWhatsAppTemplatesProgram,
	scheduleReminderProgram,
	sendReminderProgram,
	sendWhatsAppMessageProgram,
	sendWhatsAppTemplateProgram,
	updateWhatsAppConfigProgram,
} from "@/domain/whatsapp";
import {
	ScheduleReminderSchema,
	SendReminderSchema,
	SendWhatsAppMessageSchema,
	SendWhatsAppTemplateSchema,
	WhatsAppConfigSchema,
} from "@/domain/whatsapp/whatsapp.schemas";
import type { TWhatsAppTemplateId } from "@/domain/whatsapp/whatsapp.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getWhatsAppStats = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return { total: 0, thisMonth: 0, scheduled: 0, failed: 0 };
		return await runApp(getWhatsAppStatsProgram(businessId as TTenantId));
	});

export const getWhatsAppConfig = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;

		return await runApp(getWhatsAppConfigProgram(businessId as TTenantId));
	});

export const updateWhatsAppConfig = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(WhatsAppConfigSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "whatsapp:write"));
		await runApp(updateWhatsAppConfigProgram(data, tenantId));
		return { success: true };
	});

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(SendWhatsAppMessageSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "whatsapp:write"));
		return await runApp(sendWhatsAppMessageProgram(tenantId, data));
	});

export const sendWhatsAppTemplate = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(SendWhatsAppTemplateSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "whatsapp:write"));
		return await runApp(sendWhatsAppTemplateProgram(tenantId, data));
	});

export const getTemplates = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getWhatsAppTemplatesProgram(businessId as TTenantId));
	});

export const deleteTemplate = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "whatsapp:write"));
		await runApp(
			deleteWhatsAppTemplateProgram(tenantId, id as TWhatsAppTemplateId),
		);
		return { success: true };
	});

export const scheduleReminder = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ScheduleReminderSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "whatsapp:write"));

		return await runApp(
			scheduleReminderProgram(
				tenantId,
				data.recipientPhone,
				data.recipientName,
				data.message,
				data.scheduledAt,
				data.relatedType,
				data.relatedId,
			),
		);
	});

export const getPendingReminders = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		return await runApp(getPendingRemindersProgram(businessId as TTenantId));
	});

export const sendReminder = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(SendReminderSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "whatsapp:write"));

		await runApp(sendReminderProgram(tenantId, data.reminderId));
		return { success: true };
	});

export const whatsappApi = {
	getWhatsAppStats,
	getWhatsAppConfig,
	updateWhatsAppConfig,
	sendWhatsAppMessage,
	sendWhatsAppTemplate,
	getTemplates,
	deleteTemplate,
	scheduleReminder,
	getPendingReminders,
	sendReminder,
};
