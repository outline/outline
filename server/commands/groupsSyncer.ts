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

  // Remove user from synced groups they are no longer a member of
  if (externalGroupIds.size > 0) {
    const staleExternalGroups = await ExternalGroup.findAll({
      where: {
        authenticationProviderId: authenticationProvider.id,
        teamId: team.id,
        groupId: { [Op.ne]: null },
        externalId: { [Op.notIn]: [...externalGroupIds] },
      },
      transaction,
    });

    for (const stale of staleExternalGroups) {
      await stale.update({ lastSyncedAt: now }, { transaction });
      if (stale.groupId) {
        const existing = await GroupUser.findOne({
          where: { groupId: stale.groupId, userId: user.id },
          transaction,
        });
        if (existing) {
          await existing.destroyWithCtx(ctx);
          result.membershipsRemoved++;
        }
      }
    }
  } else {
    // User has no external groups — remove them from all synced groups
    const allExternalGroups = await ExternalGroup.findAll({
      where: {
        authenticationProviderId: authenticationProvider.id,
        teamId: team.id,
        groupId: { [Op.ne]: null },
      },
      transaction,
    });

    for (const eg of allExternalGroups) {
      await eg.update({ lastSyncedAt: now }, { transaction });
      if (eg.groupId) {
        const existing = await GroupUser.findOne({
          where: { groupId: eg.groupId, userId: user.id },
          transaction,
        });
        if (existing) {
          await existing.destroyWithCtx(ctx);
          result.membershipsRemoved++;
        }
      }
    }
  }

  Logger.info(
    "commands",
    `Group sync completed for user ${user.id}: ${result.groupsCreated} groups created, ${result.membershipsAdded} added, ${result.membershipsRemoved} removed`
  );

  return result;
}

export default groupsSyncer;
