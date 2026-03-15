import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import type { AuthenticationProvider } from "@server/models";
import { ExternalGroup, Group, GroupUser } from "@server/models";
import type { User, Team } from "@server/models";
import type { APIContext } from "@server/types";
import type { ExternalGroupData } from "@server/utils/GroupSyncProvider";

interface Props {
  /** The user whose group memberships are being synced. */
  user: User;
  /** The team the user belongs to. */
  team: Team;
  /** The authentication provider that reported these groups. */
  authenticationProvider: AuthenticationProvider;
  /** The groups reported by the external provider for this user. */
  externalGroups: ExternalGroupData[];
}

interface GroupSyncResult {
  /** Number of new internal groups created. */
  groupsCreated: number;
  /** Number of group memberships added. */
  membershipsAdded: number;
  /** Number of group memberships removed. */
  membershipsRemoved: number;
}

/**
 * Synchronizes a user's external group memberships with internal Outline
 * groups. Upserts ExternalGroup records, auto-creates Group records when
 * needed, and manages GroupUser memberships.
 *
 * @param ctx - API context with transaction.
 * @param props - sync parameters.
 * @returns result summary.
 */
async function groupsSyncer(
  ctx: APIContext,
  { user, team, authenticationProvider, externalGroups }: Props
): Promise<GroupSyncResult> {
  const { transaction } = ctx.state;
  const result: GroupSyncResult = {
    groupsCreated: 0,
    membershipsAdded: 0,
    membershipsRemoved: 0,
  };

  const now = new Date();
  const externalGroupIds = new Set<string>();

  for (const eg of externalGroups) {
    externalGroupIds.add(eg.id);

    // Upsert ExternalGroup record
    const [externalGroup, created] = await ExternalGroup.findOrCreate({
      where: {
        authenticationProviderId: authenticationProvider.id,
        externalId: eg.id,
      },
      defaults: {
        name: eg.name,
        teamId: team.id,
        lastSyncedAt: now,
      },
      transaction,
    });

    // Update name if changed, and always update lastSyncedAt
    if (!created) {
      const updates: Partial<{ name: string; lastSyncedAt: Date }> = {
        lastSyncedAt: now,
      };
      if (externalGroup.name !== eg.name) {
        updates.name = eg.name;

        // Also update the linked internal Group name
        if (externalGroup.groupId) {
          const group = await Group.findByPk(externalGroup.groupId, {
            transaction,
          });
          if (group) {
            await group.update({ name: eg.name }, { transaction });
          }
        }
      }
      await externalGroup.update(updates, { transaction });
    }

    // Auto-create internal Group if one doesn't exist yet
    if (!externalGroup.groupId) {
      const group = await Group.createWithCtx(ctx, {
        name: eg.name,
        teamId: team.id,
        createdById: user.id,
      });
      await externalGroup.update({ groupId: group.id }, { transaction });
      externalGroup.groupId = group.id;
      result.groupsCreated++;
    }

    // Add user to group if not already a member
    const [, membershipCreated] = await GroupUser.findOrCreateWithCtx(ctx, {
      where: { groupId: externalGroup.groupId!, userId: user.id },
      defaults: { createdById: user.id },
    });

    if (membershipCreated) {
      result.membershipsAdded++;
    }
  }

  // Remove user from synced groups they are no longer a member of.
  // Scope query to groups the user is actually a member of to avoid
  // touching unrelated external group records.
  const staleWhere: Record<string, unknown> = {
    authenticationProviderId: authenticationProvider.id,
    teamId: team.id,
    groupId: { [Op.ne]: null },
  };

  if (externalGroupIds.size > 0) {
    staleWhere.externalId = { [Op.notIn]: [...externalGroupIds] };
  }

  const staleExternalGroups = await ExternalGroup.findAll({
    where: staleWhere,
    include: [
      {
        model: Group,
        as: "group",
        required: true,
        include: [
          {
            model: GroupUser,
            as: "groupUsers",
            required: true,
            where: { userId: user.id },
          },
        ],
      },
    ],
    transaction,
  });

  for (const stale of staleExternalGroups) {
    const membership = stale.group?.groupUsers?.[0];
    if (membership) {
      await membership.destroyWithCtx(ctx);
      result.membershipsRemoved++;
    }
  }

  Logger.info(
    "commands",
    `Group sync completed for user ${user.id}: ${result.groupsCreated} groups created, ${result.membershipsAdded} added, ${result.membershipsRemoved} removed`
  );

  return result;
}

export default groupsSyncer;
