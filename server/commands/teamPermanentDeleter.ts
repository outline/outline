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

  // Attachments are destroyed as individual instances (rather than a bulk
  // delete) so the BeforeDestroy hook runs and removes the associated file from
  // storage. We cannot use findAllInBatches with an advancing offset here –
  // deleting a batch shifts the remaining rows backwards, so advancing the
  // offset would skip records and leave attachments that still reference the
  // team, causing a foreign key violation when the team itself is destroyed.
  // Instead we repeatedly fetch and delete the first batch until none remain.
  let attachments: Attachment[];
  do {
    attachments = await Attachment.findAll<Attachment>({
      where: {
        teamId,
      },
      limit: 100,
    });

    if (attachments.length > 0) {
      await sequelize.transaction(async (transaction) => {
        Logger.info("commands", `Deleting ${attachments.length} attachments…`);
        await Promise.all(
          attachments.map((attachment) =>
            attachment.destroy({
              transaction,
            })
          )
        );
      });
    }
  } while (attachments.length > 0);

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

export default traceFunction({
  spanName: "teamPermanentDeleter",
})(teamPermanentDeleter);
