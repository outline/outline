import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const AuthenticationProvidersInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.uuid(),
  }),
});

export type AuthenticationProvidersInfoReq = z.infer<
  typeof AuthenticationProvidersInfoSchema
>;

/** Schema for group sync settings on an authentication provider. */
const AuthenticationProviderSettingsSchema = z.object({
  /** Whether group sync from this provider is enabled. */
  groupSyncEnabled: z.boolean().optional(),
  /** The claim path in the provider response that contains group data. */
  groupClaim: z.string().max(255).optional(),
  /** Additional scopes to request when group sync is enabled. */
  groupSyncScopes: z.array(z.string().max(255)).max(20).optional(),
});

const url = z.url({ protocol: /^https?$/ }).max(2048);

/** Schema for the configuration of a provider that is set up by an admin. */
const AuthenticationProviderConfigInputSchema = z.object({
  /** The name shown on the sign-in button. */
  displayName: z.string().trim().min(1).max(50),
  /** The issuer used to discover endpoints. */
  issuerUrl: url.optional(),
  /** The authorization endpoint, required without an issuer. */
  authorizationUrl: url.optional(),
  /** The token endpoint, required without an issuer. */
  tokenUrl: url.optional(),
  /** The userinfo endpoint, required without an issuer. */
  userInfoUrl: url.optional(),
  /** The end session endpoint. */
  logoutUrl: url.optional(),
  /** The OAuth client identifier. */
  clientId: z.string().trim().min(1).max(255),
  /** The OAuth client secret, omit to keep the existing secret. */
  clientSecret: z.string().trim().min(1).max(1024).optional(),
  /** A space separated list of scopes to request. */
  scopes: z.string().trim().max(1024).optional(),
  /** The claim to use as the user's display name. */
  usernameClaim: z.string().trim().max(255).optional(),
});

export type AuthenticationProviderConfigInput = z.infer<
  typeof AuthenticationProviderConfigInputSchema
>;

export const AuthenticationProvidersCreateSchema = BaseSchema.extend({
  body: z.object({
    /** The type of authentication provider, eg "oidc-custom" */
    name: z.string().max(255),

    /** Configuration for the provider */
    config: AuthenticationProviderConfigInputSchema,
  }),
});

export type AuthenticationProvidersCreateReq = z.infer<
  typeof AuthenticationProvidersCreateSchema
>;

export const AuthenticationProvidersUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.uuid(),

    /** Whether the Authentication Provider is enabled or not */
    isEnabled: z.boolean().optional(),

    /** Provider-specific settings such as group sync configuration */
    settings: AuthenticationProviderSettingsSchema.optional(),

    /** Configuration for providers that are set up by an admin */
    config: AuthenticationProviderConfigInputSchema.optional(),
  }),
});

export type AuthenticationProvidersUpdateReq = z.infer<
  typeof AuthenticationProvidersUpdateSchema
>;

export const AuthenticationProvidersStartGroupSyncSchema = BaseSchema.extend({
  body: z.object({ id: z.uuid() }),
});

export type AuthenticationProvidersStartGroupSyncReq = z.infer<
  typeof AuthenticationProvidersStartGroupSyncSchema
>;

export const AuthenticationProvidersDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.uuid(),
  }),
});

export type AuthenticationProvidersDeleteReq = z.infer<
  typeof AuthenticationProvidersDeleteSchema
>;
