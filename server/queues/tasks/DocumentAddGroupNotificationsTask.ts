import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { GroupUser, UserMembership } from "@server/models";
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
            const userMembership = await UserMembership.findOne({
              where: {
                userId: groupUser.userId,
                documentId: event.documentId,
              },
            });
            if (userMembership) {
              Logger.debug(
                "task",
                `Suppressing notification for user ${groupUser.userId} as they are already a member of the document`,
                {
                  documentId: event.documentId,
                  userId: groupUser.userId,
                }
              );
              return;
            }

            await DocumentAddUserNotificationsTask.schedule({
              ...event,
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
