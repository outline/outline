import { z } from "zod";
import { NotificationEventType, UserPreference } from "@shared/types";
import BaseSchema from "../BaseSchema";

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
