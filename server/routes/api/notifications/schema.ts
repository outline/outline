import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { NotificationEventType } from "@shared/types";
import { BaseSchema } from "../schema";

export const NotificationSettingsCreateSchema = BaseSchema.extend({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type NotificationSettingsCreateReq = z.infer<
  typeof NotificationSettingsCreateSchema
>;

export const NotificationSettingsDeleteSchema = BaseSchema.extend({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type NotificationSettingsDeleteReq = z.infer<
  typeof NotificationSettingsDeleteSchema
>;

export const NotificationsUnsubscribeSchema = BaseSchema.extend({
  body: z.object({
    userId: z.string().uuid().optional(),
    token: z.string().optional(),
    eventType: z.nativeEnum(NotificationEventType).optional(),
  }),
  query: z.object({
    userId: z.string().uuid().optional(),
    token: z.string().optional(),
    eventType: z.nativeEnum(NotificationEventType).optional(),
  }),
}).refine((req) => !(isEmpty(req.body.userId) && isEmpty(req.query.userId)), {
  message: "userId is required",
});

export type NotificationsUnsubscribeReq = z.infer<
  typeof NotificationsUnsubscribeSchema
>;

export const NotificationsListSchema = BaseSchema.extend({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType).nullish(),
    archived: z.boolean().nullish(),
  }),
});

export type NotificationsListReq = z.infer<typeof NotificationsListSchema>;

export const NotificationsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    viewedAt: z.coerce.date().nullish(),
    archivedAt: z.coerce.date().nullish(),
  }),
});

export type NotificationsUpdateReq = z.infer<typeof NotificationsUpdateSchema>;

export const NotificationsUpdateAllSchema = BaseSchema.extend({
  body: z.object({
    viewedAt: z.coerce.date().nullish(),
    archivedAt: z.coerce.date().nullish(),
  }),
});

export type NotificationsUpdateAllReq = z.infer<
  typeof NotificationsUpdateAllSchema
>;

export const NotificationsPixelSchema = BaseSchema.extend({
  query: z.object({
    id: z.string().uuid(),
    token: z.string(),
  }),
});

export type NotificationsPixelReq = z.infer<typeof NotificationsPixelSchema>;
