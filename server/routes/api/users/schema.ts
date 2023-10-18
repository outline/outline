import { z } from "zod";
import { NotificationEventType, UserPreference, UserRole } from "@shared/types";
import User from "@server/models/User";
import BaseSchema from "../BaseSchema";

const BaseIdSchema = z.object({
  id: z.string().uuid(),
});

export const UsersListSchema = z.object({
  body: z.object({
    /** Groups sorting direction */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    /** Groups sorting column */
    sort: z
      .string()
      .refine((val) => Object.keys(User.getAttributes()).includes(val), {
        message: "Invalid sort parameter",
      })
      .default("createdAt"),

    ids: z.array(z.string().uuid()).optional(),

    emails: z.array(z.string().email()).optional(),

    query: z.string().optional(),

    filter: z
      .enum([
        "invited",
        "viewers",
        "admins",
        "members",
        "active",
        "all",
        "suspended",
      ])
      .optional(),
  }),
});

export type UsersListReq = z.infer<typeof UsersListSchema>;

export const UsersNotificationsSubscribeSchema = z.object({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type UsersNotificationsSubscribeReq = z.infer<
  typeof UsersNotificationsSubscribeSchema
>;

export const UsersNotificationsUnsubscribeSchema = z.object({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type UsersNotificationsUnsubscribeReq = z.infer<
  typeof UsersNotificationsUnsubscribeSchema
>;

export const UsersUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid().optional(),
    name: z.string().optional(),
    avatarUrl: z.string().optional(),
    language: z.string().optional(),
    preferences: z.record(z.nativeEnum(UserPreference), z.boolean()).optional(),
  }),
});

export type UsersUpdateReq = z.infer<typeof UsersUpdateSchema>;

export const UsersDeleteSchema = BaseSchema.extend({
  body: z.object({
    code: z.string().optional(),
    id: z.string().uuid().optional(),
  }),
});

export type UsersDeleteSchemaReq = z.infer<typeof UsersDeleteSchema>;

export const UsersInfoSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid().optional(),
  }),
});

export type UsersInfoReq = z.infer<typeof UsersInfoSchema>;

export const UsersActivateSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type UsersActivateReq = z.infer<typeof UsersActivateSchema>;

export const UsersPromoteSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type UsersPromoteReq = z.infer<typeof UsersPromoteSchema>;

export const UsersDemoteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    to: z.nativeEnum(UserRole).default(UserRole.Member),
  }),
});

export type UsersDemoteReq = z.infer<typeof UsersDemoteSchema>;

export const UsersSuspendSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type UsersSuspendReq = z.infer<typeof UsersSuspendSchema>;

export const UsersResendInviteSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type UsersResendInviteReq = z.infer<typeof UsersResendInviteSchema>;

export const UsersInviteSchema = z.object({
  body: z.object({
    invites: z.array(
      z.object({
        email: z.string().email(),
        name: z.string(),
        role: z.nativeEnum(UserRole),
      })
    ),
  }),
});

export type UsersInviteReq = z.infer<typeof UsersInviteSchema>;
