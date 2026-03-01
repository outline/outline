import z from "zod";
import { OAuthClientValidation } from "@shared/validations";
import { BaseSchema } from "../api/schema";

export const TokenSchema = BaseSchema.extend({
  body: z.object({
    grant_type: z.string(),
    code: z.string().optional(),
    redirect_uri: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    refresh_token: z.string().optional(),
    scope: z.string().optional(),
  }),
});

export type TokenReq = z.infer<typeof TokenSchema>;

export const TokenRevokeSchema = BaseSchema.extend({
  body: z.object({
    token: z.string(),
    token_type_hint: z.string().optional(),
  }),
});

export type TokenRevokeReq = z.infer<typeof TokenRevokeSchema>;

export const RegisterSchema = BaseSchema.extend({
  body: z.object({
    client_name: z.string().min(1).max(OAuthClientValidation.maxNameLength),
    redirect_uris: z
      .array(z.url().max(OAuthClientValidation.maxRedirectUriLength))
      .min(1)
      .max(10),
    grant_types: z
      .array(z.enum(["authorization_code", "refresh_token"]))
      .default(["authorization_code"]),
    response_types: z.array(z.enum(["code"])).default(["code"]),
    token_endpoint_auth_method: z
      .enum(["none", "client_secret_post"])
      .default("none"),
    scope: z.string().optional(),
    client_uri: z
      .string()
      .url()
      .max(OAuthClientValidation.maxDeveloperUrlLength)
      .optional(),
    logo_uri: z
      .string()
      .url()
      .max(OAuthClientValidation.maxAvatarUrlLength)
      .optional(),
    contacts: z.array(z.string().email()).optional(),
  }),
});

export type RegisterReq = z.infer<typeof RegisterSchema>;

export const RegisterUpdateSchema = BaseSchema.extend({
  body: z.object({
    client_name: z.string().min(1).max(OAuthClientValidation.maxNameLength),
    redirect_uris: z
      .array(z.url().max(OAuthClientValidation.maxRedirectUriLength))
      .min(1)
      .max(10),
    client_uri: z
      .string()
      .url()
      .max(OAuthClientValidation.maxDeveloperUrlLength)
      .optional(),
    logo_uri: z
      .string()
      .url()
      .max(OAuthClientValidation.maxAvatarUrlLength)
      .optional(),
  }),
});

export type RegisterUpdateReq = z.infer<typeof RegisterUpdateSchema>;
