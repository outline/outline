import { isEmpty } from "lodash";
import { z } from "zod";
import {
  INDEX_REGEX,
  INVALID_DOCUMENT_ID,
  INVALID_INDEX,
  isValidDocumentId,
} from "@server/validation";
import BaseSchema from "../BaseSchema";

export const StarsCreateSchema = BaseSchema.extend({
  body: z
    .object({
      documentId: z
        .string()
        .refine(isValidDocumentId, {
          message: INVALID_DOCUMENT_ID,
        })
        .optional(),
      collectionId: z.string().uuid().optional(),
      index: z
        .string()
        .regex(INDEX_REGEX, {
          message: INVALID_INDEX,
        })
        .optional(),
    })
    .refine(
      (body) => !(isEmpty(body.documentId) && isEmpty(body.collectionId)),
      {
        message: "one of documentId or collectionId is required",
      }
    ),
});

export type StarsCreateReq = z.infer<typeof StarsCreateSchema>;

export const StarsListSchema = BaseSchema;

export type StarsListReq = z.infer<typeof StarsListSchema>;

export const StarsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    index: z.string().regex(INDEX_REGEX, {
      message: INVALID_INDEX,
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
