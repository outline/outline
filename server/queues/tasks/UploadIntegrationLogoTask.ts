import { cloneDeep, set } from "es-toolkit/compat";
import { AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import { Integration, User } from "@server/models";
import { BaseTask, TaskPriority } from "@server/queues/tasks/base/BaseTask";

type Props = {
  /** The integrationId to operate on */
  integrationId: string;
  /** The original logoUrl from third-party service */
  logoUrl: string;
  /** The path in the integration settings to store the uploaded url at */
  settingsPath: string[];
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
    if (!integration) {
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

    integration.settings = set(
      cloneDeep(integration.settings ?? {}),
      props.settingsPath,
      attachment.url
    );
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
