import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const OAuthAuthenticationsListSchema = BaseSchema.extend({
  body: z.object({}),
});

export type OAuthAuthenticationsListReq = z.infer<
  typeof OAuthAuthenticationsListSchema
>;

export const OAuthAuthenticationsDeleteSchema = BaseSchema.extend({
  body: z.object({
    oauthClientId: z.string(),
    scope: z.array(z.string()).optional(),
  }),
});

export type OAuthAuthenticationsDeleteReq = z.infer<
  typeof OAuthAuthenticationsDeleteSchema
>;
