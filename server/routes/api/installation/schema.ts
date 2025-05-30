import { z } from "zod";
import { TeamValidation, UserValidation } from "@shared/validations";
import { BaseSchema } from "@server/routes/api/schema";

export const InstallationCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Team name */
    teamName: z.string().min(1).max(TeamValidation.maxNameLength),
    /** User name */
    userName: z.string().min(1).max(UserValidation.maxNameLength),
    /** User email */
    userEmail: z.string().email().max(UserValidation.maxEmailLength),
  }),
});

export type InstallationCreateSchemaReq = z.infer<
  typeof InstallationCreateSchema
>;
