import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";
import { ValidateIndex } from "@server/validation";

export const UserMembershipsListSchema = BaseSchema;

export type UserMembershipsListReq = z.infer<typeof UserMembershipsListSchema>;

export const UserMembershipsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    index: z.string().regex(ValidateIndex.regex, {
      message: ValidateIndex.message,
    }),
  }),
});

export type UserMembershipsUpdateReq = z.infer<
  typeof UserMembershipsUpdateSchema
>;
