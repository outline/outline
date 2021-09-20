// @flow
import debug from "debug";
import {
  Attachment,
  AuthenticationProvider,
  Collection,
  Document,
  Group,
  Event,
  Team,
  NotificationSetting,
  User,
  UserAuthentication,
  Integration,
  SearchQuery,
} from "../models";
import { sequelize } from "../sequelize";

const log = debug("commands");

export default async function teamPermanentDeleter(team: Team) {
  if (!team.deletedAt) {
    throw new Error(
      `Cannot permanently delete ${team.id} team. Please delete it and try again.`
    );
  }

  log(`Permanently deleting team ${team.name} (${team.id})`);

  const teamId = team.id;
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
      async (attachments, options) => {
        log(
          `Deleting attachments ${options.offset} – ${
            options.offset + options.limit
          }…`
        );

        await Promise.all(
          attachments.map((attachment) => attachment.destroy({ transaction }))
        );
      }
    );

    // UserAuthentication
    await User.findAllInBatches(
      {
        attributes: ["id"],
        where: {
          teamId,
        },
        limit: 100,
        offset: 0,
      },
      async (users) => {
        const userIds = users.map((user) => user.id);

        await UserAuthentication.destroy({
          where: { userId: userIds },
          force: true,
          transaction,
        });
      }
    );

    await AuthenticationProvider.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await Event.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await Collection.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await Document.unscoped().destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await Group.unscoped().destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await Integration.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await SearchQuery.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await NotificationSetting.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await User.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await team.destroy({
      force: true,
      transaction,
    });

    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }
}
