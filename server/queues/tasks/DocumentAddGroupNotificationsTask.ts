import { Op } from "sequelize";
import { GroupUser } from "@server/models";
import { DocumentGroupEvent } from "@server/types";
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
            await DocumentAddUserNotificationsTask.schedule({
              ...event,
              modelId: event.data.membershipId,
              userId: groupUser.userId,
            });
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
