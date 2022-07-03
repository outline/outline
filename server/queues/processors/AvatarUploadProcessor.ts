import { v4 as uuidv4 } from "uuid";
import { sequelize } from "@server/database/sequelize";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { User } from "@server/models";
import { Event, UserEvent } from "@server/types";
import { publicS3Endpoint, uploadToS3FromUrl } from "@server/utils/s3";
import BaseProcessor from "./BaseProcessor";

export default class AvatarUploadProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["users.create"];

  async perform(event: UserEvent) {
    if (event.name !== "users.create") {
      return;
    }

    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(event.userId, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const { avatarUrl } = user;
      const endpoint = publicS3Endpoint();

      // These checks should no longer be neccessary since the avatarUrl is
      // provided by the SSO service, however they are left as an abundance of
      // caution.
      if (
        avatarUrl &&
        !avatarUrl.startsWith("/api") &&
        !avatarUrl.startsWith(endpoint) &&
        !avatarUrl.startsWith(env.DEFAULT_AVATAR_HOST)
      ) {
        try {
          const newUrl = await uploadToS3FromUrl(
            avatarUrl,
            `avatars/${user.id}/${uuidv4()}`,
            "public-read"
          );
          if (newUrl) {
            user.avatarUrl = newUrl;
          }
        } catch (err) {
          Logger.error("Failed uploading avatar image to S3", err, {
            url: avatarUrl,
          });

          // re-throw so that the job retries
          throw err;
        }

        await user.save({ transaction });
      }
    });
  }
}
