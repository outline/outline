import { Attachment, Team } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  /** The teamId to operate on */
  teamId: string;
};

/**
 * A task that updates the team stats.
 */
export default class UpdateTeamAttachmentsSizeTask extends BaseTask<Props> {
  public async perform({ teamId }: Props) {
    const sizeInBytes = await Attachment.getTotalSizeForTeam(teamId);
    if (!sizeInBytes) {
      return;
    }

    await Team.update(
      { approximateTotalAttachmentsSize: sizeInBytes },
      { where: { id: teamId } }
    );
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
