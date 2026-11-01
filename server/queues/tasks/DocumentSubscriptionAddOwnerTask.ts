import { subscribeUserToDocument } from "@server/commands/subscriptionCreator";
import { Document, User } from "@server/models";
import { can } from "@server/policies";
import type { DocumentOwnerEvent } from "@server/types";
import { BaseTask } from "./base/BaseTask";

/**
 * Subscribes a user to a document when they are made an owner of it.
 */
export default class DocumentSubscriptionAddOwnerTask extends BaseTask<DocumentOwnerEvent> {
  public async perform(event: DocumentOwnerEvent) {
    const user = await User.findByPk(event.userId);
    if (!user || user.isSuspended) {
      return;
    }

    const document = await Document.findByPk(event.documentId, {
      userId: user.id,
    });
    if (
      !document?.ownerIds?.includes(user.id) ||
      !can(user, "read", document)
    ) {
      return;
    }

    await subscribeUserToDocument(user, document, event);
  }
}
