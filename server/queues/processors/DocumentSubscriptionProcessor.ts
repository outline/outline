import { GroupUser } from "@server/models";
import {
  CollectionGroupEvent,
  CollectionUserEvent,
  DocumentGroupEvent,
  DocumentUserEvent,
  Event,
} from "@server/types";
import CollectionSubscriptionRemoveUserTask from "../tasks/CollectionSubscriptionRemoveUserTask";
import DocumentSubscriptionRemoveUserTask from "../tasks/DocumentSubscriptionRemoveUserTask";
import BaseProcessor from "./BaseProcessor";

type ReceivedEvent =
  | CollectionUserEvent
  | CollectionGroupEvent
  | DocumentUserEvent
  | DocumentGroupEvent;

export default class DocumentSubscriptionProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "collections.remove_user",
    "collections.remove_group",
    "documents.remove_user",
    "documents.remove_group",
  ];

  async perform(event: ReceivedEvent) {
    switch (event.name) {
      case "collections.remove_user": {
        await new CollectionSubscriptionRemoveUserTask().schedule(event);
        return;
      }

      case "collections.remove_group":
        return this.handleRemoveGroupFromCollection(event);

      case "documents.remove_user": {
        await new DocumentSubscriptionRemoveUserTask().schedule(event);
        return;
      }

      case "documents.remove_group":
        return this.handleRemoveGroupFromDocument(event);

      default:
    }
  }

  private async handleRemoveGroupFromCollection(event: CollectionGroupEvent) {
    await GroupUser.findAllInBatches<GroupUser>(
      {
        where: {
          groupId: event.modelId,
        },
        batchLimit: 10,
      },
      async (groupUsers) => {
        await Promise.all(
          groupUsers.map((groupUser) =>
            new CollectionSubscriptionRemoveUserTask().schedule({
              ...event,
              name: "collections.remove_user",
              userId: groupUser.userId,
            } as CollectionUserEvent)
          )
        );
      }
    );
  }

  private async handleRemoveGroupFromDocument(event: DocumentGroupEvent) {
    await GroupUser.findAllInBatches<GroupUser>(
      {
        where: {
          groupId: event.modelId,
        },
        batchLimit: 10,
      },
      async (groupUsers) => {
        await Promise.all(
          groupUsers.map((groupUser) =>
            new DocumentSubscriptionRemoveUserTask().schedule({
              ...event,
              name: "documents.remove_user",
              userId: groupUser.userId,
            } as DocumentUserEvent)
          )
        );
      }
    );
  }
}
