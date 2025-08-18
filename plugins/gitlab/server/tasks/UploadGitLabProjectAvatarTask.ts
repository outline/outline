import { IntegrationType } from "@shared/types";
import BaseTask from "@server/queues/tasks/BaseTask";
import { Integration } from "@server/models";
import { FileOperation } from "@server/models";
import fetch from "node-fetch";

type Props = {
  integrationId: string;
  avatarUrl: string;
};

export default class UploadGitLabProjectAvatarTask extends BaseTask<Props> {
  public async perform({ integrationId, avatarUrl }: Props) {
    const integration = await Integration.findByPk(integrationId, {
      rejectOnEmpty: true,
    });

    try {
      const res = await fetch(avatarUrl);
      const buffer = await res.buffer();
      const name = avatarUrl.split("/").pop() || "avatar";
      const contentType = res.headers.get("content-type") || "image/png";

      const operation = await FileOperation.createFromBuffer({
        buffer,
        contentType,
        name,
        userId: integration.userId,
        teamId: integration.teamId,
        source: "gitlab",
      });

      await integration.update({
        settings: {
          ...integration.settings,
          gitlab: {
            ...(integration.settings as Integration<IntegrationType.Embed>)
              .gitlab,
            project: {
              ...(integration.settings as Integration<IntegrationType.Embed>)
                .gitlab?.project,
              avatar_url: operation.url,
            },
          },
        },
      });
    } catch (err) {
      // If the avatar upload fails, we don't need to fail the entire task
      // as it's not critical to the integration's functionality.
      // Just log the error and continue.
      this.logger.error(
        `Failed to upload GitLab project avatar: ${err.message}`
      );
    }
  }
}
