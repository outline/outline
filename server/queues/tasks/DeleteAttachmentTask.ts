import { Attachment } from "@server/models";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  teamId: string;
  attachmentId: string;
};

export default class DeleteAttachmentTask extends BaseTask<Props> {
  protected jobId({ attachmentId }: Props) {
    return `delete-attachment:${attachmentId}`;
  }

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
