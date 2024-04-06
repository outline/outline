import { UserRole } from "../types";

interface User {
  role: UserRole;
}

export class UserRoleHelper {
  static isRoleHigher(role: UserRole, otherRole: UserRole): boolean {
    return this.roles.indexOf(role) > this.roles.indexOf(otherRole);
  }

  static isRoleLower(role: UserRole, otherRole: UserRole): boolean {
    return this.roles.indexOf(role) < this.roles.indexOf(otherRole);
  }

  static canPromote(user: User, role: UserRole): boolean {
    return this.isRoleHigher(role, user.role);
  }

  static canDemote(user: User, role: UserRole): boolean {
    return this.isRoleLower(role, user.role);
  }

  /**
   * List of all roles in order from lowest to highest.
   */
  private static roles = [
    UserRole.Guest,
    UserRole.Viewer,
    UserRole.Member,
    UserRole.Admin,
  ];
}
