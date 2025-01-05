import { z } from "zod";
import { BaseSchema } from "../schema";

export const SuggestionsListSchema = BaseSchema.extend({
  body: z.object({
    query: z.string(),
  }),
});

export type SuggestionsListReq = z.infer<typeof SuggestionsListSchema>;
