import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const GroupMembershipsListSchema = BaseSchema;

export type GroupMembershipsListReq = z.infer<
  typeof GroupMembershipsListSchema
>;
