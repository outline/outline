import {
  ApiKey,
  GroupUser,
  Star,
  Subscription,
  UserAuthentication,
  UserMembership,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import { Event as TEvent, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserDeletedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.delete"];

  async perform(event: UserEvent) {
    await sequelize.transaction(async (transaction) => {
      await GroupUser.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
        hooks: false,
      });
      await UserAuthentication.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await UserMembership.destroy({
        where: {
          userId: event.userId,
        },
        transaction,
      });
      await Subscription.destroy({
        where: {
          userId: event.userId,
        },
        hooks: false,
        transaction,
      });
      await ApiKey.destroy({
        where: {
          userId: event.userId,
        },
        hooks: false,
        transaction,
      });
      await Star.destroy({
        where: {
          userId: event.userId,
        },
        hooks: false,
        transaction,
      });
    });
  }
}
