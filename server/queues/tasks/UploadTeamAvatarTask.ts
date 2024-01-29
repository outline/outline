import { v4 as uuidv4 } from "uuid";
import { Team } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import BaseTask, { TaskPriority } from "./BaseTask";

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

    const res = await FileStorage.storeFromUrl(
      props.avatarUrl,
      `${Buckets.avatars}/${team.id}/${uuidv4()}`,
      "public-read"
    );

    if (res?.url) {
      await team.update({ avatarUrl: res.url });
    }
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
