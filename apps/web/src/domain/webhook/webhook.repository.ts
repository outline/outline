import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { TWebhookEndpoint, TWebhookEndpointId } from "./webhook.types";

export class IWebhookRepository extends Context.Tag("IWebhookRepository")<
	IWebhookRepository,
	{
		readonly findActiveByBusinessAndEvent: (
			tenantId: TTenantId,
			event: string,
		) => Effect.Effect<readonly TWebhookEndpoint[], DatabaseError>;
		readonly findAllByBusiness: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TWebhookEndpoint[], DatabaseError>;
		readonly findById: (
			id: TWebhookEndpointId,
			tenantId: TTenantId,
		) => Effect.Effect<TWebhookEndpoint | null, DatabaseError>;
		readonly save: (
			endpoint: TWebhookEndpoint,
		) => Effect.Effect<void, DatabaseError>;
		readonly revoke: (
			id: TWebhookEndpointId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly recordDelivery: (
			id: TWebhookEndpointId,
			status: number,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
