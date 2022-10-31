import { Attachment } from "@server/models";
import BaseTask from "./BaseTask";

type Props = {
  attachmentId: string;
};

export default class DeleteAttachmentTask extends BaseTask<Props> {
  public async perform({ attachmentId }: Props) {
    const attachment = await Attachment.findByPk(attachmentId);
    if (!attachment) {
      return;
    }

    await attachment.destroy();
  }
}
