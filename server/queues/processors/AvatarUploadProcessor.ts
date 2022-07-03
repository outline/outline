import { v4 as uuidv4 } from "uuid";
import { sequelize } from "@server/database/sequelize";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Team, User } from "@server/models";
import { Event, TeamEvent, UserEvent } from "@server/types";
import { publicS3Endpoint, uploadToS3FromUrl } from "@server/utils/s3";
import BaseProcessor from "./BaseProcessor";

export default class AvatarUploadProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["users.create", "teams.create"];

  async perform(event: UserEvent | TeamEvent) {
    if (event.name === "users.create") {
      await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(event.userId, {
          rejectOnEmpty: true,
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const avatarUrl = await this.uploadAvatar(user);
        await user.update({ avatarUrl }, { transaction });
      });
    }

    if (event.name === "teams.create") {
      await sequelize.transaction(async (transaction) => {
        const team = await Team.findByPk(event.teamId, {
          rejectOnEmpty: true,
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const avatarUrl = await this.uploadAvatar(team);
        await team.update({ avatarUrl }, { transaction });
      });
    }
  }

  /**
   * Uploads the file specified in the avatarUrl field on the model to S3 and
   * returns the URL if successful.
   *
   * @param model A team or user model
   * @returns The uploaded avatar url or undefined
   */
  private async uploadAvatar(model: Team | User): Promise<string | undefined> {
    const endpoint = publicS3Endpoint();
    const { avatarUrl } = model;

    // These checks should no longer be neccessary since the avatarUrl is
    // provided by the SSO service, however they are left out of an abundance of
    // caution.
    if (
      avatarUrl &&
      !avatarUrl.startsWith("/api") &&
      !avatarUrl.startsWith(endpoint) &&
      !avatarUrl.startsWith(env.DEFAULT_AVATAR_HOST)
    ) {
      try {
        return await uploadToS3FromUrl(
          avatarUrl,
          `avatars/${model.id}/${uuidv4()}`,
          "public-read"
        );
      } catch (err) {
        Logger.error("Failed uploading avatar image to S3", err, {
          url: avatarUrl,
        });

        // re-throw so that the job retries in the event of an upload failure
        throw err;
      }
    }

    return;
  }
}
