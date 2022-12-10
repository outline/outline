import { isEmpty } from "lodash";
import { z } from "zod";

const DocumentsSortParamsSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) => ["createdAt", "updatedAt", "index"].includes(val))
    .default("updatedAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

const DateFilterSchema = z.object({
  /** Date filter */
  dateFilter: z
    .union([
      z.literal("day"),
      z.literal("week"),
      z.literal("month"),
      z.literal("year"),
    ])
    .optional(),
});

const SearchQuerySchema = z.object({
  /** Query for search */
  query: z.string().refine((v) => v.trim() !== ""),
});

const BaseIdSchema = z.object({
  /** Id of the document to be updated */
  id: z.string(),
});

export const DocumentsListSchema = DocumentsSortParamsSchema.extend({
  /** Id of the user who created the doc */
  userId: z.string().uuid().optional(),

  /** Alias for userId - kept for backwards compatibility */
  user: z.string().uuid().optional(),

  /** Id of the collection to which the document belongs */
  collectionId: z.string().uuid().optional(),

  /** Alias for collectionId - kept for backwards compatibility */
  collection: z.string().uuid().optional(),

  /** Id of the backlinked document */
  backlinkDocumentId: z.string().uuid().optional(),

  /** Id of the parent document to which the document belongs */
  parentDocumentId: z.string().uuid().nullish(),

  /** Boolean which denotes whether the document is a template */
  template: z.boolean().optional(),
})
  // Maintains backwards compatibility
  .transform((doc) => {
    doc.collectionId = doc.collectionId || doc.collection;
    doc.userId = doc.userId || doc.user;
    delete doc.collection;
    delete doc.user;

    return doc;
  });

export type DocumentsListReq = z.infer<typeof DocumentsListSchema>;

export const DocumentsArchivedSchema = DocumentsSortParamsSchema.extend({});

export type DocumentsArchivedReq = z.infer<typeof DocumentsArchivedSchema>;

export const DocumentsDeletedSchema = DocumentsSortParamsSchema.extend({});

export type DocumentsDeletedReq = z.infer<typeof DocumentsDeletedSchema>;

export const DocumentsViewedSchema = DocumentsSortParamsSchema.extend({});

export type DocumentsViewedReq = z.infer<typeof DocumentsViewedSchema>;

export const DocumentsDraftsSchema = DocumentsSortParamsSchema.merge(
  DateFilterSchema
).extend({
  /** Id of the collection to which the document belongs */
  collectionId: z.string().uuid().optional(),
});

export type DocumentsDraftsReq = z.infer<typeof DocumentsDraftsSchema>;

export const DocumentsInfoSchema = z
  .object({
    /** Id of the document to be retrieved */
    id: z.string().optional(),

    /** Share Id, if available */
    shareId: z.string().uuid().optional(),

    /** Version of the API to be used */
    apiVersion: z.number().optional(),
  })
  .refine((obj) => !(isEmpty(obj.id) && isEmpty(obj.shareId)), {
    message: "one of id or shareId is required",
  });

export type DocumentsInfoReq = z.infer<typeof DocumentsInfoSchema>;

export const DocumentsExportSchema = z
  .object({
    /** Id of the document to be exported */
    id: z.string().uuid().optional(),

    /** Share Id, if available */
    shareId: z.string().uuid().optional(),
  })
  .refine((obj) => !(isEmpty(obj.id) && isEmpty(obj.shareId)), {
    message: "one of id or shareId is required",
  });

export type DocumentsExportReq = z.infer<typeof DocumentsExportSchema>;

export const DocumentsRestoreSchema = BaseIdSchema.extend({
  /** Id of the collection to which the document belongs */
  collectionId: z.string().uuid().optional(),

  /** Id of document revision */
  revisionId: z.string().uuid().optional(),
});

export type DocumentsRestoreReq = z.infer<typeof DocumentsRestoreSchema>;

export const DocumentsSearchSchema = SearchQuerySchema.merge(
  DateFilterSchema
).extend({
  /** Whether to include archived docs in results */
  includeArchived: z.boolean().optional(),

  /** Whether to include drafts in results */
  includeDrafts: z.boolean().optional(),

  /** Filter results for team based on the collection */
  collectionId: z.string().uuid().optional(),

  /** Filter results based on user */
  userId: z.string().uuid().optional(),

  /** Filter results for the team derived from shareId */
  shareId: z.string().uuid().optional(),

  /** Min words to be shown in the results snippets */
  snippetMinWords: z.number().default(20),

  /** Max words to be accomodated in the results snippets */
  snippetMaxWords: z.number().default(30),
});

export type DocumentsSearchReq = z.infer<typeof DocumentsSearchSchema>;

export const DocumentsTemplatizeSchema = BaseIdSchema.extend({});

export type DocumentsTemplatizeReq = z.infer<typeof DocumentsTemplatizeSchema>;

export const DocumentsUpdateSchema = BaseIdSchema.extend({
  /** Doc title to be updated */
  title: z.string().optional(),

  /** Doc text to be updated */
  text: z.string().optional(),

  /** Boolean to denote if the doc should occupy full width */
  fullWidth: z.boolean().optional(),

  /** Boolean to denote if the doc should be published */
  publish: z.boolean().optional(),

  /** Revision to compare against document revision count */
  lastRevision: z.number().optional(),

  /** Doc template Id */
  templateId: z.string().uuid().nullish(),

  /** Doc collection Id */
  collectionId: z.string().uuid().optional(),

  /** Boolean to denote if text should be appended */
  append: z.boolean().optional(),
}).refine((obj) => !(obj.append && !obj.text), {
  message: "text is required while appending",
});

export type DocumentsUpdateReq = z.infer<typeof DocumentsUpdateSchema>;

export const DocumentsMoveSchema = BaseIdSchema.extend({
  /** Id of collection to which the doc is supposed to be moved */
  collectionId: z.string().uuid(),

  /** Parent Id, in case if the doc is moved to a new parent */
  parentDocumentId: z.string().uuid().nullish(),

  /** Helps evaluate the new index in collection structure upon move */
  index: z.number().gte(0).optional(),
}).refine((obj) => !(obj.parentDocumentId === obj.id), {
  message: "infinite loop detected, cannot nest a document inside itself",
});

export type DocumentsMoveReq = z.infer<typeof DocumentsMoveSchema>;

export const DocumentsArchiveSchema = BaseIdSchema.extend({});

export type DocumentsArchiveReq = z.infer<typeof DocumentsArchiveSchema>;

export const DocumentsDeleteSchema = BaseIdSchema.extend({
  /** Whether to permanently delete the doc as opposed to soft-delete */
  permanent: z.boolean().optional(),
});

export type DocumentsDeleteReq = z.infer<typeof DocumentsDeleteSchema>;

export const DocumentsUnpublishSchema = BaseIdSchema.extend({});

export type DocumentsUnpublishReq = z.infer<typeof DocumentsUnpublishSchema>;

export const DocumentsImportSchema = z.object({
  /** Whether to publish the imported docs. String due to multi-part form upload */
  publish: z.string().optional(),

  /** Import docs to this collection */
  collectionId: z.string().uuid(),

  /** Import under this parent doc */
  parentDocumentId: z.string().uuid().nullish(),
});

export type DocumentsImportReq = z.infer<typeof DocumentsImportSchema>;

export const DocumentsCreateSchema = z
  .object({
    /** Doc title */
    title: z.string().default(""),

    /** Doc text */
    text: z.string().default(""),

    /** Boolean to denote if the doc should be published */
    publish: z.boolean().optional(),

    /** Create Doc under this collection */
    collectionId: z.string().uuid().optional(),

    /** Create Doc under this parent */
    parentDocumentId: z.string().uuid().nullish(),

    /** Create doc with this template */
    templateId: z.string().uuid().optional(),

    /** Whether to create a template doc */
    template: z.boolean().optional(),
  })
  .refine((obj) => !(obj.parentDocumentId && !obj.collectionId), {
    message: "collectionId is required to create a nested document",
  })
  .refine((obj) => !(obj.template && !obj.collectionId), {
    message: "collectionId is required to create a template document",
  })
  .refine((obj) => !(obj.publish && !obj.collectionId), {
    message: "collectionId is required to publish",
  });

export type DocumentsCreateReq = z.infer<typeof DocumentsCreateSchema>;
