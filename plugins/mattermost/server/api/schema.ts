import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const MattermostGetUserTeamsSchema = BaseSchema.extend({
  body: z.object({
    url: z.string().url(),
    apiKey: z.string(),
  }),
});

export type MattermostGetUserTeamsReq = z.infer<
  typeof MattermostGetUserTeamsSchema
>;

export const MattermostGetChannelsSchema = BaseSchema.extend({
  body: z.object({
    /** whether to skip cache and force load from Mattermost */
    force: z.boolean().default(false),
  }),
});

export type MattermostGetChannelsReq = z.infer<
  typeof MattermostGetChannelsSchema
>;

export const MattermostCreateWebhookSchema = BaseSchema.extend({
  body: z.object({
    collectionId: z.string(),
    channel: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
});

export type MattermostCreateWebhookReq = z.infer<
  typeof MattermostCreateWebhookSchema
>;
