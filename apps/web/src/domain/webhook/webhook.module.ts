import { generateId } from "@/shared/utils";
import type {
	TWebhookEndpoint,
	TWebhookEndpointId,
	TWebhookEndpointProps,
} from "./webhook.types";

const generateSecret = (): string => {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};

export const WebhookModule = {
	create: (props: TWebhookEndpointProps): TWebhookEndpoint => ({
		...props,
		id: generateId() as TWebhookEndpointId,
		createdAt: new Date(),
		lastTriggeredAt: null,
		lastTriggerStatus: null,
		revokedAt: null,
	}),

	generateSecret,
};
