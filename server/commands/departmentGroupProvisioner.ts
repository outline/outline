import { GroupPermission } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Group, GroupUser, User } from "@server/models";
import type { APIContext } from "@server/types";

/**
 * Ensures a group exists for the given department and adds the user to it.
 * This is used for automatic group creation based on department from Keycloak/OIDC.
 *
 * @param ctx API context
 * @param user User to add to the group
 * @param department Department name from OIDC provider (e.g., Keycloak)
 * @returns The group that was found or created, or null if department is empty
 */
export default async function departmentGroupProvisioner(
  ctx: APIContext,
  user: User,
  department: string
): Promise<Group | null> {
  if (!department || typeof department !== "string" || !department.trim()) {
    Logger.debug(
      "authentication",
      "No department provided, skipping department group creation",
      { userId: user.id }
    );
    return null;
  }

  const teamId = user.teamId;
  const departmentName = department.trim();

  try {
    // Find or create group for this department
    const [group] = await Group.findOrCreate({
      where: {
        teamId,
        name: departmentName,
      },
      defaults: {
        teamId,
        name: departmentName,
        description: `Automatically created group for department: ${departmentName}`,
        createdById: user.id,
        externalId: `department:${departmentName}`,
      },
      transaction: ctx.state.transaction,
    });

    // Add user to the group if not already a member
    const [groupUser] = await GroupUser.findOrCreateWithCtx(
      ctx,
      {
        where: {
          groupId: group.id,
          userId: user.id,
        },
        defaults: {
          groupId: group.id,
          userId: user.id,
          permission: GroupPermission.Member,
          createdById: user.id,
        },
      },
      { name: "add_user" }
    );

    Logger.debug(
      "authentication",
      "User added to department group",
      {
        userId: user.id,
        department: departmentName,
        groupId: group.id,
        isNewGroup: groupUser.isNewRecord,
      }
    );

    return group;
  } catch (err) {
    Logger.error(
      "Failed to provision department group",
      err instanceof Error ? err : new Error(String(err)),
      {
        userId: user.id,
        department: departmentName,
      }
    );
    return null;
  }
}
