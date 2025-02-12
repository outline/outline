import { z } from "zod";
import { SubscriptionType } from "@shared/types";
import { ValidateDocumentId } from "@server/validation";
import { BaseSchema } from "../schema";

const SubscriptionBody = z.discriminatedUnion("event", [
  z.object({
    event: z.literal(SubscriptionType.Collection),
    collectionId: z.string().uuid(),
  }),
  z.object({
    event: z.literal(SubscriptionType.Document),
    documentId: z.string().refine(ValidateDocumentId.isValid, {
      message: ValidateDocumentId.message,
    }),
  }),
]);

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
