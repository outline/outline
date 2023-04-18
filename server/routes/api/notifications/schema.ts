import { isEmpty } from "lodash";
import { z } from "zod";
import { NotificationEventType } from "@shared/types";
import BaseSchema from "../BaseSchema";

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
    eventType: z.nativeEnum(NotificationEventType).optional(),
  }),
  query: z.object({
    eventType: z.nativeEnum(NotificationEventType).optional(),
  }),
});

export type NotificationsListReq = z.infer<typeof NotificationsListSchema>;
