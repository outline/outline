import {
  TeamPreference,
  TeamPreferences,
  UserPreference,
  UserPreferences,
} from "./types";

export const MAX_AVATAR_DISPLAY = 6;

export const TeamPreferenceDefaults: TeamPreferences = {
  [TeamPreference.SeamlessEdit]: true,
  [TeamPreference.ViewersCanExport]: true,
  [TeamPreference.PublicBranding]: false,
  [TeamPreference.Commenting]: true,
  [TeamPreference.CustomTheme]: undefined,
};

export const UserPreferenceDefaults: UserPreferences = {
  [UserPreference.RememberLastPath]: true,
  [UserPreference.UseCursorPointer]: true,
  [UserPreference.CodeBlockLineNumers]: true,
};
