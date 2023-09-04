import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { ValidateKey } from "@server/validation";

export const FilesCreateSchema = z.object({
  body: z.object({
    key: z
      .string()
      .refine(ValidateKey.isValid, { message: ValidateKey.message }),
  }),
});

export type FilesCreateReq = z.infer<typeof FilesCreateSchema>;

export const FilesGetSchema = z.object({
  query: z
    .object({
      key: z
        .string()
        .refine(ValidateKey.isValid, { message: ValidateKey.message })
        .optional(),
      sig: z.string().optional(),
    })
    .refine((obj) => !(isEmpty(obj.key) && isEmpty(obj.sig)), {
      message: "One of key or sig is required",
    }),
});

export type FilesGetReq = z.infer<typeof FilesGetSchema>;
