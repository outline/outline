import { z } from "zod";
import { NotionImportInputItemSchema } from "@shared/schema";
import {
  ImportableIntegrationService,
  IntegrationService,
} from "@shared/types";
import { BaseSchema } from "../schema";

const ImportsSortParamsSchema = z.object({
  /** Specifies the attributes by which imports will be sorted in the list. */
  sort: z
    .string()
    .refine((val) => ["createdAt", "updatedAt", "service"].includes(val), {
      message: "Invalid sort parameter",
    })
    .default("createdAt"),

  /** Specifies the sort order with respect to sort field. */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

const BaseBodySchema = z.object({
  integrationId: z.string().uuid(),
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
    service: z.nativeEnum(ImportableIntegrationService).optional(),
  }),
});

export type ImportsListReq = z.infer<typeof ImportsListSchema>;

export const ImportsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the import to delete */
    id: z.string().uuid(),
  }),
});

export type ImportsDeleteReq = z.infer<typeof ImportsDeleteSchema>;
