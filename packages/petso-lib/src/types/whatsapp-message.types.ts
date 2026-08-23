export interface TWhatsAppMessageDto {
	readonly id: string;
	readonly templateId: string;
	readonly templateName: string;
	readonly sentAt: string;
	readonly to: string;
	readonly status: "sent" | "pending" | "failed";
}
