import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import BaseSchema from "../BaseSchema";

export const PinsCreateSchema = BaseSchema.extend({
  body: z.object({
    documentId: z
      .string({
        required_error: "required",
      })
      .refine((val) => isUUID(val) || SLUG_URL_REGEX.test(val), {
        message: "must be uuid or url slug",
      }),
    collectionId: z.string().uuid().nullish(),
    index: z
      .string()
      .regex(new RegExp("^[\x20-\x7E]+$"), {
        message: "must be between x20 to x7E ASCII",
      })
      .optional(),
  }),
});

export type PinsCreateReq = z.infer<typeof PinsCreateSchema>;

export const PinsListSchema = BaseSchema.extend({
  body: z.object({
    collectionId: z.string().uuid().nullish(),
  }),
});

export type PinsListReq = z.infer<typeof PinsCreateSchema>;

export const PinsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    index: z.string().regex(new RegExp("^[\x20-\x7E]+$"), {
      message: "must be between x20 to x7E ASCII",
    }),
  }),
});

export type PinsUpdateReq = z.infer<typeof PinsUpdateSchema>;

export const PinsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type PinsDeleteReq = z.infer<typeof PinsDeleteSchema>;
