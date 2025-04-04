import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const OAuthClientsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** OAuth client name */
    name: z.string(),

    /** OAuth client description */
    description: z.string().nullish(),

    /** OAuth client developer name */
    developerName: z.string().nullish(),

    /** OAuth client developer url */
    developerUrl: z.string().nullish(),

    /** OAuth client avatar url */
    avatarUrl: z.string().nullish(),

    /** OAuth client redirect uri */
    redirectUris: z
      .array(z.string().url())
      .min(1, { message: "At least one redirect uri is required" })
      .max(10, { message: "A maximum of 10 redirect uris are allowed" })
      .refine((uris) => uris.every((uri) => uri.length <= 255), {
        message: "Redirect uri must be less than 255 characters",
      }),

    /** OAuth client published */
    published: z.boolean().default(false),
  }),
});

export type OAuthClientsCreateReq = z.infer<typeof OAuthClientsCreateSchema>;

export const OAuthClientsInfoSchema = BaseSchema.extend({
  body: z
    .object({
      /** OAuth client id */
      id: z.string().uuid().optional(),

      /** OAuth clientId */
      clientId: z.string().optional(),
    })
    .refine((data) => data.id || data.clientId, {
      message: "Either id or clientId is required",
    }),
});

export type OAuthClientsInfoReq = z.infer<typeof OAuthClientsInfoSchema>;
