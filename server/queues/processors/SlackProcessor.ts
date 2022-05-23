import fetch from "fetch-with-proxy";
import { Op } from "sequelize";
import env from "@server/env";
import { Document, Integration, Collection, Team } from "@server/models";
import { presentSlackAttachment } from "@server/presenters";
import {
  DocumentEvent,
  IntegrationEvent,
  RevisionEvent,
  Event,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class SlackProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "integrations.create",
  ];

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
    const integration = await Integration.findOne({
      where: {
        id: event.modelId,
        service: "slack",
        type: "post",
      },
      include: [
        {
          model: Collection,
          required: true,
          as: "collection",
        },
      ],
    });
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
        text: `👋 Hey there! When documents are published or updated in the *${collection.name}* collection on Outline they will be posted to this channel!`,
        attachments: [
          {
            color: collection.color,
            title: collection.name,
            title_link: `${env.URL}${collection.url}`,
            text: collection.description,
          },
        ],
      }),
    });
  }

  async documentUpdated(event: DocumentEvent | RevisionEvent) {
    // never send notifications when batch importing documents
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'data' does not exist on type 'DocumentEv... Remove this comment to see the full error message
    if (event.data && event.data.source === "import") {
      return;
    }
    const [document, team] = await Promise.all([
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
    ]);
    if (!document || !team) {
      return;
    }

    // never send notifications for draft documents
    if (!document.publishedAt) {
      return;
    }

    const integration = await Integration.findOne({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: "slack",
        type: "post",
        events: {
          [Op.contains]: [
            event.name === "revisions.create" ? "documents.update" : event.name,
          ],
        },
      },
    });
    if (!integration) {
      return;
    }
    let text = `${document.updatedBy.name} updated a document`;

    if (event.name === "documents.publish") {
      text = `${document.createdBy.name} published a new document`;
    }

    await fetch(integration.settings.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        attachments: [
          presentSlackAttachment(document, document.collection, team),
        ],
      }),
    });
  }
}
