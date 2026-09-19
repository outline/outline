import { z } from "zod";
import { BaseSchema } from "../schema";

export const CreateTestUsersSchema = BaseSchema.extend({
  body: z.object({
    count: z.coerce.number().prefault(10),
  }),
});

export type CreateTestUsersReq = z.infer<typeof CreateTestUsersSchema>;

export const CreateTestNotificationsSchema = BaseSchema.extend({
  body: z.object({
    count: z.coerce.number().prefault(10),
  }),
});

export type CreateTestNotificationsReq = z.infer<
  typeof CreateTestNotificationsSchema
>;
