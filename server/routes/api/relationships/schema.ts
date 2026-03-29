import { z } from "zod";
import { RelationshipType } from "@server/models/Relationship";
import { ValidateDocumentId } from "@server/validation";
import { BaseSchema } from "../schema";

export const RelationshipsInfoSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});

export type RelationshipsInfoReq = z.infer<typeof RelationshipsInfoSchema>;

export const RelationshipsListSchema = BaseSchema.extend({
  body: z
    .object({
      type: z.enum(RelationshipType).optional(),
      documentId: z
        .string()
        .refine(ValidateDocumentId.isValid, {
          message: ValidateDocumentId.message,
        })
        .optional(),
      reverseDocumentId: z
        .string()
        .refine(ValidateDocumentId.isValid, {
          message: ValidateDocumentId.message,
        })
        .optional(),
    })
    .optional(),
});

export type RelationshipsListReq = z.infer<typeof RelationshipsListSchema>;
