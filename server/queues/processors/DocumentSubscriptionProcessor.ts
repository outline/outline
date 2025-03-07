import { Op } from "sequelize";
import { GroupUser } from "@server/models";
import { DocumentGroupEvent, DocumentUserEvent, Event } from "@server/types";
import DocumentSubscriptionTask from "../tasks/DocumentSubscriptionTask";
import BaseProcessor from "./BaseProcessor";

export default class DocumentSubscriptionProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.remove_user",
    "documents.remove_group",
  ];

  async perform(event: DocumentUserEvent | DocumentGroupEvent) {
    switch (event.name) {
      case "documents.remove_user": {
        await DocumentSubscriptionTask.schedule(event);
        return;
      }

      case "documents.remove_group":
        return this.handleGroup(event);

      default:
    }
  }

  private async handleGroup(event: DocumentGroupEvent) {
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
              name: "documents.remove_user",
              userId: groupUser.userId,
            })
          )
        );
      }
    );
  }
}
