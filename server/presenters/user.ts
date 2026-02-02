import {
  NotificationSettings,
  TeamPreference,
} from "@shared/types";
import type {
  UserPreferences,
  UserRole,
  UserProfile,
} from "@shared/types";
import { parseEmail } from "@shared/utils/email";
import env from "@server/env";
import type { User, Team } from "@server/models";

type Options = {
  includeDetails?: boolean;
  includeEmail?: boolean;
  team?: Team;
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
  redirectUrl?: string;
  domainCrmUrl?: string;
  profile?: UserProfile | null;
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
    userData.preferences = user.preferences;
    userData.notificationSettings = user.notificationSettings;
    userData.profile = user.profile;
  }

  if (options.includeEmail) {
    userData.email = user.email;
  }

  const team = user.team || options.team;
  if (team) {
    const email = user.email;
    if (email) {
      let domain: string | undefined;
      try {
        domain = parseEmail(email).domain;
      } catch (_err) {
        domain = undefined;
      }
      const redirectByDomain = team.getPreference(
        TeamPreference.MemberRedirectURLByDomain
      ) as Record<string, string> | undefined;
      const crmByDomain = team.getPreference(
        TeamPreference.DomainCRMURLByDomain
      ) as Record<string, string> | undefined;
      const redirectTemplate = domain ? redirectByDomain?.[domain] : undefined;
      const crmTemplate = domain ? crmByDomain?.[domain] : undefined;

      if (redirectTemplate) {
        userData.redirectUrl = redirectTemplate.replace(
          "{email}",
          encodeURIComponent(email)
        );
      }

      if (crmTemplate) {
        userData.domainCrmUrl = crmTemplate.replace(
          "{email}",
          encodeURIComponent(email)
        );
      }
    }
  }

  return userData;
}
