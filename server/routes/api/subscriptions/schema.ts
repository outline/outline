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

export const SubscriptionsInfoSchema = BaseSchema.extend({
  body: z.object({
    documentId: z
      .string()
      .refine((val) => isUUID(val) || SLUG_URL_REGEX.test(val), {
        message: "must be uuid or url slug",
      }),
    event: z.literal("documents.update"),
  }),
});

export type SubscriptionsInfoReq = z.infer<typeof SubscriptionsInfoSchema>;

export const SubscriptionsCreateSchema = BaseSchema.extend({
  body: z.object({
    documentId: z
      .string()
      .refine((val) => isUUID(val) || SLUG_URL_REGEX.test(val), {
        message: "must be uuid or url slug",
      }),
    event: z.literal("documents.update"),
  }),
});

export type SubscriptionsCreateReq = z.infer<typeof SubscriptionsCreateSchema>;

export const SubscriptionsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type SubscriptionsDeleteReq = z.infer<typeof SubscriptionsDeleteSchema>;
