import { z } from "zod";
import { BaseSchema } from "../schema";

export const ReactionsListSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the comment to list reactions for. */
    commentId: z.string().uuid(),
  }),
});

export type ReactionsListReq = z.infer<typeof ReactionsListSchema>;
