import { v4 as uuidv4 } from "uuid";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import BaseTask, { TaskPriority } from "@server/queues/tasks/BaseTask";
import FileStorage from "@server/storage/files";

type Props = {
  /** The integrationId to operate on */
  integrationId: string;
  /** The original logoUrl from Linear */
  logoUrl: string;
};

/**
 * A task that uploads the provided logoUrl to storage and updates the
 * Linear integration record with the new url.
 */
export default class UploadLinearWorkspaceLogoTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const integration = await Integration.scope("withAuthentication").findByPk<
      Integration<IntegrationType.Embed>
    >(props.integrationId);
    if (!integration || integration.service !== IntegrationService.Linear) {
      return;
    }

    const res = await FileStorage.storeFromUrl(
      props.logoUrl,
      `${Buckets.avatars}/${integration.teamId}/${uuidv4()}`,
      "public-read",
      {
        headers: {
          Authorization: `Bearer ${integration.authentication.token}`,
        },
      }
    );

    if (res?.url) {
      integration.settings.linear!.workspace.logoUrl = res.url;
      integration.changed("settings", true);
      await integration.save();
    }
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
