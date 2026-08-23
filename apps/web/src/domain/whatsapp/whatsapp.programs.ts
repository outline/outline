import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import {
	IWhatsAppProvider,
	TWhatsAppError,
} from "@/shared/ports/whatsapp.port";
import type { TTenantId } from "@/shared/types/common.types";
import { WhatsAppModule } from "./whatsapp.module";
import { IWhatsAppRepository } from "./whatsapp.repository";
import type {
	SendWhatsAppMessageCommand,
	SendWhatsAppTemplateCommand,
	WhatsAppConfigCommand,
} from "./whatsapp.schemas";
import type {
	TWhatsAppConfig,
	TWhatsAppReminder,
	TWhatsAppStats,
	TWhatsAppTemplate,
	TWhatsAppTemplateId,
} from "./whatsapp.types";

export const getWhatsAppConfigProgram = (
	tenantId: TTenantId,
): Effect.Effect<TWhatsAppConfig, DatabaseError, IWhatsAppRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		const config = yield* repo.getConfig(tenantId);
		return config || WhatsAppModule.defaultConfig(tenantId);
	});

export const updateWhatsAppConfigProgram = (
	command: WhatsAppConfigCommand,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError, IWhatsAppRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		const existing = yield* repo.getConfig(tenantId);
		const config = WhatsAppModule.mergeConfig(existing, command);
		const fullConfig: TWhatsAppConfig = { ...config, tenantId };
		yield* repo.updateConfig(fullConfig);
	});

export const getWhatsAppTemplatesProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TWhatsAppTemplate[],
	DatabaseError,
	IWhatsAppRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		return yield* repo.getTemplates(tenantId);
	});

export const getWhatsAppStatsProgram = (
	tenantId: TTenantId,
): Effect.Effect<TWhatsAppStats, DatabaseError, IWhatsAppRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		return yield* repo.getStats(tenantId);
	});

export const deleteWhatsAppTemplateProgram = (
	tenantId: TTenantId,
	templateId: TWhatsAppTemplateId,
): Effect.Effect<void, DatabaseError, IWhatsAppRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		return yield* repo.deleteTemplate(tenantId, templateId);
	});

export const sendWhatsAppMessageProgram = (
	tenantId: TTenantId,
	command: SendWhatsAppMessageCommand,
): Effect.Effect<
	{ messageId: string; status: string },
	TWhatsAppError,
	IWhatsAppProvider
> =>
	Effect.gen(function* () {
		const provider = yield* IWhatsAppProvider;
		const result = yield* provider.sendMessage({
			to: command.to,
			message: command.message,
		});
		void tenantId;
		return result;
	});

export const sendWhatsAppTemplateProgram = (
	tenantId: TTenantId,
	command: SendWhatsAppTemplateCommand,
): Effect.Effect<
	{ messageId: string; status: string },
	TWhatsAppError,
	IWhatsAppProvider
> =>
	Effect.gen(function* () {
		const provider = yield* IWhatsAppProvider;
		void tenantId;
		const result = yield* provider.sendTemplate(
			command.to,
			command.templateName,
			command.variables || {},
		);
		return result;
	});

export const scheduleReminderProgram = (
	tenantId: TTenantId,
	recipientPhone: string,
	recipientName: string,
	message: string,
	scheduledAt: Date,
	relatedType: TWhatsAppReminder["relatedType"],
	relatedId?: string,
): Effect.Effect<TWhatsAppReminder, DatabaseError, IWhatsAppRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		const reminder = WhatsAppModule.createReminder({
			tenantId,
			recipientPhone,
			recipientName,
			message,
			scheduledAt,
			relatedType,
			relatedId: relatedId ?? null,
		});
		yield* repo.saveReminder(reminder);
		return reminder;
	});

export const getPendingRemindersProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TWhatsAppReminder[],
	DatabaseError,
	IWhatsAppRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		return yield* repo.getPendingReminders(tenantId);
	});

export const sendReminderProgram = (
	tenantId: TTenantId,
	reminderId: string,
): Effect.Effect<
	void,
	DatabaseError | TWhatsAppError,
	IWhatsAppRepository | IWhatsAppProvider
> =>
	Effect.gen(function* () {
		const repo = yield* IWhatsAppRepository;
		const provider = yield* IWhatsAppProvider;

		const reminder = yield* repo.getReminder(tenantId, reminderId);
		if (!reminder) {
			return yield* Effect.fail(
				new TWhatsAppError({ message: "Reminder not found" }),
			);
		}

		yield* provider.sendMessage({
			to: reminder.recipientPhone,
			message: reminder.message,
		});

		yield* repo.updateReminderStatus(tenantId, reminderId, "sent");
	});
