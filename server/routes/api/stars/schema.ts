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
      parentId: z.string().uuid().optional(),
      isFolder: z.boolean().optional(),
      index: z
        .string()
        .regex(ValidateIndex.regex, {
          message: ValidateIndex.message,
        })
        .optional(),
    })
    .refine(
      (body) => {
        // If isFolder is true, documentId and collectionId must be empty
        if (body.isFolder) {
          return isEmpty(body.documentId) && isEmpty(body.collectionId);
        }
        // If not a folder, one of documentId or collectionId is required
        return !(isEmpty(body.documentId) && isEmpty(body.collectionId));
      },
      {
        message: "One of documentId or collectionId is required",
      }
    )
    .refine(
      (body) => {
        // Additional validation: folders cannot have documentId or collectionId
        if (
          body.isFolder &&
          (!isEmpty(body.documentId) || !isEmpty(body.collectionId))
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Folders cannot have documentId or collectionId",
      }
    ),
});

export type StarsCreateReq = z.infer<typeof StarsCreateSchema>;

export const StarsListSchema = BaseSchema.extend({
  body: z
    .object({
      parentId: z.string().uuid().optional(),
    })
    .optional(),
});

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
