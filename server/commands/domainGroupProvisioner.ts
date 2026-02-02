import { GroupPermission } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Group, GroupUser, User } from "@server/models";
import type { APIContext } from "@server/types";
import { parseEmail } from "@shared/utils/email";

/**
 * Ensures a group exists for the given email domain and adds the user to it.
 * This is used for automatic group creation based on email domains (e.g., Keycloak).
 *
 * @param ctx API context
 * @param user User to add to the group
 * @param email Email address to extract domain from
 * @returns The group that was found or created
 */
export default async function domainGroupProvisioner(
  ctx: APIContext,
  user: User,
  email: string
): Promise<Group | null> {
  const { domain } = parseEmail(email);

  if (!domain) {
    Logger.debug(
      "authentication",
      "No domain found in email, skipping group creation",
      { email }
    );
    return null;
  }

  const teamId = user.teamId;

  try {
    // Find or create group for this domain
    const [group] = await Group.findOrCreate({
      where: {
        teamId,
        name: domain,
      },
      defaults: {
        teamId,
        name: domain,
        description: `Automatically created group for users with @${domain} email domain`,
        createdById: user.id,
        externalId: `domain:${domain}`,
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
      "User added to domain group",
      {
        userId: user.id,
        email,
        domain,
        groupId: group.id,
        isNewGroup: groupUser.isNewRecord,
      }
    );

    return group;
  } catch (err) {
    Logger.error(
      "Failed to provision domain group",
      err instanceof Error ? err : new Error(String(err)),
      {
        userId: user.id,
        email,
        domain,
      }
    );
    return null;
  }
}
