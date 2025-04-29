import { Op } from "sequelize";
import { GroupUser } from "@server/models";
import { DocumentGroupEvent, DocumentUserEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";
import DocumentAddUserNotificationsTask from "./DocumentAddUserNotificationsTask";

export default class DocumentAddGroupNotificationsTask extends BaseTask<DocumentGroupEvent> {
  public async perform(event: DocumentGroupEvent) {
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
          groupUsers.map(async (groupUser) => {
            await new DocumentAddUserNotificationsTask().schedule({
              ...event,
              name: "documents.add_user",
              modelId: event.data.membershipId,
              userId: groupUser.userId,
            } as DocumentUserEvent);
          })
        );
      }
    );
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
