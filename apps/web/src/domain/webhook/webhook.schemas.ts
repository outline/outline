import { Schema } from "effect";
import { WEBHOOK_EVENTS } from "./webhook.types";

export const CreateWebhookEndpointSchema = Schema.Struct({
	url: Schema.String.pipe(
		Schema.minLength(8),
		Schema.maxLength(2048),
		Schema.pattern(/^https?:\/\//),
	),
	events: Schema.optional(
		Schema.Array(Schema.Union(...WEBHOOK_EVENTS.map((e) => Schema.Literal(e)))),
	),
	description: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
});

export type CreateWebhookEndpointCommand = Schema.Schema.Type<
	typeof CreateWebhookEndpointSchema
>;
