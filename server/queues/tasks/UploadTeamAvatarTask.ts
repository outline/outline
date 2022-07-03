import { v4 as uuidv4 } from "uuid";
import { sequelize } from "@server/database/sequelize";
import { Team } from "@server/models";
import { uploadToS3FromUrl } from "@server/utils/s3";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  teamId: string;
};

export default class UploadTeamAvatarTask extends BaseTask<Props> {
  public async perform(props: Props) {
    await sequelize.transaction(async (transaction) => {
      const team = await Team.findByPk(props.teamId, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (team.avatarUrl) {
        const avatarUrl = await uploadToS3FromUrl(
          team.avatarUrl,
          `avatars/${team.id}/${uuidv4()}`,
          "public-read"
        );

        if (avatarUrl) {
          await team.update({ avatarUrl }, { transaction });
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
