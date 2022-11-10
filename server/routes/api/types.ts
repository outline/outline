import { z } from "zod";
import { Document } from "@server/models";

// TODO: Replace this in favor of separate schemas for individual endpoints
export const DocumentSchema = z
  .object({
    // validations
    id: z.string().uuid().nullish(),
    userId: z.string().uuid().nullish(),
    collectionId: z.string().uuid().nullish(),
    backlinkDocumentId: z.string().uuid().nullish(),
    parentDocumentId: z.string().uuid().nullish(),
    revisionId: z.string().uuid().nullish(),
    templateId: z.string().uuid().nullish(),
    template: z.boolean().nullish(),
    fullWidth: z.boolean().nullish(),
    append: z.boolean().nullish(),
    publish: z.boolean().nullish(),
    permanent: z.boolean().nullish(),
    lastRevision: z.number().nullish(),

    // defaults
    sort: z
      .string()
      .refine((val) =>
        [...Object.keys(Document.rawAttributes), "index"].includes(val)
      )
      .default("updatedAt"),
    title: z.string().default(""),
    text: z.string().default(""),

    // transforms
    direction: z
      .string()
      .nullish()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    // refinements
    dateFilter: z
      .string()
      .refine((val) => ["day", "week", "month", "year"].includes(val))
      .nullish(),
  })
  .passthrough();

export type DocumentReq = z.infer<typeof DocumentSchema>;

export const DocumentsListReqSchema = z
  .object({
    /** Id of the user who created the doc */
    userId: z.string().uuid().nullish(),

    /** Alias for userId - kept for backwards compatibility */
    user: z.string().uuid().nullish(),

    /** Id of the collection to which the document belongs */
    collectionId: z.string().uuid().nullish(),

    /** Alias for collectionId - kept for backwards compatibility */
    collection: z.string().uuid().nullish(),

    /** Id of the backlinked document */
    backlinkDocumentId: z.string().uuid().nullish(),

    /** Id of the parent document to which the document belongs */
    parentDocumentId: z.string().uuid().nullish(),

    /** Boolean which denotes whether the document is a template */
    template: z.boolean().nullish(),

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
