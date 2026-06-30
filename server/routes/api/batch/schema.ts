import { z } from "zod";
import { BaseSchema } from "../schema";

/** The maximum number of sub-requests permitted in a single batch. */
export const BatchMaxRequests = 25;

export const BatchSchema = BaseSchema.extend({
  body: z.object({
    requests: z
      .array(
        z.object({
          /** The RPC method to invoke, e.g. "documents.update". */
          method: z.string(),
          /** The request body passed to the method. */
          body: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .min(1)
      .max(BatchMaxRequests, {
        message: `A batch may contain at most ${BatchMaxRequests} requests`,
      }),
  }),
});

export type BatchReq = z.infer<typeof BatchSchema>;
