import type { IntegrationType } from "@shared/types";
import { IntegrationService, AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import { Integration, User } from "@server/models";
import { BaseTask, TaskPriority } from "@server/queues/tasks/base/BaseTask";

const SupportedIntegrations = [
  IntegrationService.Linear,
  IntegrationService.Figma,
];

type Props = {
  /** The integrationId to operate on */
  integrationId: string;
  /** The original logoUrl from third-party service */
  logoUrl: string;
};

/**
 * A task that uploads the provided logoUrl to storage and updates the
 * associated integration record with the new url.
 */
export default class UploadIntegrationLogoTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const integration = await Integration.scope("withAuthentication").findByPk(
      props.integrationId
    );
    if (!integration || !SupportedIntegrations.includes(integration.service)) {
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

    if (!attachment) {
      return;
    }

    switch (integration.service) {
      case IntegrationService.Linear:
        (
          integration as Integration<IntegrationType.Embed>
        ).settings.linear!.workspace.logoUrl = attachment.url;
        break;
      case IntegrationService.Figma:
        (
          integration as Integration<IntegrationType.LinkedAccount>
        ).settings.figma!.account.avatarUrl = attachment.url;
        break;
      default:
        throw new Error(
          `Unsupported integration service: ${integration.service}`
        ); // This should never happen
    }

    integration.changed("settings", true);
    await integration.save();
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
