import isUndefined from "lodash/isUndefined";
import { z } from "zod";
import {
  CollectionPermission,
  CollectionStatusFilter,
  FileOperationFormat,
} from "@shared/types";
import { Collection } from "@server/models";
import { zodIconType, zodIdType, zodShareIdType } from "@server/utils/zod";
import { ValidateColor, ValidateIndex } from "@server/validation";
import { BaseSchema, ProsemirrorSchema } from "../schema";

const BaseIdSchema = z.object({
  /** Id of the collection to be updated */
  id: zodIdType(),
});

export const CollectionsCreateSchema = BaseSchema.extend({
  body: z.object({
    name: z.string(),
    color: z
      .string()
      .regex(ValidateColor.regex, { message: ValidateColor.message })
      .nullish(),
    description: z.string().nullish(),
    data: ProsemirrorSchema({ allowEmpty: true }).nullish(),
    permission: z
      .enum(CollectionPermission)
      .nullish()
      .transform((val) => (isUndefined(val) ? null : val)),
    sharing: z.boolean().prefault(true),
    icon: zodIconType().optional(),
    sort: z
      .object({
        field: z.union([z.literal("title"), z.literal("index")]),
        direction: z.union([z.literal("asc"), z.literal("desc")]),
      })
      .prefault(Collection.DEFAULT_SORT),
    index: z
      .string()
      .regex(ValidateIndex.regex, { message: ValidateIndex.message })
      .max(ValidateIndex.maxLength, {
        message: `Must be ${ValidateIndex.maxLength} or fewer characters long`,
      })
      .optional(),
    commenting: z.boolean().nullish(),
  }),
});

export type CollectionsCreateReq = z.infer<typeof CollectionsCreateSchema>;

export const CollectionsInfoSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    /** Share Id, if available */
    shareId: zodShareIdType().optional(),
  }),
});

export type CollectionsInfoReq = z.infer<typeof CollectionsInfoSchema>;

export const CollectionsDocumentsSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type CollectionsDocumentsReq = z.infer<
  typeof CollectionsDocumentsSchema
>;

export const CollectionsImportSchema = BaseSchema.extend({
  body: z.object({
    permission: z
      .enum(CollectionPermission)
      .nullish()
      .transform((val) => (isUndefined(val) ? null : val)),
    attachmentId: z.uuid(),
    format: z
      .enum(FileOperationFormat)
      .prefault(FileOperationFormat.MarkdownZip),
  }),
});

export type CollectionsImportReq = z.infer<typeof CollectionsImportSchema>;

export const CollectionsAddGroupSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    groupId: z.uuid(),
    permission: z
      .enum(CollectionPermission)
      .prefault(CollectionPermission.ReadWrite),
  }),
});

export type CollectionsAddGroupsReq = z.infer<typeof CollectionsAddGroupSchema>;

export const CollectionsRemoveGroupSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    groupId: z.uuid(),
  }),
});

export type CollectionsRemoveGroupReq = z.infer<
  typeof CollectionsRemoveGroupSchema
>;

export const CollectionsAddUserSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    userId: z.uuid(),
    permission: z.enum(CollectionPermission).optional(),
  }),
});

export type CollectionsAddUserReq = z.infer<typeof CollectionsAddUserSchema>;

export const CollectionsRemoveUserSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    userId: z.uuid(),
  }),
});

export type CollectionsRemoveUserReq = z.infer<
  typeof CollectionsRemoveUserSchema
>;

export const CollectionsMembershipsSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    query: z.string().optional(),
    permission: z.enum(CollectionPermission).optional(),
  }),
});

export type CollectionsMembershipsReq = z.infer<
  typeof CollectionsMembershipsSchema
>;

export const CollectionsExportSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    format: z
      .enum(FileOperationFormat)
      .prefault(FileOperationFormat.MarkdownZip),
    includeAttachments: z.boolean().prefault(true),
  }),
});

export type CollectionsExportReq = z.infer<typeof CollectionsExportSchema>;

export const CollectionsExportAllSchema = BaseSchema.extend({
  body: z.object({
    format: z
      .enum(FileOperationFormat)
      .prefault(FileOperationFormat.MarkdownZip),
    includeAttachments: z.boolean().prefault(true),
    includePrivate: z.boolean().prefault(true),
  }),
});

export type CollectionsExportAllReq = z.infer<
  typeof CollectionsExportAllSchema
>;

export const CollectionsUpdateSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    name: z.string().optional(),
    description: z.string().nullish(),
    data: ProsemirrorSchema({ allowEmpty: true }).nullish(),
    icon: zodIconType().nullish(),
    permission: z.enum(CollectionPermission).nullish(),
    color: z
      .string()
      .regex(ValidateColor.regex, { message: ValidateColor.message })
      .nullish(),
    sort: z
      .object({
        field: z.union([z.literal("title"), z.literal("index")]),
        direction: z.union([z.literal("asc"), z.literal("desc")]),
      })
      .optional(),
    sharing: z.boolean().optional(),
    commenting: z.boolean().nullish(),
  }),
});

export type CollectionsUpdateReq = z.infer<typeof CollectionsUpdateSchema>;

export const CollectionsListSchema = BaseSchema.extend({
  body: z.object({
    includeListOnly: z.boolean().prefault(false),

    query: z.string().optional(),

    /** Collection statuses to include in results */
    statusFilter: z.enum(CollectionStatusFilter).array().optional(),
  }),
});

export type CollectionsListReq = z.infer<typeof CollectionsListSchema>;

export const CollectionsDeleteSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type CollectionsDeleteReq = z.infer<typeof CollectionsDeleteSchema>;

export const CollectionsArchiveSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type CollectionsArchiveReq = z.infer<typeof CollectionsArchiveSchema>;

export const CollectionsRestoreSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type CollectionsRestoreReq = z.infer<typeof CollectionsRestoreSchema>;

export const CollectionsArchivedSchema = BaseSchema;

export type CollectionsArchivedReq = z.infer<typeof CollectionsArchivedSchema>;

export const CollectionsMoveSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    index: z
      .string()
      .regex(ValidateIndex.regex, { message: ValidateIndex.message })
      .max(ValidateIndex.maxLength, {
        message: `Must be ${ValidateIndex.maxLength} or fewer characters long`,
      }),
  }),
});

export type CollectionsMoveReq = z.infer<typeof CollectionsMoveSchema>;
