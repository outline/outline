import type { WhereOptions } from "sequelize";
import Logger from "@server/logging/Logger";
import { traceFunction } from "@server/logging/tracing";
import type { Team } from "@server/models";
import {
  ApiKey,
  Attachment,
  AuthenticationProvider,
  Collection,
  Document,
  Event,
  FileOperation,
  Group,
  Import,
  User,
  UserAuthentication,
  Integration,
  IntegrationAuthentication,
  SearchQuery,
  Share,
} from "@server/models";
import type Model from "@server/models/base/Model";
import { sequelize } from "@server/storage/database";
import { MutexLock } from "@server/utils/MutexLock";
import { Minute } from "@shared/utils/time";

/**
 * Permanently deletes a team and all related data from the database. Note that this does not happen
 * in a single transaction due to the potential size of such a transaction, so it is possible for
 * the operation to be interrupted and leave partial data. In which case it can be safely re-run.
 *
 * @param team - The team to delete.
 */
async function teamPermanentDeleter(team: Team) {
  if (!team.deletedAt) {
    throw new Error(
      `Cannot permanently delete ${team.id} team. Please delete it and try again.`
    );
  }

  const teamId = team.id;

  // A non-blocking lock so that concurrent runs for the same team skip rather
  // than repeat the batched deletes below.
  const ran = await MutexLock.tryUsing(
    `teamPermanentDeleter:${teamId}`,
    5 * Minute.ms,
    async () => {
      await destroyTeamData(team);
      return true;
    }
  );
  if (!ran) {
    Logger.info(
      "commands",
      `Team ${teamId} is already being destroyed, skipping`
    );
  }
}

async function destroyTeamData(team: Team) {
  const teamId = team.id;
  Logger.info(
    "commands",
    `Permanently destroying team ${team.name} (${teamId})`
  );

  // Attachments are destroyed as individual instances (rather than a bulk
  // delete) so the BeforeDestroy hook runs and removes the associated file from
  // storage.
  await Attachment.findAllInBatches<Attachment>(
    {
      where: {
        teamId,
      },
      batchLimit: 100,
    },
    async (attachments) => {
      if (attachments.length > 0) {
        await sequelize.transaction(async (transaction) => {
          Logger.info(
            "commands",
            `Deleting ${attachments.length} attachments…`
          );
          await Promise.all(
            attachments.map((attachment) =>
              attachment.destroy({
                transaction,
              })
            )
          );
        });
      }
    }
  );

  // Destroy user-relation models
  await User.findAllInBatches<User>(
    {
      attributes: ["id"],
      where: {
        teamId,
      },
      batchLimit: 100,
    },
    async (users) => {
      await sequelize.transaction(async (transaction) => {
        const userIds = users.map((user) => user.id);
        await UserAuthentication.destroy({
          where: {
            userId: userIds,
          },
          force: true,
          transaction,
        });
        await ApiKey.destroy({
          where: {
            userId: userIds,
          },
          force: true,
          transaction,
        });
        await Event.destroy({
          where: {
            teamId,
            actorId: userIds,
          },
          force: true,
          transaction,
        });
      });
    }
  );

  // The largest tables are destroyed in batches outside of a transaction so
  // that row locks are held briefly, rather than for the whole deletion.
  // events must be first due to db constraints
  await destroyInBatches(Event, { teamId });
  await destroyInBatches(Collection, { teamId });
  await destroyInBatches(Document.unscoped(), { teamId });

  // Destory team-relation models
  await sequelize.transaction(async (transaction) => {
    await AuthenticationProvider.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await FileOperation.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await Group.unscoped().destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await Import.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await Integration.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await IntegrationAuthentication.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await SearchQuery.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await Share.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await team.destroy({
      force: true,
      transaction,
    });
    await Event.create(
      {
        name: "teams.destroy",
        modelId: teamId,
      },
      {
        transaction,
      }
    );
  });
}

interface BatchDestroyable {
  findAllInBatches: typeof Model.findAllInBatches;
  destroy(options: {
    where: { id: string[] };
    force: boolean;
  }): Promise<number>;
}

/**
 * Permanently deletes every row of a model matching the where clause, in
 * batches of ids so that each statement is short and locks few rows.
 */
async function destroyInBatches(
  model: BatchDestroyable,
  where: WhereOptions
): Promise<void> {
  await model.findAllInBatches<Model & { id: string }>(
    {
      attributes: ["id"],
      where,
      batchLimit: 1000,
      paranoid: false,
    },
    async (rows) => {
      if (rows.length === 0) {
        return;
      }
      await model.destroy({
        where: {
          id: rows.map((row) => row.id),
        },
        force: true,
      });
    }
  );
}

export default traceFunction({
  spanName: "teamPermanentDeleter",
})(teamPermanentDeleter);
