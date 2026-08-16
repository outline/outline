import { z } from "zod";
import { createFilterSchema } from "@shared/helpers/FilterHelper";
import {
  NotificationBadgeType,
  NotificationEventType,
  UserPreference,
  UserRole,
} from "@shared/types";
import { locales } from "@shared/utils/date";
import { UserStatusFilters } from "@server/models/helpers/Filters";
import User from "@server/models/User";
import { zodEnumFromObjectKeys, zodTimezone } from "@server/utils/zod";
import { BaseSchema } from "../schema";

const BaseIdSchema = z.object({
  id: z.uuid(),
});

const userFilterFields = {
  id: { kind: "uuid", operators: ["eq", "neq", "in", "notIn"] },
  name: "string",
  email: "string",
  // `role` is an enum column, so both the operators and the values it accepts
  // are constrained – a pattern match or an unknown role would error at the
  // database.
  role: {
    kind: "string",
    operators: ["eq", "neq", "in", "notIn"],
    values: Object.values(UserRole),
  },
  createdAt: "date",
  updatedAt: "date",
  lastActiveAt: "date",
  suspendedAt: "date",
} as const;

const usersListFilter = createFilterSchema(userFilterFields);

export const UsersListSchema = z
  .object({
    body: z.object({
      /** Users sorting direction */
      direction: z
        .string()
        .optional()
        .transform((val) => (val !== "ASC" ? "DESC" : val)),

      /** Users sorting column */
      sort: z
        .string()
        .refine((val) => Object.keys(User.getAttributes()).includes(val), {
          error: "Invalid sort parameter",
        })
        .prefault("createdAt"),

      /**
       * Ids of the users to return.
       * @deprecated use `filters` with field `id` instead.
       */
      ids: z.array(z.uuid()).optional(),

      /**
       * Email addresses of the users to return.
       * @deprecated use `filters` with field `email` instead.
       */
      emails: z
        .array(z.email().transform((email) => email.toLowerCase()))
        .optional(),

      /** Search term matched against user name and email */
      query: z.string().optional(),

      /**
       * The user's role.
       * @deprecated use `filters` with field `role` instead.
       */
      role: z.enum(UserRole).optional(),

      /**
       * Filter the users by their status.
       * @deprecated use `filters` with `role`, `lastActiveAt` and
       * `suspendedAt` instead.
       */
      filter: z.enum(UserStatusFilters).optional(),

      /**
       * List of filter expressions. Implicit AND between top-level entries.
       *
       * Suspended users are excluded unless the expression references
       * `suspendedAt`, and are never returned to non-admins.
       */
      filters: usersListFilter.FilterListSchema.optional(),
    }),
  })
  .refine(
    (req) =>
      req.body.filters === undefined ||
      (req.body.ids === undefined &&
        req.body.emails === undefined &&
        req.body.role === undefined &&
        req.body.filter === undefined),
    {
      message:
        "filters cannot be combined with deprecated parameters ids, emails, role, or filter",
    }
  );

export type UsersListReq = z.infer<typeof UsersListSchema>;

export const UsersNotificationsSubscribeSchema = z.object({
  body: z.object({
    eventType: z.enum(NotificationEventType).optional(),
  }),
});

export type UsersNotificationsSubscribeReq = z.infer<
  typeof UsersNotificationsSubscribeSchema
>;

export const UsersNotificationsUnsubscribeSchema = z.object({
  body: z.object({
    eventType: z.enum(NotificationEventType).optional(),
  }),
});

export type UsersNotificationsUnsubscribeReq = z.infer<
  typeof UsersNotificationsUnsubscribeSchema
>;

export const UsersUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid().optional(),
    name: z.string().optional(),
    avatarUrl: z.string().nullish(),
    language: zodEnumFromObjectKeys(locales).optional(),
    preferences: z
      .partialRecord(
        z.enum(UserPreference),
        z.union([z.boolean(), z.enum(NotificationBadgeType)])
      )
      .optional(),
    timezone: zodTimezone().optional(),
  }),
});

export type UsersUpdateReq = z.infer<typeof UsersUpdateSchema>;

export const UsersDeleteSchema = BaseSchema.extend({
  body: z.object({
    code: z.string().optional(),
    id: z.uuid().optional(),
  }),
});

export type UsersDeleteSchemaReq = z.infer<typeof UsersDeleteSchema>;

export const UsersUpdateEmailSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid().optional(),
    email: z.email(),
  }),
});

export type UsersUpdateEmailReq = z.infer<typeof UsersUpdateEmailSchema>;

export const UsersUpdateEmailConfirmSchema = BaseSchema.extend({
  query: z.object({
    code: z.string(),
    follow: z.string().prefault(""),
  }),
});

export type UsersUpdateEmailConfirmReq = z.infer<
  typeof UsersUpdateEmailConfirmSchema
>;

export const UsersInfoSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid().optional(),
  }),
});

export type UsersInfoReq = z.infer<typeof UsersInfoSchema>;

export const UsersActivateSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type UsersActivateReq = z.infer<typeof UsersActivateSchema>;

export const UsersChangeRoleSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    role: z.enum(UserRole),
  }),
});

export type UsersChangeRoleReq = z.infer<typeof UsersChangeRoleSchema>;

export const UsersPromoteSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type UsersPromoteReq = z.infer<typeof UsersPromoteSchema>;

export const UsersDemoteSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    to: z.enum(UserRole).prefault(UserRole.Member),
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
        email: z.email(),
        name: z.string(),
        role: z.enum(UserRole),
      })
    ),
    suppressEmail: z.boolean().optional(),
  }),
});

export type UsersInviteReq = z.infer<typeof UsersInviteSchema>;
