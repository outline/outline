import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const ExternalGroupsListSchema = BaseSchema.extend({
  body: z.object({
    /** Filter by authentication provider id */
    authenticationProviderId: z.uuid().optional(),
  }),
});

export type ExternalGroupsListReq = z.infer<typeof ExternalGroupsListSchema>;
