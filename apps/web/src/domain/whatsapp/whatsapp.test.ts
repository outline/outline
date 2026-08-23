import { describe, expect, it } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { WhatsAppModule } from "./whatsapp.module";
import type {
	TWhatsAppConfig,
	TWhatsAppConfigId,
	TWhatsAppTemplate,
	TWhatsAppTemplateId,
} from "./whatsapp.types";

describe("WhatsAppModule", () => {
	const tenantId = generateId<TTenantId>();

	describe("mergeConfig", () => {
		it("should create new config with defaults when existing is null", () => {
			const result = WhatsAppModule.mergeConfig(null, {
				autoBookingConfirm: false,
			});

			expect(result.id).toBeDefined();
			expect(result.isConnected).toBe(false);
			expect(result.autoReminder).toBe(true);
			expect(result.reminderHoursBefore).toBe(24);
			expect(result.autoBookingConfirm).toBe(false);
		});

		it("should preserve existing values when no overrides given", () => {
			const existing: TWhatsAppConfig = {
				id: generateId<TWhatsAppConfigId>(),
				tenantId,
				isConnected: true,
				autoReminder: false,
				reminderHoursBefore: 12,
				autoPaymentConfirm: false,
				autoLoyaltyNotify: false,
				autoBookingConfirm: false,
			};

			const result = WhatsAppModule.mergeConfig(existing, {});

			expect(result.autoReminder).toBe(false);
			expect(result.reminderHoursBefore).toBe(12);
			expect(result.autoBookingConfirm).toBe(false);
			expect(result.id).toBe(existing.id);
		});

		it("should override specific fields while keeping others", () => {
			const existing: TWhatsAppConfig = {
				id: generateId<TWhatsAppConfigId>(),
				tenantId,
				isConnected: true,
				autoReminder: false,
				reminderHoursBefore: 12,
				autoPaymentConfirm: true,
				autoLoyaltyNotify: false,
				autoBookingConfirm: true,
			};

			const result = WhatsAppModule.mergeConfig(existing, {
				autoReminder: true,
				reminderHoursBefore: 48,
			});

			expect(result.autoReminder).toBe(true);
			expect(result.reminderHoursBefore).toBe(48);
			expect(result.autoPaymentConfirm).toBe(true);
			expect(result.autoLoyaltyNotify).toBe(false);
			expect(result.autoBookingConfirm).toBe(true);
			expect(result.id).toBe(existing.id);
		});
	});

	describe("defaultConfig", () => {
		it("should create config with all default values", () => {
			const result = WhatsAppModule.defaultConfig(tenantId);

			expect(result.tenantId).toBe(tenantId);
			expect(result.isConnected).toBe(false);
			expect(result.autoReminder).toBe(true);
			expect(result.reminderHoursBefore).toBe(24);
			expect(result.autoPaymentConfirm).toBe(true);
			expect(result.autoLoyaltyNotify).toBe(true);
			expect(result.autoBookingConfirm).toBe(true);
			expect(result.id).toBeDefined();
		});
	});

	describe("createReminder", () => {
		it("should create a pending reminder with correct fields", () => {
			const now = new Date("2026-06-20T10:00:00Z");
			const result = WhatsAppModule.createReminder({
				tenantId,
				recipientPhone: "08123456789",
				recipientName: "John Doe",
				message: "Your pet appointment is tomorrow",
				scheduledAt: now,
				relatedType: "booking",
			});

			expect(result.tenantId).toBe(tenantId);
			expect(result.recipientPhone).toBe("08123456789");
			expect(result.recipientName).toBe("John Doe");
			expect(result.message).toBe("Your pet appointment is tomorrow");
			expect(result.scheduledAt).toBe(now);
			expect(result.status).toBe("pending");
			expect(result.relatedType).toBe("booking");
			expect(result.relatedId).toBeNull();
			expect(result.sentAt).toBeNull();
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.id).toBeDefined();
		});

		it("should set relatedId when provided", () => {
			const result = WhatsAppModule.createReminder({
				tenantId,
				recipientPhone: "08123456789",
				recipientName: "Jane Doe",
				message: "Payment reminder",
				scheduledAt: new Date(),
				relatedType: "payment",
				relatedId: "booking-123",
			});

			expect(result.relatedId).toBe("booking-123");
			expect(result.relatedType).toBe("payment");
		});
	});

	describe("renderTemplate", () => {
		const template: TWhatsAppTemplate = {
			id: generateId<TWhatsAppTemplateId>(),
			tenantId,
			name: "booking_confirmation",
			category: "booking",
			content:
				"Hello {{name}}, your booking for {{service}} on {{date}} is confirmed!",
			variables: ["name", "service", "date"],
			isActive: true,
		};

		it("should replace all variables in template content", () => {
			const result = WhatsAppModule.renderTemplate(template, {
				name: "John",
				service: "Grooming",
				date: "2026-06-25",
			});

			expect(result).toBe(
				"Hello John, your booking for Grooming on 2026-06-25 is confirmed!",
			);
		});

		it("should leave unreplaced variables as-is", () => {
			const result = WhatsAppModule.renderTemplate(template, {
				name: "John",
			});

			expect(result).toContain("Hello John");
			expect(result).toContain("{{service}}");
			expect(result).toContain("{{date}}");
		});

		it("should replace same variable used multiple times", () => {
			const repeatTemplate: TWhatsAppTemplate = {
				...template,
				content: "{{name}} {{name}} {{name}}",
			};

			const result = WhatsAppModule.renderTemplate(repeatTemplate, {
				name: "echo",
			});

			expect(result).toBe("echo echo echo");
		});
	});

	describe("reconstitute", () => {
		it("should return a copy of the input", () => {
			const input = { a: 1, b: { c: 2 } };
			const result = WhatsAppModule.reconstitute(input);

			expect(result).toEqual(input);
			expect(result).not.toBe(input);
		});
	});
});
