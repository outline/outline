import { isEmpty } from "lodash";
import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import BaseSchema from "../BaseSchema";

export const StarsCreateSchema = BaseSchema.extend({
  body: z
    .object({
      documentId: z
        .string()
        .optional()
        .refine(
          (val) => (val ? isUUID(val) || SLUG_URL_REGEX.test(val) : true),
          {
            message: "must be uuid or url slug",
          }
        ),
      collectionId: z.string().uuid().optional(),
      index: z
        .string()
        .regex(new RegExp("^[\x20-\x7E]+$"), {
          message: "must be between x20 to x7E ASCII",
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
    index: z.string().regex(new RegExp("^[\x20-\x7E]+$"), {
      message: "must be between x20 to x7E ASCII",
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
