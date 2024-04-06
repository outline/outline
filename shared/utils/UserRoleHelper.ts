import { UserRole } from "../types";

interface User {
  role: UserRole;
}

export class UserRoleHelper {
  /**
   * Check if the first role is higher than the second role.
   *
   * @param role The role to check
   * @param otherRole The role to compare against
   * @returns `true` if the first role is higher than the second role, `false` otherwise
   */
  static isRoleHigher(role: UserRole, otherRole: UserRole): boolean {
    return this.roles.indexOf(role) > this.roles.indexOf(otherRole);
  }

  /**
   * Check if the first role is lower than the second role.
   *
   * @param role The role to check
   * @param otherRole The role to compare against
   * @returns `true` if the first role is lower than the second role, `false` otherwise
   */
  static isRoleLower(role: UserRole, otherRole: UserRole): boolean {
    return this.roles.indexOf(role) < this.roles.indexOf(otherRole);
  }

  /**
   * Check if the users role is lower than the given role. This does not authorize the operation.
   *
   * @param user The user to check
   * @param role The role to compare against
   * @returns `true` if the users role is lower than the given role, `false` otherwise
   */
  static canPromote(user: User, role: UserRole): boolean {
    return this.isRoleHigher(role, user.role);
  }

  /**
   * Check if the users role is higher than the given role. This does not authorize the operation.
   *
   * @param user The user to check
   * @param role The role to compare against
   * @returns `true` if the users role is higher than the given role, `false` otherwise
   */
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
