import { z } from "zod";
import BaseSchema from "../BaseSchema";

export const CreateTestUsersSchema = BaseSchema.extend({
  body: z.object({
    count: z.coerce.number().default(10),
  }),
});

export type CreateTestUsersReq = z.infer<typeof CreateTestUsersSchema>;
