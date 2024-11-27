import { Attachment, Team } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  /** The teamId to operate on */
  teamId: string;
};

/**
 * A task that updates the team stats.
 */
export default class UpdateTeamAttachmentsSizeTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const sizeInBytes = await Attachment.getTotalSizeForTeam(props.teamId);

    await sequelize.transaction(async (transaction) => {
      const team = await Team.findByPk(props.teamId, {
        rejectOnEmpty: true,
        lock: transaction.LOCK.UPDATE,
      });

      if (sizeInBytes) {
        await team.update(
          { approximateTotalAttachmentsSize: sizeInBytes },
          { transaction }
        );
      }
    });
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
