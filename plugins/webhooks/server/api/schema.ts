import { z } from "zod";
import { WebhookSubscription } from "@server/models";
import { BaseSchema } from "@server/routes/api/schema";

export const WebhookSubscriptionsListSchema = BaseSchema.extend({
  body: z.object({
    /** Webhook subscriptions sorting direction */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    /** Webhook subscriptions sorting column */
    sort: z
      .string()
      .refine(
        (val) => Object.keys(WebhookSubscription.getAttributes()).includes(val),
        {
          error: "Invalid sort parameter",
        }
      )
      .prefault("createdAt"),

    /** Search query to filter webhook subscriptions by name */
    query: z.string().optional(),
  }),
});

export type WebhookSubscriptionsListReq = z.infer<
  typeof WebhookSubscriptionsListSchema
>;

export const WebhookSubscriptionsCreateSchema = z.object({
  body: z.object({
    name: z.string(),
    url: z.url(),
    secret: z.string().optional(),
    events: z.array(z.string()),
  }),
});

export type WebhookSubscriptionsCreateReq = z.infer<
  typeof WebhookSubscriptionsCreateSchema
>;

export const WebhookSubscriptionsUpdateSchema = z.object({
  body: z.object({
    id: z.uuid(),
    name: z.string(),
    url: z.url(),
    secret: z.string().optional(),
    events: z.array(z.string()),
  }),
});

export type WebhookSubscriptionsUpdateReq = z.infer<
  typeof WebhookSubscriptionsUpdateSchema
>;

export const WebhookSubscriptionsDeleteSchema = z.object({
  body: z.object({
    id: z.uuid(),
  }),
});

export type WebhookSubscriptionsDeleteReq = z.infer<
  typeof WebhookSubscriptionsDeleteSchema
>;
