import { NotificationSettings, UserPreferences, UserRole } from "@shared/types";
import env from "@server/env";
import { User } from "@server/models";

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
  lastActiveAt: Date | null;
  color: string;
  role: UserRole;
  isSuspended: boolean;
  email?: string | null;
  language?: string;
  preferences?: UserPreferences | null;
  notificationSettings?: NotificationSettings;
  timezone?: string | null;
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
    lastActiveAt: user.lastActiveAt,
    timezone: user.timezone,
  };

  if (options.includeDetails) {
    userData.email = user.email;
    userData.language = user.language || env.DEFAULT_LANGUAGE;
    userData.preferences = user.preferences;
    userData.notificationSettings = user.notificationSettings;
  }

  if (options.includeEmail) {
    userData.email = user.email;
  }

  return userData;
}
