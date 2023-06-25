import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import BaseSchema from "../BaseSchema";

export const SubscriptionsListSchema = BaseSchema.extend({
  body: z.object({
    documentId: z
      .string()
      .refine((val) => isUUID(val) || SLUG_URL_REGEX.test(val), {
        message: "must be uuid or url slug",
      }),
    event: z.literal("documents.update"),
  }),
});

export type SubscriptionsListReq = z.infer<typeof SubscriptionsListSchema>;
