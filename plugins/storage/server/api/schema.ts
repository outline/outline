import formidable from "formidable";
import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { ValidateKey } from "@server/validation";

export const FilesCreateSchema = z.object({
  body: z.object({
    key: z
      .string()
      .refine(ValidateKey.isValid, { message: ValidateKey.message })
      .transform(ValidateKey.sanitize),
  }),
  file: z.custom<formidable.File>(),
});

export type FilesCreateReq = z.infer<typeof FilesCreateSchema>;

export const FilesGetSchema = z.object({
  query: z
    .object({
      key: z
        .string()
        .refine(ValidateKey.isValid, { message: ValidateKey.message })
        .optional()
        .transform((val) => (val ? ValidateKey.sanitize(val) : undefined)),
      sig: z.string().optional(),
      download: z.string().optional(),
    })
    .refine((obj) => !(isEmpty(obj.key) && isEmpty(obj.sig)), {
      message: "One of key or sig is required",
    }),
});

export type FilesGetReq = z.infer<typeof FilesGetSchema>;
