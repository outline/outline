import type { IntegrationType } from "@shared/types";
import { IntegrationService, AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import { Integration, User } from "@server/models";
import { BaseTask, TaskPriority } from "@server/queues/tasks/base/BaseTask";

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

    const user = await User.findByPk(integration.userId);
    if (!user) {
      return;
    }

    const attachment = await attachmentCreator({
      name: "logo",
      url: props.logoUrl,
      user,
      preset: AttachmentPreset.Avatar,
      ctx: createContext({ user }),
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${integration.authentication.token}`,
        },
      },
    });

    if (attachment) {
      integration.settings.linear!.workspace.logoUrl = attachment.url;
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
