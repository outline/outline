import { z } from "zod";
import BaseSchema from "../BaseSchema";

export const UserAuthenticationsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Associated provider id of user authentication to be deleted */
    authenticationProviderId: z.string().uuid(),
  }),
});

export type UserAuthenticationsDeleteReq = z.infer<
  typeof UserAuthenticationsDeleteSchema
>;
