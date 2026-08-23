import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { IWhatsAppProvider } from "@/shared/ports";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
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
} from "./whatsapp.programs";
import { IWhatsAppRepository } from "./whatsapp.repository";
import type {
	TWhatsAppConfig,
	TWhatsAppConfigId,
	TWhatsAppReminder,
	TWhatsAppReminderId,
	TWhatsAppStats,
	TWhatsAppTemplate,
	TWhatsAppTemplateId,
} from "./whatsapp.types";

const tenantId = generateId<TTenantId>();

const mockConfig: TWhatsAppConfig = {
	id: generateId<TWhatsAppConfigId>(),
	tenantId,
	isConnected: true,
	autoReminder: true,
	reminderHoursBefore: 24,
	autoPaymentConfirm: true,
	autoLoyaltyNotify: true,
	autoBookingConfirm: true,
};

const mockTemplate: TWhatsAppTemplate = {
	id: generateId<TWhatsAppTemplateId>(),
	tenantId,
	name: "booking_confirmation",
	category: "booking",
	content: "Hello {{name}}",
	variables: ["name"],
	isActive: true,
};

const mockStats: TWhatsAppStats = {
	total: 100,
	thisMonth: 25,
	scheduled: 10,
	failed: 2,
};

const mockReminder: TWhatsAppReminder = {
	id: generateId<TWhatsAppReminderId>(),
	tenantId,
	recipientPhone: "08123456789",
	recipientName: "John Doe",
	message: "Reminder message",
	scheduledAt: new Date("2026-06-25T10:00:00Z"),
	status: "pending",
	relatedType: "booking",
	relatedId: null,
	sentAt: null,
	createdAt: new Date("2026-06-20T10:00:00Z"),
};

describe("getWhatsAppConfigProgram", () => {
	it("should return config from repo when it exists", async () => {
		const program = getWhatsAppConfigProgram(tenantId);
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn().mockReturnValue(Effect.succeed(mockConfig)),
					getTemplates: vi.fn(),
					updateConfig: vi.fn(),
					saveReminder: vi.fn(),
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(result).toEqual(mockConfig);
	});

	it("should return default config when config does not exist", async () => {
		const program = getWhatsAppConfigProgram(tenantId);
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn().mockReturnValue(Effect.succeed(null)),
					getTemplates: vi.fn(),
					updateConfig: vi.fn(),
					saveReminder: vi.fn(),
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(result.isConnected).toBe(false);
		expect(result.tenantId).toBe(tenantId);
	});

	it("should propagate DatabaseError", async () => {
		const program = getWhatsAppConfigProgram(tenantId);
		await expect(
			Effect.runPromise(
				Effect.provide(
					program,
					Layer.succeed(IWhatsAppRepository, {
						getConfig: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						getTemplates: vi.fn(),
						updateConfig: vi.fn(),
						saveReminder: vi.fn(),
						getPendingReminders: vi.fn(),
						getReminder: vi.fn(),
						updateReminderStatus: vi.fn(),
						getStats: vi.fn(),
						deleteTemplate: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("updateWhatsAppConfigProgram", () => {
	it("should update config via repo", async () => {
		const updateConfig = vi.fn().mockReturnValue(Effect.void);
		const program = updateWhatsAppConfigProgram(
			{ autoReminder: true, reminderHoursBefore: 24 },
			tenantId,
		);
		await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn().mockReturnValue(Effect.succeed(null)),
					getTemplates: vi.fn(),
					updateConfig,
					saveReminder: vi.fn(),
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(updateConfig).toHaveBeenCalled();
	});

	it("should propagate DatabaseError", async () => {
		const getConfig = vi
			.fn()
			.mockReturnValue(Effect.succeed(null) as Effect.Effect<null, never>);
		const updateConfig = vi.fn().mockReturnValue(
			Effect.fail({
				_tag: "DatabaseError",
				cause: new Error("db fail"),
			}),
		);
		const program = updateWhatsAppConfigProgram(
			{ autoReminder: true, reminderHoursBefore: 24 },
			tenantId,
		);
		await expect(
			Effect.runPromise(
				Effect.provide(
					program,
					Layer.succeed(IWhatsAppRepository, {
						getConfig,
						getTemplates: vi.fn(),
						updateConfig,
						saveReminder: vi.fn(),
						getPendingReminders: vi.fn(),
						getReminder: vi.fn(),
						updateReminderStatus: vi.fn(),
						getStats: vi.fn(),
						deleteTemplate: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getWhatsAppTemplatesProgram", () => {
	it("should return templates from repo", async () => {
		const templates = [mockTemplate];
		const getTemplates = vi.fn().mockReturnValue(Effect.succeed(templates));
		const program = getWhatsAppTemplatesProgram(tenantId);
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn(),
					getTemplates,
					updateConfig: vi.fn(),
					saveReminder: vi.fn(),
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(result).toEqual(templates);
	});
});

describe("getWhatsAppStatsProgram", () => {
	it("should return stats from repo", async () => {
		const getStats = vi.fn().mockReturnValue(Effect.succeed(mockStats));
		const program = getWhatsAppStatsProgram(tenantId);
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn(),
					getTemplates: vi.fn(),
					updateConfig: vi.fn(),
					saveReminder: vi.fn(),
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats,
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(result).toEqual(mockStats);
	});
});

describe("deleteWhatsAppTemplateProgram", () => {
	it("should delete template via repo", async () => {
		const deleteTemplate = vi.fn().mockReturnValue(Effect.void);
		const program = deleteWhatsAppTemplateProgram(tenantId, mockTemplate.id);
		await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn(),
					getTemplates: vi.fn(),
					updateConfig: vi.fn(),
					saveReminder: vi.fn(),
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate,
				}),
			),
		);
		expect(deleteTemplate).toHaveBeenCalledWith(tenantId, mockTemplate.id);
	});
});

describe("sendWhatsAppMessageProgram", () => {
	it("should send message via provider", async () => {
		const sendMessage = vi
			.fn()
			.mockReturnValue(Effect.succeed({ success: true }));
		const program = sendWhatsAppMessageProgram(tenantId, {
			to: "08123456789",
			message: "Hello!",
		});
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppProvider, {
					sendMessage,
					sendTemplate: vi.fn(),
				}),
			),
		);
		expect(result).toEqual({ success: true });
	});
});

describe("sendWhatsAppTemplateProgram", () => {
	it("should send template via provider", async () => {
		const sendTemplate = vi
			.fn()
			.mockReturnValue(Effect.succeed({ success: true }));
		const program = sendWhatsAppTemplateProgram(tenantId, {
			to: "08123456789",
			templateName: "booking_confirmation",
			variables: { name: "John" },
		});
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppProvider, {
					sendMessage: vi.fn(),
					sendTemplate,
				}),
			),
		);
		expect(result).toEqual({ success: true });
	});
});

describe("scheduleReminderProgram", () => {
	it("should save reminder via repo", async () => {
		const saveReminder = vi.fn().mockReturnValue(Effect.void);
		const program = scheduleReminderProgram(
			tenantId,
			mockReminder.recipientPhone,
			mockReminder.recipientName,
			mockReminder.message,
			mockReminder.scheduledAt,
			mockReminder.relatedType,
		);
		await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn(),
					getTemplates: vi.fn(),
					updateConfig: vi.fn(),
					saveReminder,
					getPendingReminders: vi.fn(),
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(saveReminder).toHaveBeenCalled();
	});
});

describe("getPendingRemindersProgram", () => {
	it("should return pending reminders from repo", async () => {
		const reminders = [mockReminder];
		const getPendingReminders = vi
			.fn()
			.mockReturnValue(Effect.succeed(reminders));
		const program = getPendingRemindersProgram(tenantId);
		const result = await Effect.runPromise(
			Effect.provide(
				program,
				Layer.succeed(IWhatsAppRepository, {
					getConfig: vi.fn(),
					getTemplates: vi.fn(),
					updateConfig: vi.fn(),
					saveReminder: vi.fn(),
					getPendingReminders,
					getReminder: vi.fn(),
					updateReminderStatus: vi.fn(),
					getStats: vi.fn(),
					deleteTemplate: vi.fn(),
				}),
			),
		);
		expect(result).toEqual(reminders);
	});
});

describe("sendReminderProgram", () => {
	const tenantIdForReminder =
		"tenant-rem-1" as import("@/shared/types/common.types").TTenantId;
	const reminderId =
		"rem-1" as import("@/domain/whatsapp/whatsapp.types").TWhatsAppReminderId;
	const mockReminder: import("@/domain/whatsapp/whatsapp.types").TWhatsAppReminder =
		{
			id: reminderId,
			tenantId: tenantIdForReminder,
			recipientPhone: "+628123456789",
			recipientName: "Alice",
			message: "Reminder",
			scheduledAt: new Date(),
			relatedType: "booking",
			relatedId: null,
			status: "pending",
			sentAt: null,
			createdAt: new Date(),
		};

	it("should send reminder and update status scoped to tenantId", async () => {
		const sendMessage = vi
			.fn()
			.mockReturnValue(Effect.succeed({ messageId: "m-1", status: "sent" }));
		const updateReminderStatus = vi.fn().mockReturnValue(Effect.void);
		const getReminder = vi.fn().mockReturnValue(Effect.succeed(mockReminder));
		const program = sendReminderProgram(tenantIdForReminder, reminderId);
		await Effect.runPromise(
			Effect.provide(
				program,
				Layer.mergeAll(
					Layer.succeed(IWhatsAppRepository, {
						getConfig: vi.fn(),
						getTemplates: vi.fn(),
						updateConfig: vi.fn(),
						saveReminder: vi.fn(),
						getPendingReminders: vi.fn(),
						getReminder,
						updateReminderStatus,
						getStats: vi.fn(),
						deleteTemplate: vi.fn(),
					}),
					Layer.succeed(IWhatsAppProvider, {
						sendMessage,
						sendTemplate: vi.fn(),
					}),
				),
			),
		);
		expect(getReminder).toHaveBeenCalledWith(tenantIdForReminder, reminderId);
		expect(sendMessage).toHaveBeenCalled();
		expect(updateReminderStatus).toHaveBeenCalledWith(
			tenantIdForReminder,
			reminderId,
			"sent",
		);
	});

	it("fails when reminder not found in tenant", async () => {
		const getReminder = vi.fn().mockReturnValue(Effect.succeed(null));
		const program = sendReminderProgram(tenantIdForReminder, reminderId);
		await expect(
			Effect.runPromise(
				Effect.provide(
					program,
					Layer.mergeAll(
						Layer.succeed(IWhatsAppRepository, {
							getConfig: vi.fn(),
							getTemplates: vi.fn(),
							updateConfig: vi.fn(),
							saveReminder: vi.fn(),
							getPendingReminders: vi.fn(),
							getReminder,
							updateReminderStatus: vi.fn(),
							getStats: vi.fn(),
							deleteTemplate: vi.fn(),
						}),
						Layer.succeed(IWhatsAppProvider, {
							sendMessage: vi.fn(),
							sendTemplate: vi.fn(),
						}),
					),
				),
			),
		).rejects.toThrow("Reminder not found");
	});
});
