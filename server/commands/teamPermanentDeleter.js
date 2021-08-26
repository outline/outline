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
  User,
  Integration,
  SearchQuery,
} from "../models";
import { sequelize } from "../sequelize";

const log = debug("commands");

export async function teamPermanentDeleter(team: Team) {
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
        transaction,
      },
      async (attachments, options) => {
        log(
          `Deleting attachments ${options.offset} – ${
            options.offset + options.limit
          }…`
        );

        await Promise.all(
          attachments.map((attachment) => attachment.destroy())
        );
      }
    );

    await AuthenticationProvider.destroy({
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

    await Event.destroy({
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

    await User.destroy({
      where: { teamId },
      force: true,
      transaction,
    });

    await Team.destroy({
      where: { id: teamId },
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
