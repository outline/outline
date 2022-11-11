import { isEmpty } from "lodash";
import { z } from "zod";
import { Document } from "@server/models";

export const DocumentsListReqSchema = z
  .object({
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

    /** Specifies the attributes by which documents will be sorted in the list */
    sort: z
      .string()
      .refine((val) =>
        [...Object.keys(Document.rawAttributes), "index"].includes(val)
      )
      .default("updatedAt"),

    /** Specifies the sort order with respect to sort field */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),
  })
  // Maintains backwards compatibility
  .transform((doc) => {
    doc.collectionId = doc.collectionId || doc.collection;
    doc.userId = doc.userId || doc.user;
    delete doc.collection;
    delete doc.user;

    return doc;
  });

export type DocumentsListReq = z.infer<typeof DocumentsListReqSchema>;

export const DocumentsArchivedReqSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      [...Object.keys(Document.rawAttributes), "index"].includes(val)
    )
    .default("updatedAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .nullish()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

export type DocumentsArchivedReq = z.infer<typeof DocumentsArchivedReqSchema>;

export const DocumentsDeletedReqSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      [...Object.keys(Document.rawAttributes), "index"].includes(val)
    )
    .default("updatedAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .nullish()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

export type DocumentsDeletedReq = z.infer<typeof DocumentsDeletedReqSchema>;

export const DocumentsViewedReqSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      [...Object.keys(Document.rawAttributes), "index"].includes(val)
    )
    .default("updatedAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .nullish()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

export type DocumentsViewedReq = z.infer<typeof DocumentsViewedReqSchema>;

export const DocumentsDraftsReqSchema = z.object({
  /** Id of the collection to which the document belongs */
  collectionId: z.string().uuid().optional(),

  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      [...Object.keys(Document.rawAttributes), "index"].includes(val)
    )
    .default("updatedAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),

  /** Date filter for recency */
  dateFilter: z
    .union([
      z.literal("day"),
      z.literal("week"),
      z.literal("month"),
      z.literal("year"),
    ])
    .optional(),
});

export type DocumentsDraftsReq = z.infer<typeof DocumentsDraftsReqSchema>;

export const DocumentsInfoReqSchema = z
  .object({
    /** Id of the document to be retrieved */
    id: z.string().uuid().optional(),

    /** Share Id, if available */
    shareId: z.string().uuid().optional(),

    /** Version of the API to be used */
    apiVersion: z.number().optional(),
  })
  .refine((obj) => !(isEmpty(obj.id) && isEmpty(obj.shareId)), {
    message: "one of id or shareId is required",
  });

export type DocumentsInfoReq = z.infer<typeof DocumentsInfoReqSchema>;

export const DocumentsExportReqSchema = z
  .object({
    /** Id of the document to be retrieved */
    id: z.string().uuid().optional(),

    /** Share Id, if available */
    shareId: z.string().uuid().optional(),
  })
  .refine((obj) => !(isEmpty(obj.id) && isEmpty(obj.shareId)), {
    message: "one of id or shareId is required",
  });

export type DocumentsExportReq = z.infer<typeof DocumentsExportReqSchema>;

export const DocumentsRestoreReqSchema = z.object({
  /** Id of the document to be retrieved */
  id: z.string().uuid(),

  /** Id of the collection to which the document belongs */
  collectionId: z.string().uuid().optional(),

  /** Id of document revision */
  revisionId: z.string().uuid().optional(),
});

export type DocumentsRestoreReq = z.infer<typeof DocumentsRestoreReqSchema>;

export const DocumentsSearchTitlesReqSchema = z.object({
  /** Query for document title search */
  query: z.string().refine((v) => v.trim() !== ""),
});

export type DocumentsSearchTitlesReq = z.infer<
  typeof DocumentsSearchTitlesReqSchema
>;

export const DocumentsSearchReqSchema = z.object({
  /** Query for search */
  query: z.string().refine((v) => v.trim() !== ""),

  /** Whether to include archived docs in results */
  includeArchived: z.boolean().optional(),

  /** Whether to include drafts in results */
  includeDrafts: z.boolean().optional(),

  /** Filter results for team based on the collection */
  collectionId: z.string().uuid().optional(),

  /** Filter results based on user */
  userId: z.string().uuid().optional(),

  /** Filter results based on date */
  dateFilter: z
    .union([
      z.literal("day"),
      z.literal("week"),
      z.literal("month"),
      z.literal("year"),
    ])
    .optional(),

  /** Filter results for the team derived from shareId */
  shareId: z.string().uuid().optional(),

  /** Min words to be shown in the results snippets */
  snippetMinWords: z.number().default(20),

  /** Max words to be accomodated in the results snippets */
  snippetMaxWords: z.number().default(30),
});

export type DocumentsSearchReq = z.infer<typeof DocumentsSearchReqSchema>;

export const DocumentsTemplatizeReqSchema = z.object({
  /** Id of the doc to templatize */
  id: z.string().uuid(),
});

export type DocumentsTemplatizeReq = z.infer<
  typeof DocumentsTemplatizeReqSchema
>;

export const DocumentsUpdateReqSchema = z
  .object({
    /** Id of the doc to be updated */
    id: z.string().uuid(),

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
    templateId: z.string().uuid().optional(),

    /** Doc collection Id */
    collectionId: z.string().uuid().optional(),

    /** Boolean to denote if text should be appended */
    append: z.boolean().optional(),
  })
  .refine((obj) => !(obj.append && !obj.text), {
    message: "text is required while appending",
  });

export type DocumentsUpdateReq = z.infer<typeof DocumentsUpdateReqSchema>;

export const DocumentsMoveReqSchema = z
  .object({
    /** Id of the doc to be moved */
    id: z.string().uuid(),

    /** Id of collection to which the doc is supposed to be moved */
    collectionId: z.string().uuid(),

    /** Parent Id, in case if the doc is moved to a new parent */
    parentDocumentId: z.string().uuid().optional(),

    /** Helps invaluate the new index in collection structure upon move */
    index: z.number().positive().optional(),
  })
  .refine((obj) => !(obj.parentDocumentId === obj.id), {
    message: "infinite loop detected, cannot nest a document inside itself",
  });

export type DocumentsMoveReq = z.infer<typeof DocumentsMoveReqSchema>;

export const DocumentsArchiveReqSchema = z.object({
  /** Id of the doc to archive*/
  id: z.string().uuid(),
});

export type DocumentsArchiveReq = z.infer<typeof DocumentsArchiveReqSchema>;

export const DocumentsDeleteReqSchema = z.object({
  /** Id of the doc to delete */
  id: z.string().uuid(),

  /** Whether to permanently delete the doc as opposed to soft-delete */
  permanent: z.boolean().optional(),
});

export type DocumentsDeleteReq = z.infer<typeof DocumentsDeleteReqSchema>;

export const DocumentsUnpublishReqSchema = z.object({
  /** Id of the doc to unpublish */
  id: z.string().uuid(),
});

export type DocumentsUnpublishReq = z.infer<typeof DocumentsUnpublishReqSchema>;

export const DocumentsImportReqSchema = z.object({
  /** Whether to publish the imported docs */
  publish: z.boolean().optional(),

  /** Import docs to this collection */
  collectionId: z.string().uuid(),

  /** Import under this parent doc */
  parentDocumentId: z.string().uuid().optional(),
});

export type DocumentsImportReq = z.infer<typeof DocumentsImportReqSchema>;

export const DocumentsCreateReqSchema = z
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
    parentDocumentId: z.string().uuid().optional(),

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

export type DocumentsCreateReq = z.infer<typeof DocumentsCreateReqSchema>;
