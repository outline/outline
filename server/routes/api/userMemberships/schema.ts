import { z } from "zod";
import { ValidateIndex, ValidateMembershipId } from "@server/validation";
import BaseSchema from "../BaseSchema";

export const UserMembershipsListSchema = BaseSchema;

export type UserMembershipsListReq = z.infer<typeof UserMembershipsListSchema>;

export const UserMembershipsUpdateSchema = BaseSchema.extend({
  body: z
    .object({
      id: z.string().regex(ValidateMembershipId.regex),
      index: z.string().regex(ValidateIndex.regex, {
        message: ValidateIndex.message,
      }),
    })
    .transform((val) => {
      const match = val.id.match(ValidateMembershipId.regex)!;
      return { ...val, userId: match[1], documentId: match[2] };
    }),
});

export type UserMembershipsUpdateReq = z.infer<
  typeof UserMembershipsUpdateSchema
>;
