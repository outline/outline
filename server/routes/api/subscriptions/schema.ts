import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { SubscriptionType } from "@shared/types";
import { ValidateDocumentId } from "@server/validation";
import { BaseSchema } from "../schema";

const SubscriptionBody = z
  .object({
    event: z.literal(SubscriptionType.Document),
    collectionId: z.string().uuid().optional(),
    documentId: z
      .string()
      .refine(ValidateDocumentId.isValid, {
        message: ValidateDocumentId.message,
      })
      .optional(),
  })
  .refine((obj) => !(isEmpty(obj.collectionId) && isEmpty(obj.documentId)), {
    message: "one of collectionId or documentId is required",
  });

export const SubscriptionsListSchema = BaseSchema.extend({
  body: SubscriptionBody,
});

export type SubscriptionsListReq = z.infer<typeof SubscriptionsListSchema>;

export const SubscriptionsInfoSchema = BaseSchema.extend({
  body: SubscriptionBody,
});

export type SubscriptionsInfoReq = z.infer<typeof SubscriptionsInfoSchema>;

export const SubscriptionsCreateSchema = BaseSchema.extend({
  body: SubscriptionBody,
});

export type SubscriptionsCreateReq = z.infer<typeof SubscriptionsCreateSchema>;

export const SubscriptionsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type SubscriptionsDeleteReq = z.infer<typeof SubscriptionsDeleteSchema>;

export const SubscriptionsDeleteTokenSchema = BaseSchema.extend({
  query: z.object({
    userId: z.string().uuid(),
    documentId: z.string().uuid(),
    token: z.string(),
  }),
});

export type SubscriptionsDeleteTokenReq = z.infer<
  typeof SubscriptionsDeleteTokenSchema
>;
