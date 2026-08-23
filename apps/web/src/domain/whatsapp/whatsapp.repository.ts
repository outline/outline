import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TWhatsAppConfig,
	TWhatsAppReminder,
	TWhatsAppStats,
	TWhatsAppTemplate,
	TWhatsAppTemplateId,
} from "./whatsapp.types";

export class IWhatsAppRepository extends Context.Tag("IWhatsAppRepository")<
	IWhatsAppRepository,
	{
		readonly getConfig: (
			tenantId: TTenantId,
		) => Effect.Effect<TWhatsAppConfig | null, DatabaseError>;
		readonly getTemplates: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TWhatsAppTemplate[], DatabaseError>;
		readonly updateConfig: (
			config: TWhatsAppConfig,
		) => Effect.Effect<void, DatabaseError>;
		readonly saveReminder: (
			reminder: TWhatsAppReminder,
		) => Effect.Effect<void, DatabaseError>;
		readonly getPendingReminders: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TWhatsAppReminder[], DatabaseError>;
		readonly getReminder: (
			tenantId: TTenantId,
			reminderId: string,
		) => Effect.Effect<TWhatsAppReminder | null, DatabaseError>;
		readonly updateReminderStatus: (
			tenantId: TTenantId,
			reminderId: string,
			status: TWhatsAppReminder["status"],
		) => Effect.Effect<void, DatabaseError>;

		readonly getStats: (
			tenantId: TTenantId,
		) => Effect.Effect<TWhatsAppStats, DatabaseError>;

		readonly deleteTemplate: (
			tenantId: TTenantId,
			templateId: TWhatsAppTemplateId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
