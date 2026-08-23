export interface TWhatsAppTemplateDto {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly body: string;
	readonly status: "approved" | "pending";
}
