import { z } from "zod";
import { UserMembershipSection } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";
import { ValidateIndex } from "@server/validation";

export const UserMembershipsListSchema = BaseSchema.extend({
  body: z.object({
    /** Restricts the list to memberships in a sidebar section */
    section: z.enum(UserMembershipSection).optional(),
  }),
});

export type UserMembershipsListReq = z.infer<typeof UserMembershipsListSchema>;

export const UserMembershipsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
    index: z.string().regex(ValidateIndex.regex, {
      message: ValidateIndex.message,
    }),
  }),
});

export type UserMembershipsUpdateReq = z.infer<
  typeof UserMembershipsUpdateSchema
>;
