import { GroupUser } from "@server/models";
import { DocumentGroupEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";
import DocumentAddUserNotificationsTask from "./DocumentAddUserNotificationsTask";

export default class DocumentAddGroupNotificationsTask extends BaseTask<DocumentGroupEvent> {
  public async perform(event: DocumentGroupEvent) {
    const groupUsers = await GroupUser.findAll({
      where: {
        groupId: event.modelId,
      },
    });

    for (const groupUser of groupUsers) {
      await DocumentAddUserNotificationsTask.schedule({
        ...event,
        userId: groupUser.userId,
      });
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
