import { z } from "zod";
import { ValidateDocumentId } from "@server/validation";
import { BaseSchema } from "../schema";

export const SubscriptionsListSchema = BaseSchema.extend({
  body: z.object({
    documentId: z.string().refine(ValidateDocumentId.isValid, {
      message: ValidateDocumentId.message,
    }),
    event: z.literal("documents.update"),
  }),
});

export type SubscriptionsListReq = z.infer<typeof SubscriptionsListSchema>;

export const SubscriptionsInfoSchema = BaseSchema.extend({
  body: z.object({
    documentId: z.string().refine(ValidateDocumentId.isValid, {
      message: ValidateDocumentId.message,
    }),
    event: z.literal("documents.update"),
  }),
});

export type SubscriptionsInfoReq = z.infer<typeof SubscriptionsInfoSchema>;

export const SubscriptionsCreateSchema = BaseSchema.extend({
  body: z.object({
    documentId: z.string().refine(ValidateDocumentId.isValid, {
      message: ValidateDocumentId.message,
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
