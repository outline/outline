import { z } from "zod";
import { NotionImportInputItemSchema } from "@shared/schema";
import {
  ImportableIntegrationService,
  IntegrationService,
} from "@shared/types";
import { BaseSchema } from "../schema";

const BaseIdSchema = z.object({
  /** Id of the import */
  id: z.uuid(),
});

const ImportsSortParamsSchema = z.object({
  /** Specifies the attributes by which imports will be sorted in the list. */
  sort: z
    .string()
    .refine((val) => ["createdAt", "updatedAt", "service"].includes(val), {
      error: "Invalid sort parameter",
    })
    .prefault("createdAt"),

  /** Specifies the sort order with respect to sort field. */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

const BaseBodySchema = z.object({
  integrationId: z.uuid(),
});

export const ImportsCreateSchema = BaseSchema.extend({
  body: z.discriminatedUnion("service", [
    BaseBodySchema.extend({
      service: z.literal(IntegrationService.Notion),
      input: z.array(NotionImportInputItemSchema),
    }),
  ]),
});

export type ImportsCreateReq = z.infer<typeof ImportsCreateSchema>;

export const ImportsListSchema = BaseSchema.extend({
  body: ImportsSortParamsSchema.extend({
    service: z.enum(ImportableIntegrationService).optional(),
  }),
});

export type ImportsListReq = z.infer<typeof ImportsListSchema>;

export const ImportsInfoSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type ImportsInfoReq = z.infer<typeof ImportsInfoSchema>;

export const ImportsDeleteSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type ImportsDeleteReq = z.infer<typeof ImportsDeleteSchema>;

export const ImportsCancelSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type ImportsCancelReq = z.infer<typeof ImportsCancelSchema>;
