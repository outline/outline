import { z } from "zod";

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
