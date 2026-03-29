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

export const AuthenticationProvidersUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.uuid(),

    /** Whether the Authentication Provider is enabled or not */
    isEnabled: z.boolean().optional(),

    /** Provider-specific settings such as group sync configuration */
    settings: AuthenticationProviderSettingsSchema.optional(),
  }),
});

export type AuthenticationProvidersUpdateReq = z.infer<
  typeof AuthenticationProvidersUpdateSchema
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
