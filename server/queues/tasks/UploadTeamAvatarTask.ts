import { AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import { Team, User } from "@server/models";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  /** The teamId to operate on */
  teamId: string;
  /** The original avatarUrl from the SSO provider */
  avatarUrl: string;
};

/**
 * A task that uploads the provided avatarUrl to S3 storage and updates the
 * team's record with the new url.
 */
export default class UploadTeamAvatarTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const team = await Team.findByPk(props.teamId, {
      rejectOnEmpty: true,
    });

    const user = await User.findOne({
      where: {
        teamId: team.id,
      },
    });

    if (!user) {
      return;
    }

    const attachment = await attachmentCreator({
      name: "avatar",
      url: props.avatarUrl,
      user,
      preset: AttachmentPreset.Avatar,
      ctx: createContext({ user }),
    });

    if (attachment) {
      await team.update({ avatarUrl: attachment.url });
    }
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
