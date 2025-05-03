import { z } from "zod";
import { OAuthClientValidation } from "@shared/validations";
import { BaseSchema } from "@server/routes/api/schema";

export const OAuthClientsInfoSchema = BaseSchema.extend({
  body: z
    .object({
      /** OAuth client id */
      id: z.string().uuid().optional(),

      /** OAuth clientId */
      clientId: z.string().optional(),

      redirectUri: z.string().optional(),
    })
    .refine((data) => data.id || data.clientId, {
      message: "Either id or clientId is required",
    }),
});

export type OAuthClientsInfoReq = z.infer<typeof OAuthClientsInfoSchema>;

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
      .refine(
        (uris) =>
          uris.every(
            (uri) => uri.length <= OAuthClientValidation.maxRedirectUriLength
          ),
        {
          message: `Redirect uri must be less than ${OAuthClientValidation.maxRedirectUriLength} characters`,
        }
      ),

    /** OAuth client published */
    published: z.boolean().default(false),
  }),
});

export type OAuthClientsCreateReq = z.infer<typeof OAuthClientsCreateSchema>;

export const OAuthClientsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),

    /** OAuth client name */
    name: z.string().optional(),

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
      .refine(
        (uris) =>
          uris.every(
            (uri) => uri.length <= OAuthClientValidation.maxRedirectUriLength
          ),
        {
          message: `Redirect uri must be less than ${OAuthClientValidation.maxRedirectUriLength} characters`,
        }
      )
      .optional(),

    /** OAuth client published */
    published: z.boolean().optional(),
  }),
});

export type OAuthClientsUpdateReq = z.infer<typeof OAuthClientsUpdateSchema>;

export const OAuthClientsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** OAuth client id */
    id: z.string().uuid(),
  }),
});

export type OAuthClientsDeleteReq = z.infer<typeof OAuthClientsDeleteSchema>;

export const OAuthClientsRotateSecretSchema = BaseSchema.extend({
  body: z.object({
    /** OAuth client id */
    id: z.string().uuid(),
  }),
});

export type OAuthClientsRotateSecretReq = z.infer<
  typeof OAuthClientsRotateSecretSchema
>;

export const OAuthClientsListSchema = BaseSchema.extend({
  body: z.object({}),
});

export type OAuthClientsListReq = z.infer<typeof OAuthClientsListSchema>;
