import {
  ApiKey,
  GroupUser,
  Star,
  Subscription,
  UserAuthentication,
  UserPermission,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import { Event as TEvent, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UsersDeletedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.delete"];

  async perform(event: UserEvent) {
    await sequelize.transaction(async (transaction) => {
      await GroupUser.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await UserAuthentication.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await UserPermission.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await Subscription.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await ApiKey.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await Star.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
    });
  }
}
