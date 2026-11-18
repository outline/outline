import { differenceInMilliseconds } from "date-fns";
import { Op } from "sequelize";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { Document, Integration, Collection, Team } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import type {
  DocumentEvent,
  IntegrationEvent,
  RevisionEvent,
  Event,
} from "@server/types";
import fetch from "@server/utils/fetch";
import { sleep } from "@shared/utils/timers";
import env from "../env";
import { presentMessageAttachment } from "../presenters/messageAttachment";

export default class SlackProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "integrations.create",
  ];

  /**
   * Only queue document events when the team has a Slack post integration
   * subscribed to the event.
   *
   * @param event The event about to be queued.
   * @returns true if the event may need to be posted to Slack.
   */
  static async shouldQueue(event: Event): Promise<boolean> {
    if (event.name === "integrations.create") {
      return true;
    }

    const eventName =
      event.name === "revisions.create" ? "documents.update" : event.name;
    const integrations = await Integration.findEnabledByTeamIdAndService(
      event.teamId,
      IntegrationService.Slack
    );

    return integrations.some(
      (integration) =>
        integration.type === IntegrationType.Post &&
        !!integration.events?.includes(eventName)
    );
  }

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
      case "revisions.create":
        return this.documentUpdated(event);

      case "integrations.create":
        return this.integrationCreated(event);

      default:
    }
  }

  async integrationCreated(event: IntegrationEvent) {
    const integration = (await Integration.findOne({
      where: {
        id: event.modelId,
        service: IntegrationService.Slack,
        type: IntegrationType.Post,
      },
      include: [
        {
          model: Collection,
          required: true,
          as: "collection",
        },
      ],
    })) as Integration<IntegrationType.Post>;
    if (!integration) {
      return;
    }

    const collection = integration.collection;
    if (!collection) {
      return;
    }

    await fetch(integration.settings.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `👋 Hey there! When documents are published or updated in the *${collection.name}* collection on ${env.APP_NAME} they will be posted to this channel!`,
        attachments: [
          {
            color: collection.color,
            title: collection.name,
            title_link: `${env.URL}${collection.path}`,
            text: collection.description,
          },
        ],
      }),
    });
  }

  async documentUpdated(event: DocumentEvent | RevisionEvent) {
    // never send notifications when batch importing documents
    if (event.name === "documents.publish" && event.data?.source === "import") {
      return;
    }

    const document = await Document.findByPk(event.documentId);
    if (!document) {
      return;
    }

    // never send notifications for draft documents
    if (!document.publishedAt) {
      return;
    }

    // if the document was published less than a minute ago, don't send a
    // separate notification.
    if (
      event.name === "revisions.create" &&
      differenceInMilliseconds(document.updatedAt, document.publishedAt) <
        Minute.ms
    ) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: IntegrationService.Slack,
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

    // wait a few seconds to give the document summary chance to be generated
    await sleep(5000);

    const [latest, team] = await Promise.all([
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
    ]);
    if (!latest?.publishedAt || !team) {
      return;
    }

    let text = `${latest.updatedBy.name} updated "${latest.displayTitle}"`;

    if (event.name === "documents.publish") {
      text = `${latest.createdBy.name} published "${latest.displayTitle}"`;
    }

    await fetch(integration.settings.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        attachments: [
          presentMessageAttachment(latest, team, latest.collection),
        ],
      }),
    });
  }
}
