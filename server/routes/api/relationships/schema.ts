import { z } from "zod";
import { ValidateDocumentId } from "@server/validation";
import { RelationshipType } from "@server/models/Relationship";
import { BaseSchema } from "../schema";

export const RelationshipsListSchema = BaseSchema.extend({
  body: z.object({
    type: z.nativeEnum(RelationshipType).optional(),
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
  }).optional(),
});

export type RelationshipsListReq = z.infer<typeof RelationshipsListSchema>;

