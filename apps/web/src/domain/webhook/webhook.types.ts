import type { TId, TTenantId } from "@/shared/types/common.types";

export type TWebhookEndpointId = TId & {
	readonly _brand: "WebhookEndpointId";
};

export const WEBHOOK_EVENTS = [
	"order.created",
	"order.updated",
	"order.voided",
] as const;
export type TWebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type TWebhookEndpoint = {
	readonly id: TWebhookEndpointId;
	readonly tenantId: TTenantId;
	readonly url: string;
	readonly secret: string;
	readonly events: readonly TWebhookEvent[];
	readonly isActive: boolean;
	readonly description: string | null;
	readonly lastTriggeredAt: Date | null;
	readonly lastTriggerStatus: number | null;
	readonly createdAt: Date;
	readonly revokedAt: Date | null;
};

export type TWebhookEndpointProps = Omit<
	TWebhookEndpoint,
	"id" | "createdAt" | "lastTriggeredAt" | "lastTriggerStatus" | "revokedAt"
>;
