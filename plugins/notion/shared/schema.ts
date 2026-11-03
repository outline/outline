import { z } from "zod";
import {
  BaseImportInputItemSchema,
  BaseImportTaskInputItemSchema,
} from "@shared/schema";
import type { IntegrationService } from "@shared/types";
import { PageType } from "./types";

export const NotionImportInputItemSchema = BaseImportInputItemSchema.extend({
  type: z.enum(PageType).optional(),
  externalId: z.string().optional(),
});

export type NotionImportInput = z.infer<typeof NotionImportInputItemSchema>[];

export const NotionImportTaskInputItemSchema =
  BaseImportTaskInputItemSchema.extend({
    type: z.enum(PageType),
  });

export type NotionImportTaskInput = z.infer<
  typeof NotionImportTaskInputItemSchema
>[];

declare module "@shared/schema" {
  interface ImportInputMap {
    [IntegrationService.Notion]: NotionImportInput;
  }

  interface ImportTaskInputMap {
    [IntegrationService.Notion]: NotionImportTaskInput;
  }
}
