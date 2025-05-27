import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const InstallationCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Team name */
    teamName: z.string().min(1).max(100),
    /** User name */
    userName: z.string().min(1).max(100),
    /** User email */
    userEmail: z.string().email(),
  }),
});

export type InstallationCreateSchemaReq = z.infer<
  typeof InstallationCreateSchema
>;
