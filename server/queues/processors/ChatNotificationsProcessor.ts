import { differenceInMilliseconds } from "date-fns";
import { Op } from "sequelize";
import { IntegrationType } from "@shared/types";
import { toError } from "@shared/utils/error";
import { Minute } from "@shared/utils/time";
import { sleep } from "@shared/utils/timers";
import { ChatMessageHelper } from "@server/chat/ChatMessageHelper";
import { ChatService } from "@server/chat/ChatService";
import type { ChatMessage } from "@server/chat/types";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Collection, Document, Integration, Team } from "@server/models";
import type {
  DocumentEvent,
  Event,
  IntegrationEvent,
  RevisionEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

/**
 * Posts document changes to the chat channels that are connected to a
 * collection, on every registered chat platform.
 */
export default class ChatNotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "integrations.create",
  ];

  async perform(event: Event) {
    const services = ChatService.getProviders().map(
      (provider) => provider.service
    );
    if (!services.length) {
      return;
    }

    switch (event.name) {
      case "documents.publish":
      case "revisions.create":
        // wait a few seconds to give the document summary chance to be generated
        await sleep(5000);
        return this.documentUpdated(event, services);

      case "integrations.create":
        return this.integrationCreated(event, services);

      default:
    }
  }

  private async integrationCreated(
    event: IntegrationEvent,
    services: string[]
  ) {
    const integration = (await Integration.findOne({
      where: {
        id: event.modelId,
        service: services,
        type: IntegrationType.Post,
      },
      include: [
        {
          model: Collection,
          required: true,
          as: "collection",
        },
      ],
    })) as Integration<IntegrationType.Post> | null;
    const collection = integration?.collection;
    if (!integration || !collection) {
      return;
    }

    const provider = ChatService.getProvider(integration.service);
    if (!provider) {
      return;
    }

    await provider.postMessage(integration, {
      text: `👋 Hey there! When documents are published or updated in the **${ChatMessageHelper.escape(
        collection.name
      )}** collection on ${ChatMessageHelper.escape(
        env.APP_NAME
      )} they will be posted to this channel!`,
      visibility: "conversation",
      cards: [
        {
          title: collection.name,
          url: `${env.URL}${collection.path}`,
          text: collection.description ?? undefined,
          color: collection.color ?? undefined,
        },
      ],
    });
  }

  private async documentUpdated(
    event: DocumentEvent | RevisionEvent,
    services: string[]
  ) {
    // never send notifications when batch importing documents
    if (event.name === "documents.publish" && event.data?.source === "import") {
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

    // if the document was published less than a minute ago, don't send a
    // separate notification.
    if (
      event.name === "revisions.create" &&
      differenceInMilliseconds(document.updatedAt, document.publishedAt) <
        Minute.ms
    ) {
      return;
    }

    const integrations = (await Integration.findAll({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: services,
        type: IntegrationType.Post,
        events: {
          [Op.contains]: [
            event.name === "revisions.create" ? "documents.update" : event.name,
          ],
        },
      },
    })) as Integration<IntegrationType.Post>[];
    if (!integrations.length) {
      return;
    }

    const text =
      event.name === "documents.publish"
        ? `${document.createdBy.name} published "${document.displayTitle}"`
        : `${document.updatedBy.name} updated "${document.displayTitle}"`;
    const message: ChatMessage = {
      text: ChatMessageHelper.escape(text),
      visibility: "conversation",
      cards: [
        ChatMessageHelper.documentCard(document, team, document.collection),
      ],
    };

    const results = await Promise.allSettled(
      integrations.map(async (integration) => {
        const provider = ChatService.getProvider(integration.service);
        if (provider) {
          await provider.postMessage(integration, message);
        }
      })
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        Logger.error(
          "Failed to post chat notification",
          toError(result.reason),
          { integrationId: integrations[index].id }
        );
      }
    });
  }
}
