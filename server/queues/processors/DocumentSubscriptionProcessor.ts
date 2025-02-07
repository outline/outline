import { Op } from "sequelize";
import { GroupUser } from "@server/models";
import { DocumentGroupEvent, DocumentUserEvent, Event } from "@server/types";
import DocumentSubscriptionTask from "../tasks/DocumentSubscriptionTask";
import BaseProcessor from "./BaseProcessor";

export default class DocumentSubscriptionProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.add_user",
    "documents.remove_user",
    "documents.add_group",
    "documents.remove_group",
  ];

  async perform(event: DocumentUserEvent | DocumentGroupEvent) {
    switch (event.name) {
      case "documents.add_user":
      case "documents.remove_user": {
        await DocumentSubscriptionTask.schedule(event);
        return;
      }

      case "documents.add_group":
      case "documents.remove_group":
        return this.handleGroup(event);

      default:
    }
  }

  private async handleGroup(event: DocumentGroupEvent) {
    const userEventName: DocumentUserEvent["name"] =
      event.name === "documents.add_group"
        ? "documents.add_user"
        : "documents.remove_user";

    await GroupUser.findAllInBatches<GroupUser>(
      {
        where: {
          groupId: event.modelId,
          userId: {
            [Op.ne]: event.actorId,
          },
        },
        batchLimit: 10,
      },
      async (groupUsers) => {
        await Promise.all(
          groupUsers.map((groupUser) =>
            DocumentSubscriptionTask.schedule({
              ...event,
              name: userEventName,
              userId: groupUser.userId,
            })
          )
        );
      }
    );
  }
}
