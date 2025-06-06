import { z } from "zod";
import { ValidateDocumentId } from "@server/validation";
import { RelationshipType } from "@server/models/Relationship";
import { BaseSchema } from "../schema";

export const RelationshipsCreateSchema = BaseSchema.extend({
  body: z.object({
    type: z.nativeEnum(RelationshipType),
    documentId: z
      .string()
      .refine(ValidateDocumentId.isValid, {
        message: ValidateDocumentId.message,
      }),
    reverseDocumentId: z
      .string()
      .refine(ValidateDocumentId.isValid, {
        message: ValidateDocumentId.message,
      }),
  }),
});

export type RelationshipsCreateReq = z.infer<typeof RelationshipsCreateSchema>;

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

export const RelationshipsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type RelationshipsDeleteReq = z.infer<typeof RelationshipsDeleteSchema>;

