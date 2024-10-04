import { z } from "zod";
import { Group } from "@server/models";

const BaseIdSchema = z.object({
  /** Group Id */
  id: z.string().uuid(),
});

export const GroupsListSchema = z.object({
  body: z.object({
    /** Groups sorting direction */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    /** Groups sorting column */
    sort: z
      .string()
      .refine((val) => Object.keys(Group.getAttributes()).includes(val), {
        message: "Invalid sort parameter",
      })
      .default("updatedAt"),

    /** Only list groups where this user is a member */
    userId: z.string().uuid().optional(),

    /** @deprecated Find group with matching name */
    name: z.string().optional(),

    /** Find group matching query */
    query: z.string().optional(),
  }),
});

export type GroupsListReq = z.infer<typeof GroupsListSchema>;

export const GroupsInfoSchema = z.object({
  body: BaseIdSchema,
});

export type GroupsInfoReq = z.infer<typeof GroupsInfoSchema>;

export const GroupsCreateSchema = z.object({
  body: z.object({
    /** Group name */
    name: z.string(),
  }),
});

export type GroupsCreateReq = z.infer<typeof GroupsCreateSchema>;

export const GroupsUpdateSchema = z.object({
  body: BaseIdSchema.extend({
    /** Group name */
    name: z.string(),
  }),
});

export type GroupsUpdateReq = z.infer<typeof GroupsUpdateSchema>;

export const GroupsDeleteSchema = z.object({
  body: BaseIdSchema,
});

export type GroupsDeleteReq = z.infer<typeof GroupsDeleteSchema>;

export const GroupsMembershipsSchema = z.object({
  body: BaseIdSchema.extend({
    /** Group name search query */
    query: z.string().optional(),
  }),
});

export type GroupsMembershipsReq = z.infer<typeof GroupsMembershipsSchema>;

export const GroupsAddUserSchema = z.object({
  body: BaseIdSchema.extend({
    /** User Id */
    userId: z.string().uuid(),
  }),
});

export type GroupsAddUserReq = z.infer<typeof GroupsAddUserSchema>;

export const GroupsRemoveUserSchema = z.object({
  body: BaseIdSchema.extend({
    /** User Id */
    userId: z.string().uuid(),
  }),
});

export type GroupsRemoveUserReq = z.infer<typeof GroupsRemoveUserSchema>;
