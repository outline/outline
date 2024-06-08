import isEmpty from "lodash/isEmpty";
import z from "zod";
import { FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { BaseSchema } from "../schema";

const CollectionsSortParamsSchema = z.object({
  /** The attribute to sort by */
  sort: z
    .string()
    .refine((val) => Object.keys(FileOperation.getAttributes()).includes(val), {
      message: "Invalid sort parameter",
    })
    .default("createdAt"),

  /** The direction of the sorting */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

export const FileOperationsInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the file operation to be retrieved */
    id: z.string().uuid(),
  }),
});

export type FileOperationsInfoReq = z.infer<typeof FileOperationsInfoSchema>;

export const FileOperationsListSchema = BaseSchema.extend({
  body: CollectionsSortParamsSchema.extend({
    /** File Operation Type */
    type: z.nativeEnum(FileOperationType),
  }),
});

export type FileOperationsListReq = z.infer<typeof FileOperationsListSchema>;

export const FileOperationsRedirectSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the file operation to access */
    id: z.string().uuid().optional(),
  }),
  query: z.object({
    /** Id of the file operation to access */
    id: z.string().uuid().optional(),
  }),
}).refine((req) => !(isEmpty(req.body.id) && isEmpty(req.query.id)), {
  message: "id is required",
});

export type FileOperationsRedirectReq = z.infer<
  typeof FileOperationsRedirectSchema
>;

export const FileOperationsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the file operation to delete */
    id: z.string().uuid(),
  }),
});

export type FileOperationsDeleteReq = z.infer<
  typeof FileOperationsDeleteSchema
>;
