import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const AuthenticationProvidersInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.string().uuid(),
  }),
});

export type AuthenticationProvidersInfoReq = z.infer<
  typeof AuthenticationProvidersInfoSchema
>;

export const AuthenticationProvidersUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.string().uuid(),

    /** Whether the Authentication Provider is enabled or not */
    isEnabled: z.boolean(),
  }),
});

export type AuthenticationProvidersUpdateReq = z.infer<
  typeof AuthenticationProvidersUpdateSchema
>;
