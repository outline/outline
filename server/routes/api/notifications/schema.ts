import { z } from "zod";
import { NotificationEventType } from "@shared/types";

export const NotificationSettingsCreateSchema = z.object({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type NotificationSettingsCreateReq = z.infer<
  typeof NotificationSettingsCreateSchema
>;

export const NotificationSettingsDeleteSchema = z.object({
  body: z.object({
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type NotificationSettingsDeleteReq = z.infer<
  typeof NotificationSettingsDeleteSchema
>;

export const NotificationsUnsubscribeSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    token: z.string(),
    eventType: z.nativeEnum(NotificationEventType),
  }),
  query: z.object({
    userId: z.string().uuid(),
    token: z.string(),
    eventType: z.nativeEnum(NotificationEventType),
  }),
});

export type NotificationsUnsubscribeReq = z.infer<
  typeof NotificationsUnsubscribeSchema
>;
