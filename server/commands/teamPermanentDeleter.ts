import Logger from "../logging/logger";
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
  NotificationSetting,
  User,
  UserAuthentication,
  Integration,
  IntegrationAuthentication,
  SearchQuery,
  Share,
} from "../models";
import { sequelize } from "../sequelize";

// @ts-expect-error ts-migrate(2749) FIXME: 'Team' refers to a value, but is being used as a t... Remove this comment to see the full error message
export default async function teamPermanentDeleter(team: Team) {
  if (!team.deletedAt) {
    throw new Error(
      `Cannot permanently delete ${team.id} team. Please delete it and try again.`
    );
  }

  Logger.info(
    "commands",
    `Permanently deleting team ${team.name} (${team.id})`
  );
  const teamId = team.id;
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'transaction' implicitly has type 'any' i... Remove this comment to see the full error message
  let transaction;

  try {
    transaction = await sequelize.transaction();
    await Attachment.findAllInBatches(
      {
        where: {
          teamId,
        },
        limit: 100,
        offset: 0,
      },
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'attachments' implicitly has an 'any' ty... Remove this comment to see the full error message
      async (attachments, options) => {
        Logger.info(
          "commands",
          `Deleting attachments ${options.offset} – ${
            options.offset + options.limit
          }…`
        );
        await Promise.all(
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'attachment' implicitly has an 'any' typ... Remove this comment to see the full error message
          attachments.map((attachment) =>
            attachment.destroy({
              // @ts-expect-error ts-migrate(7005) FIXME: Variable 'transaction' implicitly has an 'any' typ... Remove this comment to see the full error message
              transaction,
            })
          )
        );
      }
    );
    // Destroy user-relation models
    await User.findAllInBatches(
      {
        attributes: ["id"],
        where: {
          teamId,
        },
        limit: 100,
        offset: 0,
      },
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'users' implicitly has an 'any' type.
      async (users) => {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
        const userIds = users.map((user) => user.id);
        await UserAuthentication.destroy({
          where: {
            userId: userIds,
          },
          force: true,
          // @ts-expect-error ts-migrate(7005) FIXME: Variable 'transaction' implicitly has an 'any' typ... Remove this comment to see the full error message
          transaction,
        });
        await ApiKey.destroy({
          where: {
            userId: userIds,
          },
          force: true,
          // @ts-expect-error ts-migrate(7005) FIXME: Variable 'transaction' implicitly has an 'any' typ... Remove this comment to see the full error message
          transaction,
        });
      }
    );
    // Destory team-relation models
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
    await NotificationSetting.destroy({
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
    await User.destroy({
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
    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }

    throw err;
  }
}
