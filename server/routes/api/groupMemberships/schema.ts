import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const GroupMembershipsListSchema = BaseSchema.extend({
  body: z.object({
    groupId: z.string().uuid().optional(),
  }),
});

export type GroupMembershipsListReq = z.infer<
  typeof GroupMembershipsListSchema
>;
