import Logger from "@server/logging/Logger";
import { traceFunction } from "@server/logging/tracing";
import {
  ApiKey,
  Attachment,
  AuthenticationProvider,
  Collection,
  Document,
  Event,
  FileOperation,
  Group,
  Team,
  User,
  UserAuthentication,
  Integration,
  IntegrationAuthentication,
  SearchQuery,
  Share,
} from "@server/models";
import { sequelize } from "@server/storage/database";

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

  Logger.info(
    "commands",
    `Permanently destroying team ${team.name} (${team.id})`
  );
  const teamId = team.id;

  await Attachment.findAllInBatches<Attachment>(
    {
      where: {
        teamId,
      },
      batchLimit: 100,
    },
    async (attachments, options) => {
      await sequelize.transaction(async (transaction) => {
        Logger.info(
          "commands",
          `Deleting attachments ${options.offset} – ${
            (options.offset || 0) + (options?.limit || 0)
          }…`
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
        await Attachment.destroy({
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
            actorId: userIds,
          },
          force: true,
          transaction,
        });
      });
    }
  );

  // Destory team-relation models
  await sequelize.transaction(async (transaction) => {
    await AuthenticationProvider.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    // events must be first due to db constraints
    await Event.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await Collection.destroy({
      where: {
        teamId,
      },
      force: true,
      transaction,
    });
    await Document.unscoped().destroy({
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

export default traceFunction({
  spanName: "teamPermanentDeleter",
})(teamPermanentDeleter);
