import { IntegrationType } from "@shared/types";
import { ChatMessageHelper } from "@server/chat/ChatMessageHelper";
import { ChatService } from "@server/chat/ChatService";
import { Document, Integration, Team } from "@server/models";
import { BaseTask } from "./base/BaseTask";

interface Props {
  /** The post integration of the channel. */
  integrationId: string;
  /** The document that changed. */
  documentId: string;
  /** The change to post. */
  eventName: "documents.publish" | "documents.update";
}

/**
 * Posts a document change to one chat channel. Each channel has its own
 * task, so a failed post is retried without a second post to other channels.
 */
export default class ChatPostDocumentTask extends BaseTask<Props> {
  public async perform({ integrationId, documentId, eventName }: Props) {
    const integration = await Integration.findOne({
      where: { id: integrationId, type: IntegrationType.Post },
    });
    const provider = integration
      ? ChatService.getProvider(integration.service)
      : undefined;
    if (!integration || !provider) {
      return;
    }

    const document = await Document.findByPk(documentId);
    if (!document?.publishedAt) {
      return;
    }
    const team = await Team.findByPk(document.teamId, { rejectOnEmpty: true });

    const text =
      eventName === "documents.publish"
        ? `${document.createdBy.name} published "${document.displayTitle}"`
        : `${document.updatedBy.name} updated "${document.displayTitle}"`;

    await provider.postMessage(
      integration as Integration<IntegrationType.Post>,
      {
        text: ChatMessageHelper.escape(text),
        visibility: "conversation",
        cards: [
          ChatMessageHelper.documentCard(document, team, document.collection),
        ],
      }
    );
  }
}
