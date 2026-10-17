import { differenceInMilliseconds } from "date-fns";
import { Op } from "sequelize";
import { IntegrationType } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { sleep } from "@shared/utils/timers";
import { ChatMessageHelper } from "@server/chat/ChatMessageHelper";
import { ChatService } from "@server/chat/ChatService";
import env from "@server/env";
import { Collection, Document, Integration } from "@server/models";
import ChatPostDocumentTask from "../tasks/ChatPostDocumentTask";
import type {
  DocumentEvent,
  Event,
  IntegrationEvent,
  RevisionEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

/**
 * Schedules posts of document changes to the chat channels that are connected
 * to a collection, on every registered chat platform.
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

    const eventName =
      event.name === "documents.publish"
        ? "documents.publish"
        : "documents.update";
    const integrations = await Integration.findAll({
      attributes: ["id"],
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: services,
        type: IntegrationType.Post,
        events: { [Op.contains]: [eventName] },
      },
    });

    await Promise.all(
      integrations.map((integration) =>
        new ChatPostDocumentTask().schedule({
          integrationId: integration.id,
          documentId: document.id,
          eventName,
        })
      )
    );
  }
}
