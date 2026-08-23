import { UserRole } from "@shared/types";
import type { locales } from "@shared/utils/date";

/**
 * Maps a Pet Store role to the closest Outline role used by Catatan.
 *
 * @param role the Pet Store role returned by the API.
 * @returns the role understood by the Outline models.
 */
export function mapPetStoreRole(role: string): UserRole {
  if (role === "owner" || role === "manager") {
    return UserRole.Admin;
  }
  return UserRole.Member;
}

/**
 * Maps a Pet Store locale to a locale supported by the Outline frontend.
 *
 * @param language the locale returned by the API.
 * @returns a supported Outline locale.
 */
export function mapPetStoreLanguage(language: string): keyof typeof locales {
  if (language === "id_ID") {
    return "id_ID";
  }
  return "en_US";
}
