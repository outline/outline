import { z } from "zod";
import {
  CollectionPermission,
  type ImportableIntegrationService,
  IntegrationService,
  IssueTrackerIntegrationService,
  ProsemirrorDoc,
} from "./types";
import { PageType } from "plugins/notion/shared/types";

const BaseImportInputItemSchema = z.object({
  permission: z.nativeEnum(CollectionPermission).optional(),
});

export type BaseImportInput = z.infer<typeof BaseImportInputItemSchema>[];

export const NotionImportInputItemSchema = BaseImportInputItemSchema.extend({
  type: z.nativeEnum(PageType).optional(),
  externalId: z.string().optional(),
});

export type NotionImportInput = z.infer<typeof NotionImportInputItemSchema>[];

export type ImportInput<T extends ImportableIntegrationService> =
  T extends IntegrationService.Notion ? NotionImportInput : BaseImportInput;

export const BaseImportTaskInputItemSchema = z.object({
  externalId: z.string(),
  parentExternalId: z.string().optional(),
  collectionExternalId: z.string().optional(),
});

export type BaseImportTaskInput = z.infer<
  typeof BaseImportTaskInputItemSchema
>[];

export const NotionImportTaskInputItemSchema =
  BaseImportTaskInputItemSchema.extend({
    type: z.nativeEnum(PageType),
  });

export type NotionImportTaskInput = z.infer<
  typeof NotionImportTaskInputItemSchema
>[];

export type ImportTaskInput<T extends ImportableIntegrationService> =
  T extends IntegrationService.Notion
    ? NotionImportTaskInput
    : BaseImportTaskInput;

// No reason to be here except for co-location with import task input.
export type ImportTaskOutput = {
  externalId: string;
  title: string;
  emoji?: string;
  author?: string;
  content: ProsemirrorDoc;
  createdAt?: Date;
  updatedAt?: Date;
}[];

export const IssueSource = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  owner: z.object({
    id: z.string().nonempty(),
    name: z.string().nonempty(),
  }),
  service: z.nativeEnum(IssueTrackerIntegrationService),
});

export type IssueSource = z.infer<typeof IssueSource>;
