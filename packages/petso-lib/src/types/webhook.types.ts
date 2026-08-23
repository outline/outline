export type TWebhookEndpoint = {
	readonly id: string;
	readonly url: string;
	readonly events: readonly string[];
	readonly isActive: boolean;
	readonly createdAt: string;
};

export type TWebhookEventPayload = Record<string, unknown>;
