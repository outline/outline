import { IntegrationService, JSONObject } from "@shared/types";
import { Collection, Document, Team } from "@server/models";
import IMIntegrationProcessor from "@server/queues/processors/IMIntegrationProcessor";
import { IntegrationEvent, Event } from "@server/types";
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

  protected integrationCreated(event: IntegrationEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected integrationDeleted(event: IntegrationEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected buildMessageAttachments(props: {
    document: Document;
    team: Team;
    collection?: Collection | null;
  }): Array<JSONObject> {
    return [presentMessageAttachment(props)];
  }
}
