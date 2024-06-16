import {
  TOCPosition,
  TeamPreference,
  TeamPreferences,
  UserPreference,
  UserPreferences,
} from "./types";

export const MAX_AVATAR_DISPLAY = 6;

export const Pagination = {
  defaultLimit: 25,
  defaultOffset: 0,
  maxLimit: 100,
  sidebarLimit: 10,
};

export const TeamPreferenceDefaults: TeamPreferences = {
  [TeamPreference.SeamlessEdit]: true,
  [TeamPreference.ViewersCanExport]: true,
  [TeamPreference.MembersCanInvite]: false,
  [TeamPreference.MembersCanCreateApiKey]: true,
  [TeamPreference.PublicBranding]: false,
  [TeamPreference.Commenting]: true,
  [TeamPreference.CustomTheme]: undefined,
  [TeamPreference.TocPosition]: TOCPosition.Left,
};

export const UserPreferenceDefaults: UserPreferences = {
  [UserPreference.RememberLastPath]: true,
  [UserPreference.UseCursorPointer]: true,
  [UserPreference.CodeBlockLineNumers]: true,
};
