import type formidable from "formidable";
import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import {
  DirectionFilter,
  DocumentPermission,
  StatusFilter,
  TextEditMode,
  SortFilter,
} from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";
import { zodIconType, zodIdType, zodShareIdType } from "@server/utils/zod";
import { ValidateColor } from "@server/validation";

const DocumentsSortParamsSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      [
        "createdAt",
        "updatedAt",
        "publishedAt",
        "index",
        "title",
        "popularityScore",
      ].includes(val)
    )
    .prefault("updatedAt"),

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

const BaseSearchSchema = DateFilterSchema.extend({
  /** Filter results for team based on the collection */
  collectionId: z.uuid().optional(),

  /** Filter results based on user */
  userId: z.uuid().optional(),

  /** Filter results based on content within a document and it's children */
  documentId: z.uuid().optional(),

  /** Document statuses to include in results */
  statusFilter: z.enum(StatusFilter).array().optional(),

  /** Filter results for the team derived from shareId */
  shareId: zodShareIdType().optional(),

  /** Min words to be shown in the results snippets */
  snippetMinWords: z.number().prefault(20),

  /** Max words to be accomodated in the results snippets */
  snippetMaxWords: z.number().prefault(30),
});

const BaseIdSchema = z.object({
  /** Id of the document to be updated */
  id: zodIdType(),
});

export const DocumentsListSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema.extend({
    /** Id of the user who created the doc */
    userId: z.uuid().optional(),

    /** Alias for userId - kept for backwards compatibility */
    user: z.uuid().optional(),

    /** Id of the collection to which the document belongs */
    collectionId: z.uuid().optional(),

    /** Alias for collectionId - kept for backwards compatibility */
    collection: z.uuid().optional(),

    /** Id of the backlinked document */
    backlinkDocumentId: z.uuid().optional(),

    /** Id of the parent document to which the document belongs */
    parentDocumentId: z.uuid().nullish(),

    /** Document statuses to include in results */
    statusFilter: z.enum(StatusFilter).array().optional(),
  }),
  // Maintains backwards compatibility
}).transform((req) => {
  req.body.collectionId = req.body.collectionId || req.body.collection;
  req.body.userId = req.body.userId || req.body.user;
  delete req.body.collection;
  delete req.body.user;

  return req;
});

export type DocumentsListReq = z.infer<typeof DocumentsListSchema>;

export const DocumentsArchivedSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema.extend({
    /** Id of the collection to which archived documents should belong */
    collectionId: z.uuid().optional(),
  }),
});

export type DocumentsArchivedReq = z.infer<typeof DocumentsArchivedSchema>;

export const DocumentsDeletedSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema.extend({}),
});

export type DocumentsDeletedReq = z.infer<typeof DocumentsDeletedSchema>;

export const DocumentsViewedSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema.extend({}),
});

export type DocumentsViewedReq = z.infer<typeof DocumentsViewedSchema>;

export const DocumentsDraftsSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema.extend(DateFilterSchema.shape).extend({
    /** Id of the collection to which the document belongs */
    collectionId: z.uuid().optional(),
  }),
});

export type DocumentsDraftsReq = z.infer<typeof DocumentsDraftsSchema>;

export const DocumentsInfoSchema = BaseSchema.extend({
  body: z.object({
    id: zodIdType().optional(),
    /** Share Id, if available */
    shareId: zodShareIdType().optional(),
    /** @deprecated Version of the API to be used, remove in a few releases */
    apiVersion: z.number().optional(),
  }),
}).refine((req) => !(isEmpty(req.body.id) && isEmpty(req.body.shareId)), {
  message: "one of id or shareId is required",
});

export type DocumentsInfoReq = z.infer<typeof DocumentsInfoSchema>;

export const DocumentsExportSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    signedUrls: z.number().optional(),
    includeChildDocuments: z.boolean().prefault(false),
  }),
});

export type DocumentsExportReq = z.infer<typeof DocumentsExportSchema>;

export const DocumentsRestoreSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the collection to which the document belongs */
    collectionId: z.uuid().optional(),

    /** Id of document revision */
    revisionId: z.uuid().optional(),
  }),
});

export type DocumentsRestoreReq = z.infer<typeof DocumentsRestoreSchema>;

export const DocumentsSearchSchema = BaseSchema.extend({
  body: BaseSearchSchema.extend({
    /** Query for search */
    query: z.string().optional(),

    /** Specifies the attributes by which search results will be sorted */
    sort: z.enum(Object.values(SortFilter) as [string, ...string[]]).optional(),

    /** Specifies the sort order with respect to sort field */
    direction: z
      .enum(Object.values(DirectionFilter) as [string, ...string[]])
      .optional(),
  }),
});

export type DocumentsSearchReq = z.infer<typeof DocumentsSearchSchema>;

export const DocumentsSearchTitlesSchema = BaseSchema.extend({
  body: BaseSearchSchema.extend({
    /** Query for search */
    query: z.string().refine((val) => val.trim() !== ""),

    /** Specifies the attributes by which search results will be sorted */
    sort: z.enum(Object.values(SortFilter) as [string, ...string[]]).optional(),

    /** Specifies the sort order with respect to sort field */
    direction: z
      .enum(Object.values(DirectionFilter) as [string, ...string[]])
      .optional(),
  }),
});

export type DocumentsSearchTitlesReq = z.infer<
  typeof DocumentsSearchTitlesSchema
>;

export const DocumentsDuplicateSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** New document title */
    title: z.string().optional(),
    /** Whether child documents should also be duplicated */
    recursive: z.boolean().optional(),
    /** Whether the new document should be published */
    publish: z.boolean().optional(),
    /** Id of the collection to which the document should be copied */
    collectionId: z.uuid().optional(),
    /** Id of the parent document to which the document should be copied */
    parentDocumentId: z.uuid().optional(),
  }),
});

export type DocumentsDuplicateReq = z.infer<typeof DocumentsDuplicateSchema>;

export const DocumentsTemplatizeSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the collection inside which the template should be created */
    collectionId: z.string().nullish(),
    /** Whether the new template should be published */
    publish: z.boolean(),
  }),
});

export type DocumentsTemplatizeReq = z.infer<typeof DocumentsTemplatizeSchema>;

export const DocumentsUpdateSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Doc title to be updated */
    title: z.string().optional(),

    /** Doc text to be updated */
    text: z.string().optional(),

    /** Icon displayed alongside doc title */
    icon: zodIconType().nullish(),

    /** Icon color */
    color: z
      .string()
      .regex(ValidateColor.regex, { message: ValidateColor.message })
      .nullish(),

    /** Boolean to denote if the doc should occupy full width */
    fullWidth: z.boolean().optional(),

    /** Boolean to denote if insights should be visible on the doc */
    insightsEnabled: z.boolean().optional(),

    /** Boolean to denote if the doc should be published */
    publish: z.boolean().optional(),

    /** Doc template Id */
    templateId: z.uuid().nullish(),

    /** Doc collection Id */
    collectionId: z.uuid().nullish(),

    /** @deprecated Use editMode instead */
    append: z.boolean().optional(),

    /** The edit mode for text updates: "replace", "append", or "prepend" */
    editMode: z.enum(TextEditMode).optional(),

    /** @deprecated Version of the API to be used, remove in a few releases */
    apiVersion: z.number().optional(),

    /** Whether the editing session is complete */
    done: z.boolean().optional(),
  }),
})
  .refine(
    (req) =>
      !(
        (req.body.append ||
          req.body.editMode === TextEditMode.Append ||
          req.body.editMode === TextEditMode.Prepend) &&
        !req.body.text
      ),
    {
      message: "text is required when using append, prepend, or editMode",
    }
  )
  .transform((req) => {
    // Transform deprecated append to editMode for backwards compatibility
    if (req.body.append && !req.body.editMode) {
      req.body.editMode = TextEditMode.Append;
    }
    delete req.body.append;
    return req;
  });

export type DocumentsUpdateReq = z.infer<typeof DocumentsUpdateSchema>;

export const DocumentsMoveSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of collection to which the doc is supposed to be moved */
    collectionId: z.uuid().optional().nullish(),

    /** Parent Id, in case if the doc is moved to a new parent */
    parentDocumentId: z.uuid().nullish(),

    /** Helps evaluate the new index in collection structure upon move */
    index: z.number().gte(0).optional(),
  }),
}).refine((req) => !(req.body.parentDocumentId === req.body.id), {
  message: "infinite loop detected, cannot nest a document inside itself",
});

export type DocumentsMoveReq = z.infer<typeof DocumentsMoveSchema>;

export const DocumentsArchiveSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type DocumentsArchiveReq = z.infer<typeof DocumentsArchiveSchema>;

export const DocumentsDeleteSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Whether to permanently delete the doc as opposed to soft-delete */
    permanent: z.boolean().optional(),
  }),
});

export type DocumentsDeleteReq = z.infer<typeof DocumentsDeleteSchema>;

export const DocumentsUnpublishSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Whether to detach the document from the collection */
    detach: z.boolean().prefault(false),

    /** @deprecated Version of the API to be used, remove in a few releases */
    apiVersion: z.number().optional(),
  }),
});

export type DocumentsUnpublishReq = z.infer<typeof DocumentsUnpublishSchema>;

export const DocumentsImportSchema = BaseSchema.extend({
  body: z
    .object({
      /** Whether to publish the imported docs. String as this is always multipart/form-data */
      publish: z
        .union([
          z.boolean(),
          z.preprocess((val) => val === "true", z.boolean()),
        ])
        .optional(),

      /** Import docs to this collection */
      collectionId: z.uuid().nullish(),

      /** Import under this parent doc */
      parentDocumentId: z.uuid().nullish(),

      /** ID of a pre-uploaded attachment to import from */
      attachmentId: z.uuid().optional(),
    })
    .refine(
      (req) => !(isEmpty(req.collectionId) && isEmpty(req.parentDocumentId)),
      {
        error: "one of collectionId or parentDocumentId is required",
      }
    ),
  file: z.custom<formidable.File>().optional(),
});

export type DocumentsImportReq = z.infer<typeof DocumentsImportSchema>;

export const DocumentsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the document to be created */
    id: zodIdType().optional(),

    /** Document title */
    title: z.string().optional(),

    /** Document text */
    text: z.string().optional(),

    /** Icon displayed alongside doc title */
    icon: zodIconType().optional(),

    /** Icon color */
    color: z
      .string()
      .regex(ValidateColor.regex, { message: ValidateColor.message })
      .nullish(),

    /** Boolean to denote if the doc should be published */
    publish: z.boolean().optional(),

    /** Collection to create document within  */
    collectionId: z.uuid().nullish(),

    /** Index to create the document at within the collection */
    index: z.number().optional(),

    /** Parent document to create within */
    parentDocumentId: z.uuid().nullish(),

    /** A template to create the document from */
    templateId: z.uuid().optional(),

    /** Optionally set the created date in the past */
    createdAt: z.coerce
      .date()
      .optional()
      .refine((data) => !data || data < new Date(), {
        error: "createdAt must be in the past",
      }),

    /** Boolean to denote if the document should occupy full width */
    fullWidth: z.boolean().optional(),
  }),
}).refine(
  (req) =>
    !(req.body.publish && !req.body.parentDocumentId && !req.body.collectionId),
  {
    message: "collectionId or parentDocumentId is required to publish",
  }
);

export type DocumentsCreateReq = z.infer<typeof DocumentsCreateSchema>;

export const DocumentsUsersSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Query term to search users by name */
    query: z.string().optional(),
    /** Id of the user to search within document access */
    userId: z.uuid().optional(),
  }),
});

export type DocumentsUsersReq = z.infer<typeof DocumentsUsersSchema>;

export const DocumentsChildrenSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type DocumentsChildrenReq = z.infer<typeof DocumentsChildrenSchema>;

export const DocumentsAddUserSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the user who is to be added */
    userId: z.uuid(),
    /** Permission to be granted to the added user */
    permission: z.enum(DocumentPermission).optional(),
  }),
});

export type DocumentsAddUserReq = z.infer<typeof DocumentsAddUserSchema>;

export const DocumentsRemoveUserSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the user who is to be removed */
    userId: z.uuid(),
  }),
});

export type DocumentsRemoveUserReq = z.infer<typeof DocumentsRemoveUserSchema>;

export const DocumentsAddGroupSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    groupId: z.uuid(),
    permission: z
      .enum(DocumentPermission)
      .prefault(DocumentPermission.ReadWrite),
  }),
});

export type DocumentsAddGroupsReq = z.infer<typeof DocumentsAddGroupSchema>;

export const DocumentsRemoveGroupSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    groupId: z.uuid(),
  }),
});

export type DocumentsRemoveGroupReq = z.infer<
  typeof DocumentsRemoveGroupSchema
>;

export const DocumentsSharedWithUserSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema,
});

export type DocumentsSharedWithUserReq = z.infer<
  typeof DocumentsSharedWithUserSchema
>;

export const DocumentsMembershipsSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    query: z.string().optional(),
    permission: z.enum(DocumentPermission).optional(),
  }),
});

export type DocumentsMembershipsReq = z.infer<
  typeof DocumentsMembershipsSchema
>;

export const DocumentsSitemapSchema = BaseSchema.extend({
  query: z.object({
    shareId: zodShareIdType().optional(),
  }),
});

export type DocumentsSitemapReq = z.infer<typeof DocumentsSitemapSchema>;
