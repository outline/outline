import formidable from "formidable";
import isEmpty from "lodash/isEmpty";
import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { DocumentPermission, StatusFilter } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { BaseSchema } from "@server/routes/api/schema";
import { zodIconType, zodIdType } from "@server/utils/zod";
import { ValidateColor } from "@server/validation";

const DocumentsSortParamsSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      ["createdAt", "updatedAt", "publishedAt", "index", "title"].includes(val)
    )
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

const BaseSearchSchema = DateFilterSchema.extend({
  /** Filter results for team based on the collection */
  collectionId: z.string().uuid().optional(),

  /** Filter results based on user */
  userId: z.string().uuid().optional(),

  /** Filter results based on content within a document and it's children */
  documentId: z.string().uuid().optional(),

  /** Document statuses to include in results */
  statusFilter: z.nativeEnum(StatusFilter).array().optional(),

  /** Filter results for the team derived from shareId */
  shareId: z
    .string()
    .refine((val) => isUUID(val) || UrlHelper.SHARE_URL_SLUG_REGEX.test(val))
    .optional(),

  /** Min words to be shown in the results snippets */
  snippetMinWords: z.number().default(20),

  /** Max words to be accomodated in the results snippets */
  snippetMaxWords: z.number().default(30),
});

const BaseIdSchema = z.object({
  /** Id of the document to be updated */
  id: zodIdType(),
});

export const DocumentsListSchema = BaseSchema.extend({
  body: DocumentsSortParamsSchema.extend({
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

    /** Document statuses to include in results */
    statusFilter: z.nativeEnum(StatusFilter).array().optional(),
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
    collectionId: z.string().uuid().optional(),
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
  body: DocumentsSortParamsSchema.merge(DateFilterSchema).extend({
    /** Id of the collection to which the document belongs */
    collectionId: z.string().uuid().optional(),
  }),
});

export type DocumentsDraftsReq = z.infer<typeof DocumentsDraftsSchema>;

export const DocumentsInfoSchema = BaseSchema.extend({
  body: z.object({
    id: zodIdType().optional(),
    /** Share Id, if available */
    shareId: z
      .string()
      .refine((val) => isUUID(val) || UrlHelper.SHARE_URL_SLUG_REGEX.test(val))
      .optional(),

    /** @deprecated Version of the API to be used, remove in a few releases */
    apiVersion: z.number().optional(),
  }),
}).refine((req) => !(isEmpty(req.body.id) && isEmpty(req.body.shareId)), {
  message: "one of id or shareId is required",
});

export type DocumentsInfoReq = z.infer<typeof DocumentsInfoSchema>;

export const DocumentsExportSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type DocumentsExportReq = z.infer<typeof DocumentsExportSchema>;

export const DocumentsRestoreSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the collection to which the document belongs */
    collectionId: z.string().uuid().optional(),

    /** Id of document revision */
    revisionId: z.string().uuid().optional(),
  }),
});

export type DocumentsRestoreReq = z.infer<typeof DocumentsRestoreSchema>;

export const DocumentsSearchSchema = BaseSchema.extend({
  body: BaseSearchSchema.extend({
    /** Query for search */
    query: z.string().optional(),
  }),
});

export type DocumentsSearchReq = z.infer<typeof DocumentsSearchSchema>;

export const DocumentsSearchTitlesSchema = BaseSchema.extend({
  body: BaseSearchSchema.extend({
    /** Query for search */
    query: z.string().refine((val) => val.trim() !== ""),
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
    collectionId: z.string().uuid().optional(),
    /** Id of the parent document to which the document should be copied */
    parentDocumentId: z.string().uuid().optional(),
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
    templateId: z.string().uuid().nullish(),

    /** Doc collection Id */
    collectionId: z.string().uuid().nullish(),

    /** Boolean to denote if text should be appended */
    append: z.boolean().optional(),

    /** @deprecated Version of the API to be used, remove in a few releases */
    apiVersion: z.number().optional(),

    /** Whether the editing session is complete */
    done: z.boolean().optional(),
  }),
}).refine((req) => !(req.body.append && !req.body.text), {
  message: "text is required while appending",
});

export type DocumentsUpdateReq = z.infer<typeof DocumentsUpdateSchema>;

export const DocumentsMoveSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of collection to which the doc is supposed to be moved */
    collectionId: z.string().uuid().optional().nullish(),

    /** Parent Id, in case if the doc is moved to a new parent */
    parentDocumentId: z.string().uuid().nullish(),

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
    detach: z.boolean().default(false),

    /** @deprecated Version of the API to be used, remove in a few releases */
    apiVersion: z.number().optional(),
  }),
});

export type DocumentsUnpublishReq = z.infer<typeof DocumentsUnpublishSchema>;

export const DocumentsImportSchema = BaseSchema.extend({
  body: z.object({
    /** Whether to publish the imported docs. String as this is always multipart/form-data */
    publish: z.preprocess((val) => val === "true", z.boolean()).optional(),

    /** Import docs to this collection */
    collectionId: z.string().uuid(),

    /** Import under this parent doc */
    parentDocumentId: z.string().uuid().nullish(),
  }),
  file: z.custom<formidable.File>(),
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
    collectionId: z.string().uuid().nullish(),

    /** Parent document to create within */
    parentDocumentId: z.string().uuid().nullish(),

    /** A template to create the document from */
    templateId: z.string().uuid().optional(),

    /** Optionally set the created date in the past */
    createdAt: z.coerce
      .date()
      .optional()
      .refine((data) => !data || data < new Date(), {
        message: "createdAt must be in the past",
      }),

    /** Boolean to denote if the document should occupy full width */
    fullWidth: z.boolean().optional(),

    /** Whether this should be considered a template */
    template: z.boolean().optional(),
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
    userId: z.string().uuid().optional(),
  }),
});

export type DocumentsUsersReq = z.infer<typeof DocumentsUsersSchema>;

export const DocumentsAddUserSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the user who is to be added */
    userId: z.string().uuid(),
    /** Permission to be granted to the added user */
    permission: z.nativeEnum(DocumentPermission).optional(),
  }),
});

export type DocumentsAddUserReq = z.infer<typeof DocumentsAddUserSchema>;

export const DocumentsRemoveUserSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Id of the user who is to be removed */
    userId: z.string().uuid(),
  }),
});

export type DocumentsRemoveUserReq = z.infer<typeof DocumentsRemoveUserSchema>;

export const DocumentsAddGroupSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    groupId: z.string().uuid(),
    permission: z
      .nativeEnum(DocumentPermission)
      .default(DocumentPermission.ReadWrite),
  }),
});

export type DocumentsAddGroupsReq = z.infer<typeof DocumentsAddGroupSchema>;

export const DocumentsRemoveGroupSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    groupId: z.string().uuid(),
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
    permission: z.nativeEnum(DocumentPermission).optional(),
  }),
});

export type DocumentsMembershipsReq = z.infer<
  typeof DocumentsMembershipsSchema
>;
