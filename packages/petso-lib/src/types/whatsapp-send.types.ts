export interface TSendWhatsAppInput {
	readonly customerId: string;
	readonly templateId: string;
}

export interface TSendWhatsAppResult {
	readonly sent: boolean;
	readonly messageId?: string;
	readonly status?: string;
}
