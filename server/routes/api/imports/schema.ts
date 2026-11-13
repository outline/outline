import { z } from "zod";
import { BaseImportInputItemSchema } from "@shared/schema";
import {
  CollectionPermission,
  ImportableIntegrationService,
  IntegrationService,
} from "@shared/types";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { BaseSchema } from "../schema";

/**
 * Optional destination for the import. When either is set, root nodes are
 * materialized as documents under the destination rather than as new
 * collections.
 */
const DestinationShape = {
  /** Existing collection to import root nodes into as root documents. */
  collectionId: z.uuid().optional(),
  /** Existing document to import root nodes under as child documents. */
  documentId: z.uuid().optional(),
};

/** The body to import an uploaded file. */
export const AttachmentImportBodySchema = z.object({
  service: z.enum(ImportableIntegrationService),
  attachmentId: z.uuid(),
  permission: z.enum(CollectionPermission).optional(),
  ...DestinationShape,
});

/** The body to import from a connected integration. */
export const IntegrationImportBodySchema = z.object({
  service: z.enum(ImportableIntegrationService),
  integrationId: z.uuid(),
  input: z.array(BaseImportInputItemSchema).min(1),
  ...DestinationShape,
});

/** A body that an import plugin accepts in imports.create. */
export type ImportsCreateBody =
  | z.infer<typeof AttachmentImportBodySchema>
  | z.infer<typeof IntegrationImportBodySchema>;

// Resolved on first parse, after plugins have registered their schemas.
const pluginBodies = z.lazy((): z.ZodType<ImportsCreateBody> => {
  const schemas = PluginManager.getHooks(Hook.ImportSchema).map(
    (hook) => hook.value
  );
  return schemas.length ? z.union(schemas) : z.never();
});

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

export const ImportsCreateSchema = BaseSchema.extend({
  body: z
    .union([
      AttachmentImportBodySchema.extend({
        service: z.enum([
          IntegrationService.Markdown,
          IntegrationService.OKF,
          IntegrationService.JSON,
        ]),
      }),
      pluginBodies,
    ])
    .refine((body) => !(body.collectionId && body.documentId), {
      error: "Only one of collectionId or documentId may be set",
    })
    .refine(
      (body) => {
        if (!body.collectionId && !body.documentId) {
          return true;
        }
        if ("input" in body) {
          return !body.input.some((item) => item.permission);
        }
        return body.permission === undefined;
      },
      {
        error:
          "permission cannot be set when importing into an existing destination",
      }
    ),
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
