import { differenceInMilliseconds } from "date-fns";
import { Op } from "sequelize";
import { IntegrationService, IntegrationType, JSONObject } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { Collection, Document, Integration, Team } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import {
  DocumentEvent,
  Event,
  IntegrationEvent,
  RevisionEvent,
} from "@server/types";
import { sleep } from "@server/utils/timers";

export default abstract class IMIntegrationProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [];

  private service: IntegrationService;

  constructor(service: IntegrationService) {
    super();
    this.service = service;
  }

  public async perform(event: Event): Promise<void> {
    switch (event.name) {
      case "documents.publish":
      case "revisions.create":
        // wait a few seconds to give the document summary chance to be generated
        await sleep(5000);
        return this.documentUpdated(event);

      case "integrations.create":
        return this.integrationCreated(event);

      case "integrations.delete":
        return this.integrationDeleted(event);

      default:
    }
  }

  private async documentUpdated(
    event: DocumentEvent | RevisionEvent
  ): Promise<void> {
    // don't send notifications when batch importing documents.
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'data' does not exist on type 'DocumentEv... Remove this comment to see the full error message
    if (event.data && event.data.source === "import") {
      return;
    }

    const [document, team] = await Promise.all([
      Document.scope(["defaultScope", "withCollection"]).findOne({
        where: {
          id: event.documentId,
        },
      }),
      Team.findByPk(event.teamId),
    ]);
    if (!document || !team) {
      return;
    }

    // don't send notifications for draft documents.
    if (!document.publishedAt) {
      return;
    }

    // if the document was published less than a minute ago,
    // don't send a separate notification.
    if (
      event.name === "revisions.create" &&
      differenceInMilliseconds(document.updatedAt, document.publishedAt) <
        Minute
    ) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: this.service,
        type: IntegrationType.Post,
        events: {
          [Op.contains]: [
            event.name === "revisions.create" ? "documents.update" : event.name,
          ],
        },
      },
    })) as Integration<IntegrationType.Post>;
    if (!integration) {
      return;
    }

    let text = `${document.updatedBy.name} updated "${document.title}"`;

    if (event.name === "documents.publish") {
      text = `${document.createdBy.name} published "${document.title}"`;
    }

    await fetch(integration.settings.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        attachments: this.buildMessageAttachments({
          document,
          team,
          collection: document.collection,
        }),
      }),
    });
  }

  protected abstract integrationCreated(event: IntegrationEvent): Promise<void>;

  protected abstract integrationDeleted(event: IntegrationEvent): Promise<void>;

  protected abstract buildMessageAttachments({
    document,
    team,
    collection,
  }: {
    document: Document;
    team: Team;
    collection?: Collection | null;
  }): Array<JSONObject>;
}
