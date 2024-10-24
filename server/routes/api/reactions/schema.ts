import { z } from "zod";
import { BaseSchema } from "../schema";

export const ReactionsListSchema = BaseSchema.extend({
  body: z.object({
    /** CommentId to list the reactions for. */
    commentId: z.string().uuid(),
  }),
});

export type ReactionsListReq = z.infer<typeof ReactionsListSchema>;
