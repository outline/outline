import { IntegrationService, JSONObject } from "@shared/types";
import { MattermostIntegrationSettings } from "@shared/zod";
import IMIntegrationProcessor, {
  IntegrationDataProps,
  MessageAttachmentProps,
} from "@server/queues/processors/IMIntegrationProcessor";
import { Event, DeleteIntegrationWebhook } from "@server/types";
import { encrypt } from "@server/utils/crypto";
import { MattermostApi } from "../mattermost/api";
import { presentMessageAttachment } from "../presenters/messageAttachment";

export class MattermostProcessor extends IMIntegrationProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "integrations.create",
    "integrations.delete",
  ];

  constructor() {
    super(IntegrationService.Mattermost);
  }

  protected getMessageAttachments(
    props: MessageAttachmentProps
  ): Array<JSONObject> {
    return [presentMessageAttachment(props)];
  }

  protected getDeleteWebhookTaskProps({
    accountIntegration,
    postIntegration,
    authentication,
  }: IntegrationDataProps): DeleteIntegrationWebhook | undefined {
    const webhookId = postIntegration.settings.id;

    if (!webhookId) {
      return;
    }

    const accountIntegrationSettings =
      accountIntegration.settings as MattermostIntegrationSettings;

    const url = `${accountIntegrationSettings.url}${MattermostApi.DeleteWebhook(
      webhookId
    )}`;

    return {
      method: "DELETE",
      url: encrypt(url),
      apiKey: encrypt(authentication.token),
    };
  }
}
