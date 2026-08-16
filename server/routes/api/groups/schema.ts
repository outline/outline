import { z } from "zod";
import { createFilterSchema } from "@shared/helpers/FilterHelper";
import { GroupPermission } from "@shared/types";
import { GroupValidation } from "@shared/validations";
import { Group } from "@server/models";

const BaseIdSchema = z.object({
  /** Group Id */
  id: z.uuid(),
});

const groupFilterFields = {
  id: { kind: "uuid", operators: ["eq", "neq", "in", "notIn"] },
  name: "string",
  description: "string",
  externalId: "string",
  createdAt: "date",
  updatedAt: "date",
  // `userId` scopes results to the groups that user is a member of, and
  // `source` to the provider a group is synced from. Neither is a column, so
  // both are resolved to group ids by the route handler, which only supports
  // `eq` and `in`.
  userId: { kind: "uuid", operators: ["eq", "in"] },
  source: { kind: "string", operators: ["eq", "in"] },
} as const;

const groupListFilter = createFilterSchema(groupFilterFields);

export const GroupsListSchema = z
  .object({
    body: z.object({
      /** Groups sorting direction */
      direction: z
        .string()
        .optional()
        .transform((val) => (val !== "ASC" ? "DESC" : val)),
      /** Groups sorting column */
      sort: z
        .string()
        .refine(
          (val) =>
            Object.keys(Group.getAttributes()).includes(val) ||
            val === "source",
          {
            error: "Invalid sort parameter",
          }
        )
        .prefault("updatedAt"),

      /**
       * Only list groups where this user is a member.
       * @deprecated use `filters` with field `userId` instead.
       */
      userId: z.uuid().optional(),

      /**
       * Find group matching externalId.
       * @deprecated use `filters` with field `externalId` instead.
       */
      externalId: z.string().optional(),

      /**
       * Find group with matching name.
       * @deprecated use `filters` with field `name` instead.
       */
      name: z.string().optional(),

      /**
       * Filter groups by source: "manual" for non-synced, or a provider name.
       * @deprecated use `filters` with field `source` instead.
       */
      source: z.string().optional(),

      /** Search term matched against group name */
      query: z.string().optional(),

      /**
       * List of filter expressions. Implicit AND between top-level entries.
       *
       * The `source` field accepts a provider name, or "manual" for groups
       * that are not synced from any provider.
       */
      filters: groupListFilter.FilterListSchema.optional(),
    }),
  })
  .refine(
    (req) =>
      req.body.filters === undefined ||
      (req.body.userId === undefined &&
        req.body.externalId === undefined &&
        req.body.name === undefined &&
        req.body.source === undefined),
    {
      message:
        "filters cannot be combined with deprecated parameters userId, externalId, name, or source",
    }
  );

export type GroupsListReq = z.infer<typeof GroupsListSchema>;

export const GroupsInfoSchema = z.object({
  body: z.object({
    /** Group Id */
    id: z.uuid().optional(),
    /** External source. */
    externalId: z.string().optional(),
  }),
});

export type GroupsInfoReq = z.infer<typeof GroupsInfoSchema>;

export const GroupsCreateSchema = z.object({
  body: z.object({
    /** Group name */
    name: z.string().max(GroupValidation.maxNameLength),
    /** Group description */
    description: z
      .string()
      .max(GroupValidation.maxDescriptionLength)
      .optional(),
    /** Optionally link this group to an external source. */
    externalId: z.string().optional(),
    /** Whether mentions are disabled for this group */
    disableMentions: z.boolean().optional().prefault(false),
  }),
});

export type GroupsCreateReq = z.infer<typeof GroupsCreateSchema>;

export const GroupsUpdateSchema = z.object({
  body: BaseIdSchema.extend({
    /** Group name */
    name: z.string().max(GroupValidation.maxNameLength).optional(),
    /** Group description */
    description: z
      .string()
      .max(GroupValidation.maxDescriptionLength)
      .optional(),
    /** Optionally link this group to an external source. */
    externalId: z.string().optional(),
    /** Whether mentions are disabled for this group */
    disableMentions: z.boolean().optional(),
  }),
});

export type GroupsUpdateReq = z.infer<typeof GroupsUpdateSchema>;

export const GroupsDeleteSchema = z.object({
  body: BaseIdSchema,
});

export type GroupsDeleteReq = z.infer<typeof GroupsDeleteSchema>;

export const GroupsDeleteAllSchema = z.object({
  body: z.object({
    /** The authentication provider whose synced groups should be deleted. */
    authenticationProviderId: z.uuid(),
  }),
});

export type GroupsDeleteAllReq = z.infer<typeof GroupsDeleteAllSchema>;

export const GroupsMembershipsSchema = z.object({
  body: BaseIdSchema.extend({
    /** Group name search query */
    query: z.string().optional(),
    /** Filter by group permission */
    permission: z.nativeEnum(GroupPermission).optional(),
  }),
});

export type GroupsMembershipsReq = z.infer<typeof GroupsMembershipsSchema>;

export const GroupsAddUserSchema = z.object({
  body: BaseIdSchema.extend({
    /** User Id */
    userId: z.uuid(),
    /** The permission of the user in the group */
    permission: z
      .enum(GroupPermission)
      .optional()
      .prefault(GroupPermission.Member),
  }),
});

export type GroupsAddUserReq = z.infer<typeof GroupsAddUserSchema>;

export const GroupsRemoveUserSchema = z.object({
  body: BaseIdSchema.extend({
    /** User Id */
    userId: z.uuid(),
  }),
});

export type GroupsRemoveUserReq = z.infer<typeof GroupsRemoveUserSchema>;

export const GroupsUpdateUserSchema = z.object({
  body: BaseIdSchema.extend({
    /** User Id */
    userId: z.uuid(),
    /** The permission of the user in the group */
    permission: z.enum(GroupPermission),
  }),
});

export type GroupsUpdateUserReq = z.infer<typeof GroupsUpdateUserSchema>;
