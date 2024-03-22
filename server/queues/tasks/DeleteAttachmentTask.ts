import { Attachment } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  teamId: string;
  attachmentId: string;
};

export default class DeleteAttachmentTask extends BaseTask<Props> {
  public async perform({ attachmentId, teamId }: Props) {
    const attachment = await Attachment.findOne({
      where: {
        teamId,
        id: attachmentId,
      },
    });

    if (!attachment) {
      return;
    }

    await attachment.destroy();
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
