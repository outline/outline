import { v4 as uuidv4 } from "uuid";
import { sequelize } from "@server/database/sequelize";
import { User } from "@server/models";
import { uploadToS3FromUrl } from "@server/utils/s3";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  userId: string;
};

export default class UploadUserAvatarTask extends BaseTask<Props> {
  public async perform(props: Props) {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(props.userId, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (user.avatarUrl) {
        const avatarUrl = await uploadToS3FromUrl(
          user.avatarUrl,
          `avatars/${user.id}/${uuidv4()}`,
          "public-read"
        );

        if (avatarUrl) {
          await user.update({ avatarUrl }, { transaction });
        }
      }
    });
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
