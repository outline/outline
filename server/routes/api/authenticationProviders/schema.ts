import { z } from "zod";
import BaseSchema from "@server/routes/api/BaseSchema";

export const AuthenticationProvidersInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Authentication Provider Id */
    id: z.string().uuid(),
  }),
});

export type AuthenticationProvidersInfoReq = z.infer<
  typeof AuthenticationProvidersInfoSchema
>;
