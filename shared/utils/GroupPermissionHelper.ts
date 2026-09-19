import { type TFunction } from "i18next";
import { GroupPermission } from "../types";

export class GroupPermissionHelper {
  /**
   * Get the display name for a group permission.
   *
   * @param permission The permission to get the display name for
   * @param t The translation function
   * @returns The display name for the permission
   */
  static displayName(permission: GroupPermission, t: TFunction): string {
    switch (permission) {
      case GroupPermission.Admin:
        return t("Group admin");
      case GroupPermission.Member:
        return t("Member");
      default: {
        const exhaustive: never = permission;
        return exhaustive;
      }
    }
  }

  /**
   * List of all group permissions, in order from lowest to highest.
   */
  static permissions = [GroupPermission.Member, GroupPermission.Admin];
}
