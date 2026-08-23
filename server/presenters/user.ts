import { pick } from "es-toolkit";
import type {
  NotificationSettings,
  UserPreferences,
  UserRole,
} from "@shared/types";
import { NotificationEventType, UserPreference } from "@shared/types";
import env from "@server/env";
import type { User } from "@server/models";

type Options = {
  includeDetails?: boolean;
  includeEmail?: boolean;
};

type UserPresentation = {
  id: string;
  name: string;
  avatarUrl: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lastActiveAt: Date | null;
  color: string;
  role: UserRole;
  isSuspended: boolean;
  email?: string | null;
  language?: string;
  preferences?: UserPreferences | null;
  notificationSettings?: NotificationSettings;
  timezone?: string | null;
  invitedBy?: UserPresentation;
};

export default function presentUser(
  user: User,
  options: Options = {}
): UserPresentation {
  const userData: UserPresentation = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    color: user.color,
    role: user.role,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    lastActiveAt: user.lastActiveAt,
    timezone: user.timezone,
  };

  if (options.includeDetails) {
    userData.email = user.email;
    userData.language = user.language || env.DEFAULT_LANGUAGE;
    // Unrecognized keys are omitted so that clients can safely send the object back.
    userData.preferences = user.preferences
      ? pick(user.preferences, Object.values(UserPreference))
      : user.preferences;
    userData.notificationSettings = user.notificationSettings
      ? pick(user.notificationSettings, Object.values(NotificationEventType))
      : user.notificationSettings;
  }

  if (options.includeEmail) {
    userData.email = user.email;
  }

  // Only included when the association has been eager-loaded by the caller.
  if (user.invitedBy) {
    userData.invitedBy = presentUser(user.invitedBy);
  }

  return userData;
}
