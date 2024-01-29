import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { ValidateDocumentId, ValidateIndex } from "@server/validation";
import { BaseSchema } from "../schema";

export const StarsCreateSchema = BaseSchema.extend({
  body: z
    .object({
      documentId: z
        .string()
        .refine(ValidateDocumentId.isValid, {
          message: ValidateDocumentId.message,
        })
        .optional(),
      collectionId: z.string().uuid().optional(),
      index: z
        .string()
        .regex(ValidateIndex.regex, {
          message: ValidateIndex.message,
        })
        .optional(),
    })
    .refine(
      (body) => !(isEmpty(body.documentId) && isEmpty(body.collectionId)),
      {
        message: "One of documentId or collectionId is required",
      }
    ),
});

export type StarsCreateReq = z.infer<typeof StarsCreateSchema>;

export const StarsListSchema = BaseSchema;

export type StarsListReq = z.infer<typeof StarsListSchema>;

export const StarsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    index: z.string().regex(ValidateIndex.regex, {
      message: ValidateIndex.message,
    }),
  }),
});

export type StarsUpdateReq = z.infer<typeof StarsUpdateSchema>;

export const StarsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type StarsDeleteReq = z.infer<typeof StarsDeleteSchema>;
